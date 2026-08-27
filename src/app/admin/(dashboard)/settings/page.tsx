import type { Metadata } from "next";
import { requireMenu } from "@/lib/auth/session";
import { getMediaOptions } from "@/lib/queries/media-admin";
import { createClient } from "@/lib/supabase/server";
import { SettingsForm, type SettingsFormValues } from "./settings-form";

export const metadata: Metadata = {
  title: "Settings",
  robots: { index: false, follow: false, nocache: true },
};

/**
 * Site settings.
 *
 * Read through the session client rather than the cached public query. The
 * cached one is shared across every visitor and cleared only on write — an
 * owner who has just saved would be shown the version from before their edit,
 * which reads as the save having failed.
 */
export default async function SettingsPage() {
  // Owners have this by default and anyone can be granted it. Reaching it
  // without it gets the same answer as a route that does not exist, rather
  // than a form that will refuse to save at the end of filling it in.
  await requireMenu("settings");

  const supabase = await createClient();

  const [{ data: settings, error }, assets] = await Promise.all([
    supabase.from("site_settings").select("*").eq("id", 1).maybeSingle(),
    getMediaOptions(),
  ]);

  if (error || !settings) {
    // The row is created by the migration and a check constraint makes a
    // second one impossible, so this means the read itself failed.
    throw new Error("Could not load site settings.");
  }

  return (
    <div className="mx-auto w-full max-w-5xl">
      <header>
        <h1 className="font-display text-2xl font-semibold">Settings</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-text-muted">
          The contact details, identifiers and social links the whole site reads
          from. Saving clears the caches, so the public pages show the change
          within seconds — there is no deploy in between.
        </p>
      </header>

      <div className="mt-10">
        {/*
          Keyed on the row's own timestamp, so a save remounts the form.

          The fields are uncontrolled, and React resets an uncontrolled field
          when its form action completes — to the `defaultValue` of the render
          it was mounted with, which is the state *before* the save. Remounting
          on `updated_at` is what makes the screen agree with the database.
        */}
        <SettingsForm
          key={settings.updated_at}
          values={toFormValues(settings)}
          assets={assets}
        />
      </div>
    </div>
  );
}

/**
 * The row as the form wants it.
 *
 * Nulls become empty strings because an uncontrolled input with a `null`
 * default is a React warning and an input that will not accept typing. The
 * empty strings become nulls again in the action, so a cleared field is stored
 * as absent rather than as a blank that renders an empty line on the site.
 */
function toFormValues(row: {
  updated_at: string;
  company_name: string;
  legal_name: string;
  tagline: string;
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  country: string;
  cin: string | null;
  gst: string | null;
  logo_light_id: string | null;
  logo_dark_id: string | null;
  social: unknown;
}): SettingsFormValues {
  return {
    company_name: row.company_name,
    legal_name: row.legal_name,
    tagline: row.tagline,
    logo_light_id: row.logo_light_id ?? "",
    logo_dark_id: row.logo_dark_id ?? "",
    email: row.email ?? "",
    phone: row.phone ?? "",
    whatsapp: row.whatsapp ?? "",
    address_line1: row.address_line1 ?? "",
    address_line2: row.address_line2 ?? "",
    city: row.city ?? "",
    state: row.state ?? "",
    postal_code: row.postal_code ?? "",
    country: row.country,
    cin: row.cin ?? "",
    gst: row.gst ?? "",
    social: readSocial(row.social),
  };
}

/** `social` is jsonb and legitimately anything; non-string values are dropped. */
function readSocial(value: unknown): Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};

  const out: Record<string, string> = {};
  for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
    if (typeof entry === "string" && entry.trim()) out[key] = entry;
  }
  return out;
}
