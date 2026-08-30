import type { Metadata } from "next";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { requireMenu } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { SeoForm, type SeoFormValues } from "./seo-form";

export const metadata: Metadata = {
  title: "SEO",
  robots: { index: false, follow: false, nocache: true },
};

/**
 * The SEO screen.
 *
 * One row, `seo_defaults`, and the same single-column shape the settings
 * screen uses — this is configuration, not a list of records, and the
 * three-column list shape would be three columns with nothing in two of them.
 *
 * Read through the session client rather than the cached public query. The
 * cached one is shared across every visitor and cleared only on write, so
 * somebody who has just saved would be shown the version from before their
 * edit, which reads as the save having failed.
 *
 * Four columns of this row are deliberately not on the form: `ga_measurement_id`,
 * `gsc_property` and `default_og_image_id` are read by nothing on the site, and
 * a form that collected them would be a form whose values never reach a page —
 * the worst kind of field, because it looks like it worked. They go in when
 * something renders them.
 */
export default async function SeoScreen() {
  await requireMenu("seo");

  const supabase = await createClient();

  const { data: defaults, error } = await supabase
    .from("seo_defaults")
    .select("*")
    .eq("id", 1)
    .maybeSingle();

  if (error || !defaults) {
    // The row is created by the migration and a check constraint makes a
    // second one impossible, so this means the read itself failed.
    throw new Error("Could not load the SEO defaults.");
  }

  return (
    <div className="mx-auto w-full max-w-5xl">
      <header>
        <h1 className="font-display text-2xl font-semibold">SEO</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-text-muted">
          What search engines are told about this site: how pages are titled,
          what is said about them, and whether they may be indexed at all.
          Saving clears the caches, so the meta tags, robots.txt and the sitemap
          all follow within seconds — there is no deploy in between.
        </p>
      </header>

      {/*
        The current state, said plainly and before the form.

        Whether the site is open to search engines is the one fact on this
        screen that somebody might come here only to check, and making them
        scroll to a control to read it off would be making them work out an
        answer the page already knows.
      */}
      <div
        className={
          defaults.site_noindex
            ? "mt-8 rounded-xl border border-warning/40 bg-warning-soft p-4"
            : "mt-8 rounded-xl border border-border bg-surface-2/50 p-4"
        }
      >
        <p className="text-sm leading-relaxed">
          {defaults.site_noindex ? (
            <>
              <strong className="font-medium">
                The site is closed to search engines.
              </strong>{" "}
              Every page is marked noindex and robots.txt refuses the whole
              site. This is the right state until launch — and the wrong one the
              day after it.
            </>
          ) : (
            <>
              <strong className="font-medium">
                The site is open to search engines.
              </strong>{" "}
              Published pages may be indexed and the sitemap lists them.
            </>
          )}
        </p>
        <p className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs text-text-subtle">
          <CheckLink href="/robots.txt">Check robots.txt</CheckLink>
          <CheckLink href="/sitemap.xml">Check the sitemap</CheckLink>
        </p>
      </div>

      <div className="mt-10">
        {/*
          Keyed on the row's own timestamp, so a save remounts the form.

          Every field on this form is controlled since 2026-08-28, so a refused
          save no longer wipes what was typed. Remounting on `updated_at` is
          what makes a *successful* save leave the screen agreeing with the
          database rather than with the values it was mounted with.
        */}
        <SeoForm key={defaults.updated_at} values={toFormValues(defaults)} />
      </div>
    </div>
  );
}

function CheckLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 transition-colors hover:text-text"
    >
      {children}
      <ExternalLink className="size-3" aria-hidden />
    </Link>
  );
}

/**
 * The row as the form wants it.
 *
 * Nulls become empty strings because an uncontrolled input with a `null`
 * default is a React warning and an input that will not accept typing. They
 * become nulls again in the action, so a cleared field is stored as absent
 * rather than as a blank.
 *
 * The Organization override is the one that is not a string in the database.
 * It is printed with two-space indentation rather than as one long line — it
 * is JSON that a person has to read and edit, and `JSON.stringify` without a
 * spacing argument produces something nobody can find a missing brace in. An
 * empty object comes back as an empty box, which is what "there is no
 * override" should look like.
 */
function toFormValues(row: {
  title_template: string;
  default_title: string;
  default_description: string;
  google_verification: string | null;
  bing_verification: string | null;
  organization_schema: unknown;
  site_noindex: boolean;
}): SeoFormValues {
  return {
    title_template: row.title_template,
    default_title: row.default_title,
    default_description: row.default_description,
    google_verification: row.google_verification ?? "",
    bing_verification: row.bing_verification ?? "",
    organization_schema: printOverride(row.organization_schema),
    site_noindex: row.site_noindex,
  };
}

function printOverride(value: unknown): string {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    Object.keys(value).length === 0
  ) {
    return "";
  }

  return JSON.stringify(value, null, 2);
}
