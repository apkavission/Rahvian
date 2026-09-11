"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getStaffSession } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { cleanLetterHtml } from "@/lib/letter-html";
import { LAYOUTS } from "@/lib/letterhead";
import { readFields } from "@/lib/letterhead-fields";
import type { Json } from "@/types/database";
import { letterFieldErrors as fieldErrors, type LetterState } from "@/lib/letter-state";

/**
 * Saving the stationery, and the letters written on it.
 *
 * ---------------------------------------------------------------------------
 * **Three checks stand between a form post and a write**, the same three as
 * every other action here: the session says who is asking, because a Server
 * Action is an HTTP endpoint and being unable to reach the screen does not stop
 * anybody posting to it; the menu check matches what they were shown; and RLS
 * refuses the write at the database from `is_staff()` regardless of both. The
 * last is the only one a mistake in this file cannot bypass.
 *
 * ---------------------------------------------------------------------------
 * **The body is cleaned here and not only in the editor.** The editor cleans
 * paste so that what is on screen is what gets stored, which is a courtesy to
 * whoever is typing. This is the boundary: a post that never went through the
 * editor — a replayed request, a script — writes into the same column. Cleaning
 * in one of the two places is cleaning in neither.
 */

const ok = (message: string): LetterState => ({ status: "success", message });
const no = (message: string): LetterState => ({ status: "error", message });

const LAYOUT_KEYS = LAYOUTS.map((layout) => layout.key) as [string, ...string[]];

/**
 * Signed in and on the staff list.
 *
 * The menu is checked on the screen by `requireMenu("letterhead")`; RLS checks
 * `is_staff()` at the table. This is the middle layer — it exists so a post to
 * this endpoint from somebody with no session gets a sentence rather than a
 * database error.
 */
async function guard(): Promise<{ id: string } | null> {
  const session = await getStaffSession();
  if (!session) return null;
  return { id: session.userId };
}

/* ========================================================= the stationery == */

const stationerySchema = z.object({
  layout: z.enum(LAYOUT_KEYS),
  accent: z
    .string()
    .trim()
    .regex(/^#[0-9a-fA-F]{6}$/, "That is not a colour."),
  /* The slider's bounds, repeated here because a form post is not a slider. */
  logo_scale: z.coerce.number().int().min(40).max(220),
  footer_note: z.string().trim().max(200, "One short line.").optional(),
  /*
    The blocks arrive as one JSON string.

    An ordered list cannot be posted as separate form fields without inventing
    index names — `field_3_label` — which break the moment a row is removed
    from the middle. One JSON field keeps the order the list is in, and
    `readFields()` is what refuses a shape that is not one.
  */
  fields: z.string().max(40_000, "Too many blocks."),
});

export async function saveStationery(
  _previous: LetterState,
  formData: FormData,
): Promise<LetterState> {
  if (!(await guard())) return no("Your session has expired. Sign in again.");

  const parsed = stationerySchema.safeParse({
    layout: formData.get("layout"),
    accent: formData.get("accent"),
    logo_scale: formData.get("logo_scale"),
    footer_note: formData.get("footer_note") || undefined,
    fields: formData.get("fields") ?? "[]",
  });

  if (!parsed.success) {
    return { status: "error", message: "Have a look below.", fieldErrors: fieldErrors(parsed.error.issues) };
  }

  /*
    Parsed and then read through `readFields()`, which is the same function the
    page renders from. So what is stored is exactly what can be drawn: an entry
    naming a source this build does not have is dropped here rather than
    written and silently ignored for ever.
  */
  let fields;
  try {
    fields = readFields(JSON.parse(parsed.data.fields));
  } catch {
    return no("The blocks could not be read. Reload the screen and try again.");
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from("letterhead_settings")
    .update({
      layout: parsed.data.layout,
      accent: parsed.data.accent,
      logo_scale: parsed.data.logo_scale,
      footer_note: parsed.data.footer_note ?? "",
      /*
        Cast because the generated type for a `jsonb` column is `Json`, and an
        interface with named properties is not one — `Json` wants an index
        signature. The shape is guaranteed by `readFields()` on the line above
        and read back through the same function, which is a stronger guarantee
        than the structural one this cast sets aside.
      */
      fields: fields as unknown as Json,
    })
    .eq("id", 1);

  if (error) return no(error.message);

  revalidatePath("/admin/letterhead", "layout");
  return ok("Saved. Every letter uses it from now on.");
}

/* ============================================================== a letter == */

const letterSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().trim().min(2, "Give it a name you will recognise.").max(160),
  recipient: z.string().trim().max(400).optional(),
  reference: z.string().trim().max(80).optional(),
  /* An empty date input posts "". Coerced to null rather than rejected: a
     draft is often written before the date it will carry. */
  letter_date: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "That is not a date.")
    .optional(),
  subject: z.string().trim().max(200).optional(),
  salutation: z.string().trim().max(120).optional(),
  body_html: z.string().max(200_000, "That is longer than a letter.").optional(),
  signatory_name: z.string().trim().max(120).optional(),
  signatory_role: z.string().trim().max(160).optional(),
  /* Empty means "use the company's letterhead", which is stored as null. */
  layout: z.enum(LAYOUT_KEYS).optional(),
  status: z.enum(["draft", "final"]),
});

