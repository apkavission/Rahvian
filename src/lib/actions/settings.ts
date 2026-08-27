"use server";

import { revalidatePath, updateTag } from "next/cache";
import { INVALIDATION_MAP } from "@/lib/cache/tags";
import { getStaffSession, isOwner } from "@/lib/auth/session";
import { getMediaOptions } from "@/lib/queries/media-admin";
import { createClient } from "@/lib/supabase/server";
import {
  settingsSchema,
  SOCIAL_FIELDS,
  type SettingsFormState,
} from "@/lib/validation/settings";

/**
 * Save site settings.
 *
 * Three checks stand between a form post and a write, and each one is there
 * because the others are not enough on their own:
 *
 *   The session says who is asking. A Server Action is an HTTP endpoint —
 *   being unable to reach the screen does not stop anyone posting to it.
 *   The role check refuses editors, matching the menu they were shown.
 *   RLS refuses the write regardless, at the database, from `is_staff()`.
 *
 * The last one is the only one that cannot be bypassed by a mistake in this
 * file, which is why the policy exists rather than trusting these lines.
 */
export async function saveSettings(
  _previous: SettingsFormState,
  formData: FormData,
): Promise<SettingsFormState> {
  const session = await getStaffSession();

  if (!session) {
    return { status: "error", message: "Your session has expired. Sign in again." };
  }

  if (!isOwner(session)) {
    return {
      status: "error",
      message: "Only an owner can change these settings.",
    };
  }

  const parsed = settingsSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0];
      if (typeof key === "string" && !fieldErrors[key]) {
        fieldErrors[key] = issue.message;
      }
    }
    return {
      status: "error",
      message: "Check the highlighted fields.",
      fieldErrors,
    };
  }

  const input = parsed.data;

  /*
    An id has to name a real asset.

    Checked against the same list the picker was built from, so a posted
    request naming a row that is not in the media library is refused rather
    than written — the settings form has no descriptor schema to do this for
    it, so it is done here explicitly.
  */
  const assetIds = new Set((await getMediaOptions()).map((asset) => asset.id));

  for (const key of ["logo_light_id", "logo_dark_id"] as const) {
    const value = input[key];
    if (value !== null && !assetIds.has(value)) {
      return {
        status: "error",
        message: "Check the highlighted fields.",
        fieldErrors: { [key]: "That file is not in the media library." },
      };
    }
  }

  /*
    Social links are one jsonb column, not six.

    Empty platforms are dropped rather than stored as null, because the public
    site reads this object by iterating it — `sameAs` in the Organization graph
    and the footer icons both do — and a key with no value would produce an
    empty link rather than no link.
  */
  const social: Record<string, string> = {};
  for (const { name } of SOCIAL_FIELDS) {
    const value = input[name];
    if (value) social[name] = value;
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from("site_settings")
    .update({
      company_name: input.company_name,
      legal_name: input.legal_name,
      tagline: input.tagline,
      email: input.email,
      phone: input.phone,
      whatsapp: input.whatsapp,
      address_line1: input.address_line1,
      address_line2: input.address_line2,
      city: input.city,
      state: input.state,
      postal_code: input.postal_code,
      country: input.country,
      cin: input.cin,
      gst: input.gst,

      logo_light_id: input.logo_light_id,
      logo_dark_id: input.logo_dark_id,

      social,
    })
    .eq("id", 1);

  if (error) {
    console.error("[settings] save failed:", error.message);
    return {
      status: "error",
      // The database message is not shown. It names columns and constraints,
      // which tells an owner nothing and tells anyone else too much.
      message: "Could not save. Nothing was changed — try again.",
    };
  }

  /*
    The write alone changes nothing a visitor can see.

    Every public read is cached under a tag with no expiry, so this is the line
    that makes the new phone number appear in the footer. It goes through the
    invalidation map rather than naming a tag by hand: a mutation that invents
    its own tag string leaves a cache nothing will ever clear, and nothing
    fails loudly to say so.

    `updateTag` rather than `revalidateTag`: the latter serves the stale value
    while the fresh one is fetched, which is right for a background refresh and
    wrong here. The owner has just pressed save and will open the site to check
    — being shown the previous version reads as the save having failed.
  */
  for (const tag of INVALIDATION_MAP.siteSettings()) {
    updateTag(tag);
  }

  /*
    And the admin screen itself, which is not tag-cached.

    React resets an uncontrolled field once its form action completes, so
    without a fresh render the inputs would snap back to the values they held
    before the save. The row's `updated_at` changes with the write and the page
    keys the form on it, so this refresh is what remounts it with the saved
    values in place.
  */
  revalidatePath("/admin/settings");

  return {
    status: "success",
    message: "The public site is already showing them.",
  };
}
