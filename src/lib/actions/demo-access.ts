"use server";

import { revalidatePath, updateTag } from "next/cache";
import { CACHE_TAGS } from "@/lib/cache/tags";
import { getStaffSession } from "@/lib/auth/session";
import { createControlClient } from "@/lib/supabase/control";
import type { RecordActionState, ShareActionState } from "@/lib/validation/records";

/**
 * Who may open a demo, decided from the company admin.
 *
 * ---------------------------------------------------------------------------
 * **Where the authority actually lives.**
 *
 * Not here. Every function these call asks `control.is_owner()` itself and
 * raises if the answer is no, so this file could be deleted and the rule would
 * hold. The checks below are the same answer given earlier, for a better
 * message than a Postgres exception — a courtesy, not the guard. The client
 * carries the signed-in person's own session for that reason; a service-role
 * client here would make this file the guard.
 *
 * ---------------------------------------------------------------------------
 * **The token comes back exactly once.**
 *
 * `create_demo_link` returns it, this hands it to the screen, and after that
 * the only copies are in the demo's own table and in whatever the link was
 * pasted into. Nothing re-displays it later: a screen that could show any
 * token on demand is a screen that hands over every live demo, and the estate
 * list deliberately shows the label and the state rather than the secret.
 */

const OK = (message: string): RecordActionState => ({ status: "success", message });
const NO = (message: string): RecordActionState => ({ status: "error", message });

/** The answer to "may this person do this at all", once. */
async function asOwner(): Promise<string | null> {
  const session = await getStaffSession();

  if (!session) return "Your session has expired. Sign in again.";
  if (!session.role.is_owner) return "Only an owner can decide who may open a demo.";

  return null;
}

export async function shareDemo(
  _previous: ShareActionState,
  formData: FormData,
): Promise<ShareActionState> {
  const refused = await asOwner();
  if (refused) return NO(refused);

  const appKey = String(formData.get("app_key") ?? "").trim();
  const variantId = String(formData.get("variant_id") ?? "").trim();
  const label = String(formData.get("label") ?? "").trim();
  const baseUrl = String(formData.get("base_url") ?? "").trim();

  if (!appKey || !variantId) return NO("Choose which demo and which business.");
  if (!label) {
    return NO("Say who the link is for — it is the only way to tell two apart later.");
  }

  const days = Number(formData.get("days") ?? 0);
  if (!Number.isFinite(days) || days < 1 || days > 365) {
    return NO("A link lasts between one day and a year.");
  }

  /*
    An empty box means no limit, not zero.

    `Number("")` is 0, which the database refuses as "a link that was never
    sent" — a correct rule that would produce a baffling error for somebody who
    simply left the optional field alone.
  */
  const rawLimit = String(formData.get("max_views") ?? "").trim();
  const maxViews = rawLimit === "" ? null : Number(rawLimit);

  if (maxViews !== null && (!Number.isInteger(maxViews) || maxViews < 1)) {
    return NO("A limit on openings has to be a whole number, or left empty.");
  }

  const note = String(formData.get("note") ?? "").trim();

  const supabase = await createControlClient();

  const { data, error } = await supabase.rpc("create_demo_link", {
    p_app_key: appKey,
    p_variant_id: variantId,
    p_label: label,
    p_days: days,
    p_max_views: maxViews,
    p_note: note || null,
  });

  if (error) return NO(error.message);
  if (!data) return NO("The link was not made. Nothing has been sent.");

  revalidatePath("/admin/estate/demos");

  return {
    ...OK(`A link for ${label} is ready. It works for ${days} ${days === 1 ? "day" : "days"}.`),
    /*
      Built here rather than in the browser, from the address the estate holds
      for that demo. A link assembled from `window.location` would carry the
      admin's own host — which is the company website, not the demo — and the
      first anybody would know is a client reporting a dead link.
    */
    url: `${baseUrl.replace(/\/+$/, "")}/s/${data}`,
    label,
  };
}

export async function closeDemoLink(
  _previous: RecordActionState,
  formData: FormData,
): Promise<RecordActionState> {
  const refused = await asOwner();
  if (refused) return NO(refused);

  const appKey = String(formData.get("app_key") ?? "").trim();
  const linkId = String(formData.get("link_id") ?? "").trim();

  if (!appKey || !linkId) return NO("That request did not make sense.");

  const supabase = await createControlClient();

  const { error } = await supabase.rpc("revoke_demo_link", {
    p_app_key: appKey,
    p_link_id: linkId,
  });

  if (error) return NO(error.message);

  revalidatePath("/admin/estate/demos");

  return OK("Closed. It stops working on the next request, wherever it was sent.");
}

/**
 * Open one business to anybody with the address, or close it again.
 *
 * On this screen rather than buried in a variant editor because this is the
 * switch that made every share link decoration until 2026-09-03: all eighteen
 * businesses were public, so the address alone worked and the expiry dates
 * meant nothing. It belongs where somebody will see it.
 */
export async function setDemoVisibility(
  _previous: RecordActionState,
  formData: FormData,
): Promise<RecordActionState> {
  const refused = await asOwner();
  if (refused) return NO(refused);

  const appKey = String(formData.get("app_key") ?? "").trim();
  const variantId = String(formData.get("variant_id") ?? "").trim();

  if (!appKey || !variantId) return NO("That request did not make sense.");

  /* The button says what it will do, and sends that — rather than sending the
     current state and having two places work out the opposite of it. */
  const open = formData.get("open") === "yes";

  const supabase = await createControlClient();

  const { error } = await supabase.rpc("set_demo_visibility", {
    p_app_key: appKey,
    p_variant_id: variantId,
    p_public: open,
  });

  if (error) return NO(error.message);

  revalidatePath("/admin/estate/demos");

  /*
    And the company's own website, which now lists these.

    The "Live demos" section reads `control.public_demos()` through a cache
    tagged `demos`, so this switch is the only thing that can change what is in
    that grid — and a switch whose effect a visitor cannot see for five minutes
    is a switch somebody presses twice.

    `updateTag` rather than `revalidateTag`: in this version the second is a
    scheduled revalidation and takes a lifetime profile, while this one expires
    the tag now and gives the action read-your-own-writes. Pressing the switch
    and reloading the site has to show the change, or the switch is not the
    thing that decides.
  */
  updateTag(CACHE_TAGS.demos);

  return OK(
    open
      ? "Open to anybody with the address, and listed on the website. Live links keep working."
      : "Closed. Only a live link opens it now, and it is off the website.",
  );
}
