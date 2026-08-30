"use server";

import { revalidatePath, updateTag } from "next/cache";
import { canReach } from "@/lib/auth/menu";
import { getStaffSession } from "@/lib/auth/session";
import { INVALIDATION_MAP } from "@/lib/cache/tags";
import { createClient } from "@/lib/supabase/server";
import {
  parseOrganizationSchema,
  seoSchema,
  type SeoFormState,
} from "@/lib/validation/seo";

/**
 * Save the site-wide SEO defaults.
 *
 * The permission is the menu, not a role list. `seo` is a grantable screen —
 * an owner can hand it to whoever writes the copy — and the standing rule is
 * that whatever a person's menu resolves to is exactly what they may do. A
 * role check here would contradict the sidebar they were shown, and RLS
 * (`seo_defaults_staff_write`) refuses the write underneath regardless of what
 * this file decides.
 *
 * Two of the fields are unlike the rest and are handled after the schema:
 * `organization_schema` arrives as typed text and has to become an object, and
 * `site_noindex` is the switch that decides whether this site exists to search
 * engines at all.
 */
export async function saveSeoDefaults(
  _previous: SeoFormState,
  formData: FormData,
): Promise<SeoFormState> {
  const session = await getStaffSession();

  if (!session) {
    return { status: "error", message: "Your session has expired. Sign in again." };
  }

  if (!canReach(session.profile, session.role, "seo")) {
    return { status: "error", message: "This screen is not yours to change." };
  }

  const parsed = seoSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0];
      if (typeof key === "string" && !fieldErrors[key]) {
        fieldErrors[key] = issue.message;
      }
    }
    return { status: "error", message: "Check the highlighted fields.", fieldErrors };
  }

  const input = parsed.data;

  const organization = parseOrganizationSchema(input.organization_schema);

  if (!organization.ok) {
    return {
      status: "error",
      message: "Check the highlighted fields.",
      fieldErrors: { organization_schema: organization.message },
    };
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from("seo_defaults")
    .update({
      title_template: input.title_template,
      default_title: input.default_title,
      default_description: input.default_description,
      google_verification: input.google_verification,
      bing_verification: input.bing_verification,
      organization_schema: organization.value,
      site_noindex: input.site_noindex,
    })
    .eq("id", 1);

  if (error) {
    console.error("[seo] save failed:", error.message);
    return {
      status: "error",
      // The database message names columns and constraints, which tells an
      // owner nothing and tells anyone else too much.
      message: "Could not save. Nothing was changed — try again.",
    };
  }

  /*
    The write alone changes nothing anyone can see.

    Every public read of this row is cached under one tag with no expiry, and
    that includes `robots.ts` and `sitemap.ts` as well as every page's
    metadata. `updateTag` rather than `revalidateTag`: the latter serves the
    stale value while the fresh one is fetched, and somebody who has just
    turned the site live and opened `/robots.txt` to check would be shown the
    version that still says `Disallow: /`.
  */
  for (const tag of INVALIDATION_MAP.seoDefaults()) {
    updateTag(tag);
  }

  // And the admin screen itself, which is not tag-cached. React resets an
  // uncontrolled field once its action completes, so without this the inputs
  // would snap back to the values from before the save.
  revalidatePath("/admin/seo");

  return {
    status: "success",
    message: input.site_noindex
      ? "Saved. The site is still closed to search engines."
      : "Saved. The site is open to search engines.",
  };
}
