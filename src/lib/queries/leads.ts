import "server-only";

import { canReach } from "@/lib/auth/menu";
import { roleByKey } from "@/lib/auth/roles";
import { getRoles } from "@/lib/queries/roles";
import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/database";
import type { LeadFilters, LeadStatus } from "@/lib/validation/leads";

export type Lead = Tables<"leads">;

/** How many rows a page of the list holds. */
export const LEADS_PER_PAGE = 25;

export interface LeadListRow {
  id: string;
  name: string;
  company_name: string | null;
  email: string;
  phone: string | null;
  status: LeadStatus;
  assigned_to: string | null;
  created_at: string;
  archived_at: string | null;
  is_spam: boolean;
  service: { name: string } | null;
}

export interface LeadListResult {
  rows: LeadListRow[];
  total: number;
  page: number;
  pageCount: number;
}

export interface StaffOption {
  id: string;
  name: string;
}

export interface LeadNote {
  id: string;
  body: string;
  created_at: string;
  author: { full_name: string } | null;
}

export interface LeadActivityRow {
  id: string;
  action: string;
  from_value: string | null;
  to_value: string | null;
  created_at: string;
  actor: { full_name: string } | null;
}

export interface LeadDetail extends Lead {
  service: { name: string; slug: string } | null;
  assignee: { full_name: string } | null;
  notes: LeadNote[];
  activity: LeadActivityRow[];
}

const LIST_COLUMNS = `
  id, name, company_name, email, phone, status, assigned_to, created_at,
  archived_at, is_spam,
  service:services(name)
`;

/**
 * A page of leads.
 *
 * Uncached, like everything else in the admin: this is the screen someone
 * refreshes to see whether an enquiry has arrived.
 *
 * Archived and spam rows are excluded unless the view explicitly asks for
 * them. That is not the same as deleting: nothing here removes a row, and the
 * `archived` and `spam` views are how you get back to one.
 */
export async function getLeads(filters: LeadFilters): Promise<LeadListResult> {
  const supabase = await createClient();
  const page = Math.max(1, filters.page ?? 1);
  const from = (page - 1) * LEADS_PER_PAGE;

  let query = supabase
    .from("leads")
    .select(LIST_COLUMNS, { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, from + LEADS_PER_PAGE - 1);

  if (filters.view === "archived") {
    query = query.not("archived_at", "is", null);
  } else if (filters.view === "spam") {
    query = query.eq("is_spam", true).is("archived_at", null);
  } else {
    query = query.is("archived_at", null).eq("is_spam", false);
  }

  if (filters.status) query = query.eq("status", filters.status);

  if (filters.assigned === "unassigned") {
    query = query.is("assigned_to", null);
  } else if (filters.assigned) {
    query = query.eq("assigned_to", filters.assigned);
  }

  /*
    Search across the four fields someone actually remembers a lead by.

    `or` with `ilike` rather than the trigram index the schema defines: that
    index is on a concatenated expression, which PostgREST cannot address, and
    at launch volume a sequential scan over a few thousand rows is instant. If
    this ever becomes slow, the fix is a generated column plus an RPC — not a
    different filter here.

    Commas and parentheses would break out of the `or` expression, so they are
    stripped rather than escaped. A search string is not worth a syntax risk.
  */
  if (filters.q) {
    const term = filters.q.replace(/[,()]/g, " ").trim();
    if (term) {
      const like = `%${term}%`;
      query = query.or(
        `name.ilike.${like},company_name.ilike.${like},email.ilike.${like},phone.ilike.${like}`,
      );
    }
  }

  const { data, error, count } = await query;

  if (error) {
    console.error("[leads] list failed:", error.message);
    return { rows: [], total: 0, page: 1, pageCount: 1 };
  }

  const total = count ?? 0;

  return {
    rows: (data ?? []) as unknown as LeadListRow[],
    total,
    page,
    pageCount: Math.max(1, Math.ceil(total / LEADS_PER_PAGE)),
  };
}

/**
 * One lead, with its notes and its audit trail.
 *
 * Three round trips rather than one embedded select. The embed would work, but
 * notes and activity each need their own ordering, and PostgREST cannot order
 * two embedded resources independently in one request.
 */
export async function getLead(id: string): Promise<LeadDetail | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("leads")
    .select(
      `*, service:services(name, slug),
       assignee:profiles!leads_assigned_to_fkey(full_name)`,
    )
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error(`[leads] read failed for ${id}:`, error.message);
    return null;
  }
  if (!data) return null;

  const [notes, activity] = await Promise.all([
    supabase
      .from("lead_notes")
      .select("id, body, created_at, author:profiles(full_name)")
      .eq("lead_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("lead_activity")
      .select("id, action, from_value, to_value, created_at, actor:profiles(full_name)")
      .eq("lead_id", id)
      .order("created_at", { ascending: false }),
  ]);

  return {
    ...data,
    notes: (notes.data ?? []) as unknown as LeadNote[],
    activity: (activity.data ?? []) as unknown as LeadActivityRow[],
  } as LeadDetail;
}

/**
 * Who a lead can be assigned to.
 *
 * Everyone whose resolved menu includes the enquiries screen, which is exactly
 * the set `company.can_manage_leads()` will let through at the table. Not a
 * list of role names: roles are master data, and an editor who has been granted
 * enquiries on their own account is a real answer to this question — offering
 * only the built-in roles would leave them out of the list while the database
 * happily let them read the rows.
 *
 * The same resolver the sidebar and the route guards use, so an assignment can
 * never be offered to somebody who would then open a page that does not exist
 * for them.
 */
export async function getAssignableStaff(): Promise<StaffOption[]> {
  const supabase = await createClient();

  const [{ data, error }, roles] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name, role, menu_extra, menu_denied, app_access")
      .eq("is_active", true)
      .order("full_name", { ascending: true }),
    getRoles(),
  ]);

  if (error) {
    console.error("[leads] staff list failed:", error.message);
    return [];
  }

  return (data ?? [])
    .filter((row) => (row.app_access ?? []).includes("company"))
    .filter((row) => canReach(row, roleByKey(roles, row.role), "leads"))
    .map((row) => ({
      id: row.id,
      name: row.full_name || "Unnamed account",
    }));
}

/** Counts for the view tabs, so a tab can say how much is behind it. */
export async function getLeadViewCounts(): Promise<{
  open: number;
  archived: number;
  spam: number;
}> {
  const supabase = await createClient();

  const [open, archived, spam] = await Promise.all([
    supabase
      .from("leads")
      .select("id", { count: "exact", head: true })
      .is("archived_at", null)
      .eq("is_spam", false),
    supabase
      .from("leads")
      .select("id", { count: "exact", head: true })
      .not("archived_at", "is", null),
    supabase
      .from("leads")
      .select("id", { count: "exact", head: true })
      .eq("is_spam", true)
      .is("archived_at", null),
  ]);

  return {
    open: open.count ?? 0,
    archived: archived.count ?? 0,
    spam: spam.count ?? 0,
  };
}
