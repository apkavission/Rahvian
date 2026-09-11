import "server-only";

import { createClient } from "@/lib/supabase/server";
import { SITE_URL } from "@/lib/env";
import { getSiteSettings } from "@/lib/queries/site-settings";
import { getBrandLogos } from "@/lib/queries/brand";
import { addressFrom, isLayoutKey, type LayoutKey, type LetterheadCompany } from "@/lib/letterhead";
import type { Tables } from "@/types/database";

/**
 * The letterhead, and the letters written on it.
 *
 * ---------------------------------------------------------------------------
 * **Read through the session client, never the cached public query.**
 *
 * `getSiteSettings()` is `unstable_cache`d and shared across every visitor,
 * which is right for the website and wrong here twice over: an owner who has
 * just corrected the CIN would be shown the old one and conclude the save
 * failed, and a letter is not public data. The company details still come from
 * the cached read — they are the same row the footer renders and the cache is
 * cleared on save — but everything in `letters` is read with the caller's own
 * session so row security applies to it.
 */

export type LetterheadSettings = Tables<"letterhead_settings">;
export type Letter = Tables<"letters">;

/**
 * The company as the page needs it, assembled from the row the website uses.
 *
 * This is the whole argument for generating a letterhead rather than keeping
 * one in a Word file: there is no second copy of the address to go stale.
 */
export async function getLetterheadCompany(): Promise<LetterheadCompany> {
  /* The logo comes from the same place the site header gets it, so uploading
     a new one in Settings changes the letterhead with no second upload. */
  const [settings, logos] = await Promise.all([getSiteSettings(), getBrandLogos()]);

  return {
    companyName: settings?.company_name ?? "Rahvian",
    legalName: settings?.legal_name ?? "",
    tagline: settings?.tagline ?? "",
    email: settings?.email ?? "",
    phone: settings?.phone ?? "",
    /*
      From the environment, not from a column, because there is no column.

      `site_settings` has never held the site's own address — every other
      caller reads `SITE_URL`, and a second copy of it in the database would be
      one more thing to disagree with the deployment. Printed without the
      scheme, the way it is written on paper.
    */
    website: SITE_URL.replace(/^https?:\/\//, "").replace(/\/$/, ""),
    addressLines: addressFrom({
      line1: settings?.address_line1,
      line2: settings?.address_line2,
      city: settings?.city,
      state: settings?.state,
      postalCode: settings?.postal_code,
      country: settings?.country,
    }),
    whatsapp: settings?.whatsapp ?? "",
    workingHours: summariseHours(settings?.working_hours),
    cin: settings?.cin ?? "",
    gst: settings?.gst ?? "",
    socials: readSocials(settings?.social),
    logo: { light: logos.light?.url ?? null, dark: logos.dark?.url ?? null },
  };
}

/**
 * Seven days of opening hours, as the one line a letterhead has room for.
 *
 * `working_hours` is an array of a day, an opening, a closing and a closed
 * flag — the shape the website's footer needs. A letterhead has one line, so
 * consecutive days that keep the same hours are collapsed into a range:
 * "Mon–Fri 10:00–19:00, Sat 10:00–16:00". Printing seven lines instead is how
 * a header ends up taller than the letter.
 */
function summariseHours(value: unknown): string {
  if (!Array.isArray(value)) return "";

  const SHORT: Record<string, string> = {
    monday: "Mon",
    tuesday: "Tue",
    wednesday: "Wed",
    thursday: "Thu",
    friday: "Fri",
    saturday: "Sat",
    sunday: "Sun",
  };

  const days = value
    .filter((entry): entry is Record<string, unknown> => Boolean(entry) && typeof entry === "object")
    .map((entry) => ({
      day: SHORT[String(entry.day ?? "").toLowerCase()] ?? "",
      hours:
        entry.closed === true || !entry.open || !entry.close
          ? "closed"
          : `${entry.open}–${entry.close}`,
    }))
    .filter((entry) => entry.day !== "");

  if (days.length === 0) return "";

  /* Consecutive days with identical hours become one range. */
  const runs: { from: string; to: string; hours: string }[] = [];

  for (const day of days) {
    const last = runs[runs.length - 1];
    if (last && last.hours === day.hours) last.to = day.day;
    else runs.push({ from: day.day, to: day.day, hours: day.hours });
  }

  return runs
    /* A day the company is shut is not worth a letterhead's ink. */
    .filter((run) => run.hours !== "closed")
    .map((run) => `${run.from === run.to ? run.from : `${run.from}–${run.to}`} ${run.hours}`)
    .join(", ");
}

/**
 * The social profiles, as label-and-value pairs.
 *
 * `social` is `{ linkedin: "…", instagram: "…" }` with whatever keys have been
 * filled in, so the labels are derived from the keys rather than listed here —
 * a new network added in Settings appears on the letterhead without a change
 * in this file.
 */
function readSocials(value: unknown): { label: string; value: string }[] {
  if (!value || typeof value !== "object" || Array.isArray(value)) return [];

  return Object.entries(value as Record<string, unknown>)
    .filter(([, entry]) => typeof entry === "string" && entry.trim() !== "")
    .map(([key, entry]) => ({
      label: key.charAt(0).toUpperCase() + key.slice(1),
      value: String(entry).replace(/^https?:\/\//, ""),
    }));
}

/**
 * The stationery.
 *
 * The row is created by the migration and a check constraint makes a second
 * one impossible, so a miss here means the read failed rather than that the
 * company has no letterhead — and the fallback is a working classic layout, on
 * the standing rule that a dynamic thing degrades to a plain one.
 */
export async function getLetterheadSettings(): Promise<LetterheadSettings | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("letterhead_settings")
    .select("*")
    .eq("id", 1)
    .maybeSingle();

  if (error) {
    console.error("[letterhead] settings read failed:", error.message);
    return null;
  }

  return data;
}

/** The layout a letter should be drawn in: its own, or the company's. */
export function layoutFor(
  letter: Pick<Letter, "layout"> | null,
  settings: LetterheadSettings | null,
): LayoutKey {
  if (letter && isLayoutKey(letter.layout)) return letter.layout;
  if (settings && isLayoutKey(settings.layout)) return settings.layout;
  return "classic";
}

/** Every letter, newest worked-on first — which is the order they are wanted. */
export async function listLetters(): Promise<Letter[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("letters")
    .select("*")
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("[letterhead] list failed:", error.message);
    return [];
  }

  return data ?? [];
}

export async function getLetter(id: string): Promise<Letter | null> {
  const supabase = await createClient();

  const { data, error } = await supabase.from("letters").select("*").eq("id", id).maybeSingle();

  if (error) {
    console.error("[letterhead] letter read failed:", error.message);
    return null;
  }

  return data;
}