export async function saveLetter(
  _previous: LetterState,
  formData: FormData,
): Promise<LetterState> {
  const session = await guard();
  if (!session) return no("Your session has expired. Sign in again.");

  const parsed = letterSchema.safeParse({
    id: formData.get("id") || undefined,
    title: formData.get("title"),
    recipient: formData.get("recipient") || undefined,
    reference: formData.get("reference") || undefined,
    letter_date: formData.get("letter_date") || undefined,
    subject: formData.get("subject") || undefined,
    salutation: formData.get("salutation") || undefined,
    body_html: formData.get("body_html") || undefined,
    signatory_name: formData.get("signatory_name") || undefined,
    signatory_role: formData.get("signatory_role") || undefined,
    layout: formData.get("layout") || undefined,
    status: formData.get("status") || "draft",
  });

  if (!parsed.success) {
    return { status: "error", message: "Have a look below.", fieldErrors: fieldErrors(parsed.error.issues) };
  }

  const d = parsed.data;
  const supabase = await createClient();

  const row = {
    title: d.title,
    recipient: d.recipient ?? "",
    reference: d.reference ?? "",
    letter_date: d.letter_date ?? null,
    subject: d.subject ?? "",
    salutation: d.salutation ?? "",
    /* The boundary. See the note at the top of this file. */
    body_html: cleanLetterHtml(d.body_html ?? ""),
    signatory_name: d.signatory_name ?? "",
    signatory_role: d.signatory_role ?? "",
    layout: d.layout ?? null,
    status: d.status,
  };

  if (d.id) {
    const { error } = await supabase.from("letters").update(row).eq("id", d.id);
    if (error) return no(error.message);

    revalidatePath("/admin/letterhead", "layout");
    return ok("Saved.");
  }

  const { data: created, error } = await supabase
    .from("letters")
    .insert({ ...row, created_by: session.id })
    .select("id")
    .single();

  if (error || !created) return no(error?.message ?? "The letter could not be created.");

  revalidatePath("/admin/letterhead", "layout");
  /* Straight to the letter, because a new letter is one somebody is about to
     write rather than one they wanted to add to a list. */
  redirect(`/admin/letterhead/${created.id}`);
}

/** A blank letter, so "New letter" lands somewhere that can be written on. */
export async function createLetter(): Promise<void> {
  const session = await guard();
  if (!session) redirect("/admin/login");

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("letters")
    .insert({
      title: "Untitled letter",
      /* Today, because a letter written today is dated today far more often
         than not — and a wrong date somebody has to notice is worse than one
         they have to change. */
      letter_date: new Date().toISOString().slice(0, 10),
      salutation: "Dear Sir / Madam,",
      created_by: session!.id,
    })
    .select("id")
    .single();

  if (error || !data) throw new Error(error?.message ?? "Could not create the letter.");

  revalidatePath("/admin/letterhead", "layout");
  redirect(`/admin/letterhead/${data.id}`);
}

export async function deleteLetter(formData: FormData): Promise<void> {
  if (!(await guard())) redirect("/admin/login");

  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const supabase = await createClient();
  const { error } = await supabase.from("letters").delete().eq("id", id);

  if (error) throw new Error(error.message);

  revalidatePath("/admin/letterhead", "layout");
  redirect("/admin/letterhead");
}
