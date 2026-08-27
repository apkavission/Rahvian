import { NextResponse, type NextRequest } from "next/server";
import { canManageLeads, getStaffSession } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { isLeadStatus, LEAD_STATUS_LABEL } from "@/lib/validation/leads";

/**
 * The current view, as a CSV.
 *
 * A route handler rather than a Server Action because the result is a file:
 * an action returns a value to React, and there is no way to hand the browser
 * a download from one without building a blob in the client and losing the
 * filename, the encoding and the ability to open it in a new tab.
 *
 * It repeats the list's filters rather than exporting everything. An export
 * button that quietly ignores the filters above it produces a file that does
 * not match the screen it was pressed on, and nobody notices until they act on
 * the wrong rows.
 *
 * `export` is a static segment, so it is matched before `[id]` — and a lead id
 * is a uuid, which can never collide with it.
 */
export async function GET(request: NextRequest) {
  const session = await getStaffSession();

  // A route handler is reachable directly, so it authorises for itself rather
  // than trusting that the layout would have turned this request away.
  if (!session || !canManageLeads(session)) {
    return new NextResponse("Not found", { status: 404 });
  }

  const params = request.nextUrl.searchParams;
  const view = params.get("view") ?? "open";
  const status = params.get("status");
  const assigned = params.get("assigned");
  const q = params.get("q");

  const supabase = await createClient();

  let query = supabase
    .from("leads")
    .select(
      `created_at, name, company_name, email, phone, whatsapp, status,
       budget_range, timeline, preferred_contact, existing_website,
       source_page, description, consent_given,
       service:services(name), assignee:profiles!leads_assigned_to_fkey(full_name)`,
    )
    .order("created_at", { ascending: false })
    // A hard ceiling. An export is a convenience, not a backup, and an
    // unbounded one is how a browser tab is lost to a 200MB response.
    .limit(5000);

  if (view === "archived") {
    query = query.not("archived_at", "is", null);
  } else if (view === "spam") {
    query = query.eq("is_spam", true).is("archived_at", null);
  } else {
    query = query.is("archived_at", null).eq("is_spam", false);
  }

  if (isLeadStatus(status)) query = query.eq("status", status);

  if (assigned === "unassigned") {
    query = query.is("assigned_to", null);
  } else if (assigned) {
    query = query.eq("assigned_to", assigned);
  }

  if (q) {
    const term = q.replace(/[,()]/g, " ").trim();
    if (term) {
      const like = `%${term}%`;
      query = query.or(
        `name.ilike.${like},company_name.ilike.${like},email.ilike.${like},phone.ilike.${like}`,
      );
    }
  }

  const { data, error } = await query;

  if (error) {
    console.error("[leads] export failed:", error.message);
    return new NextResponse("Could not build the export.", { status: 500 });
  }

  const header = [
    "Received",
    "Name",
    "Company",
    "Email",
    "Phone",
    "WhatsApp",
    "Service",
    "Status",
    "Assigned to",
    "Budget",
    "Timeline",
    "Preferred contact",
    "Existing website",
    "Submitted from",
    "Consent given",
    "Message",
  ];

  const rows = (data ?? []).map((lead) => {
    const row = lead as unknown as {
      created_at: string;
      name: string;
      company_name: string | null;
      email: string;
      phone: string | null;
      whatsapp: string | null;
      status: string;
      budget_range: string | null;
      timeline: string | null;
      preferred_contact: string | null;
      existing_website: string | null;
      source_page: string | null;
      description: string;
      consent_given: boolean;
      service: { name: string } | null;
      assignee: { full_name: string } | null;
    };

    return [
      row.created_at,
      row.name,
      row.company_name,
      row.email,
      row.phone,
      row.whatsapp,
      row.service?.name ?? null,
      isLeadStatus(row.status) ? LEAD_STATUS_LABEL[row.status] : row.status,
      row.assignee?.full_name ?? null,
      row.budget_range,
      row.timeline,
      row.preferred_contact,
      row.existing_website,
      row.source_page,
      row.consent_given ? "Yes" : "No",
      row.description,
    ];
  });

  const csv = [header, ...rows].map((row) => row.map(cell).join(",")).join("\r\n");

  /*
    A byte order mark, deliberately.

    Excel on Windows reads a UTF-8 CSV as the system code page unless the file
    starts with one, which turns a rupee sign and every accented name into
    mojibake. This file will be opened in Excel more often than anywhere else.
  */
  const body = `﻿${csv}`;

  const stamp = new Date().toISOString().slice(0, 10);

  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="enquiries-${view}-${stamp}.csv"`,
      // Never stored by a proxy: this is one account's commercial data.
      "Cache-Control": "no-store, private",
    },
  });
}

/**
 * One CSV cell.
 *
 * Quoted whenever it could otherwise change the shape of the row, with inner
 * quotes doubled per RFC 4180.
 *
 * The leading apostrophe is a formula-injection guard: a cell beginning `=`,
 * `+`, `-` or `@` is executed as a formula when the file is opened, and a
 * `name` field is attacker-controlled — someone can put `=HYPERLINK(...)` in a
 * public contact form and have it run on the machine of whoever opens the
 * export.
 */
function cell(value: unknown): string {
  if (value === null || value === undefined) return "";

  let text = String(value).replace(/\r?\n/g, " ").trim();
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;

  return `"${text.replace(/"/g, '""')}"`;
}
