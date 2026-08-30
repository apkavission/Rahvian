"use server";

import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getStaffSession } from "@/lib/auth/session";
import { INVALIDATION_MAP } from "@/lib/cache/tags";
import {
  isNavLocation,
  navLocationLabel,
  navSchema,
  navSiblings,
  valuesToRow,
  type NavItemRow,
} from "@/lib/records/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  fieldErrors,
  moveRecordSchema,
  recordIdSchema,
  saveRecordSchema,
  type RecordActionState,
} from "@/lib/validation/records";

/**
 * Navigation mutations.
 *
 * Every one of them clears `INVALIDATION_MAP.navigation()`. That is one tag,
 * and one tag is enough: the header and all three footer lists read through
 * `getNavigation`, which is cached under it, and nothing else on the site
 * reads `nav_items` at all.
 *
 * What makes this file longer than the other six content screens is the second
 * level. A menu is a tree, and three of its rules cannot be expressed as a
 * column constraint — a parent must be in the same menu as its child, a link
 * that already has a dropdown cannot itself go into one, and a link that
 * changes menu has to take its dropdown with it. The database's depth trigger
 * catches only the first of the three, because it fires on the row being
 * written and the rows that would end up too deep are not the row being
 * written. So they are enforced here, each with a sentence that says which one
 * was broken.
 */

async function guard(): Promise<RecordActionState | null> {
  const session = await getStaffSession();
  if (!session) {
    return { status: "error", message: "Your session has expired. Sign in again." };
  }
  return null;
}

function refresh() {
  for (const tag of INVALIDATION_MAP.navigation()) updateTag(tag);
  revalidatePath("/admin/navigation");
}

/** Every row, in stored order. The table is small enough to read whole. */
async function allItems(): Promise<NavItemRow[] | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("nav_items")
    .select("*")
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("[navigation] read failed:", error.message);
    return null;
  }

  return data ?? [];
}

/**
 * The next number at the end of one sibling list.
 *
 * Computed against siblings rather than the whole table, so a link joining a
 * dropdown lands under the other entries of that dropdown instead of after
 * every row in the database.
 */
function nextSortOrder(
  rows: NavItemRow[],
  location: string,
  parentId: string | null,
): number {
  const siblings = rows.filter(
    (row) => row.location === location && row.parent_id === parentId,
  );

  return siblings.reduce((highest, row) => Math.max(highest, row.sort_order), 0) + 1;
}

// ---------------------------------------------------------------------------

const createNavItemSchema = z.object({
  label: z
    .string()
    .trim()
    .min(1, "Write the label.")
    .max(60, "That label is too long for a menu."),
  href: z
    .string()
    .trim()
    .min(1, "Write the address.")
    .max(300, "That address is too long.")
    .regex(
      /^(?:\/|#|https?:\/\/|mailto:|tel:)\S*$/,
      "Start with “/” for a page on this site, or with https://, mailto: or tel: for somewhere else. No spaces.",
    ),
  location: z.string().refine(isNavLocation, "That is not one of the menus."),
});

/**
 * Add a link.
 *
 * Both fields, because the table refuses an empty label and an empty address —
 * a form that offered to start a link without them would be offering a row
 * that cannot be written.
 *
 * It arrives hidden, at the end of whichever menu the list is showing, and at
 * the top level. Hidden because a menu is the one piece of content every
 * visitor sees on every page, so a half-typed address should never be one
 * save away from being in it.
 */
export async function createNavItem(
  _previous: RecordActionState,
  formData: FormData,
): Promise<RecordActionState> {
  const refused = await guard();
  if (refused) return refused;

  const parsed = createNavItemSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return {
      status: "error",
      message: "Check the highlighted fields.",
      fieldErrors: fieldErrors(parsed.error.issues),
    };
  }

  const rows = await allItems();
  if (!rows) return { status: "error", message: "Could not read the menu." };

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("nav_items")
    .insert({
      label: parsed.data.label,
      href: parsed.data.href,
      location: parsed.data.location,
      parent_id: null,
      is_active: false,
      sort_order: nextSortOrder(rows, parsed.data.location, null),
    })
    .select("id")
    .single();

  if (error) {
    console.error("[navigation] create failed:", error.message);
    return { status: "error", message: "Could not add it." };
  }

  revalidatePath("/admin/navigation");

  redirect(`/admin/navigation?location=${parsed.data.location}&item=${data.id}`);
}

/**
 * Save one link.
 *
 * The three tree rules are checked here, after the schema and before the
 * write, and each reports against the field that broke it so the answer
 * appears beside the control that caused the question.
 */
export async function saveNavItem(
  _previous: RecordActionState,
  formData: FormData,
): Promise<RecordActionState> {
  const refused = await guard();
  if (refused) return refused;

  const parsed = saveRecordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { status: "error", message: "That request did not make sense." };
  }

  let raw: unknown;
  try {
    raw = JSON.parse(parsed.data.values);
  } catch {
    return {
      status: "error",
      message: "The editor sent something unreadable. Reload the page and try again.",
    };
  }

  const rows = await allItems();
  if (!rows) return { status: "error", message: "Could not read the menu." };

  const current = rows.find((row) => row.id === parsed.data.id);
  if (!current) return { status: "error", message: "That link no longer exists." };

  /*
    The parent is validated in two passes rather than one.

    The schema is built from every top-level link in every menu, which is
    wider than the select the person was shown — the narrow list depends on
    the menu they may have just changed in the same form, so building the
    schema from it would refuse a legitimate save with "Pick one of the
    options". What the wider list still refuses is an id that is not a
    top-level link at all. The relationship rules that the wider list lets
    through are then checked below, where each can say what is actually wrong.
  */
  const parentOptions = rows
    .filter((row) => !row.parent_id)
    .map((row) => ({ value: row.id, label: row.label }));

  const values = navSchema(parentOptions).safeParse(raw);

  if (!values.success) {
    return {
      status: "error",
      message: "Check the highlighted fields.",
      fieldErrors: fieldErrors(values.error.issues),
    };
  }

  const next = valuesToRow(values.data as Record<string, unknown>);
  const children = rows.filter((row) => row.parent_id === current.id);

  if (next.parent_id) {
    const parent = rows.find((row) => row.id === next.parent_id);

    const problem =
      next.parent_id === current.id
        ? "A link cannot sit inside itself."
        : !parent
          ? "That link no longer exists. Reload the page."
          : parent.parent_id
            ? "That link is already inside a dropdown, and the menu is two levels deep. Pick a top-level link instead."
            : parent.location !== next.location
              ? `That link is in the ${navLocationLabel(parent.location)} menu. A link can only be nested under one in the same menu.`
              : children.length > 0
                ? `“${current.label}” has ${children.length === 1 ? "a link" : `${children.length} links`} in its own dropdown. Move ${children.length === 1 ? "it" : "them"} out first — the menu is two levels deep, not three.`
                : null;

    if (problem) {
      return {
        status: "error",
        message: "Check the highlighted fields.",
        fieldErrors: { parent_id: problem },
      };
    }
  }

  const location = next.location ?? current.location;
  const parentId = next.parent_id ?? null;
  const moved = location !== current.location || parentId !== current.parent_id;

  const supabase = await createClient();

  const { error } = await supabase
    .from("nav_items")
    .update({
      ...next,
      // A link that has joined a different menu or a different dropdown keeps
      // the number it had in the list it left, which would drop it into the
      // middle of the new one at a position nobody chose. The end of the new
      // list is the only place that is not a surprise.
      ...(moved ? { sort_order: nextSortOrder(rows, location, parentId) } : {}),
    })
    .eq("id", current.id);

  if (error) {
    console.error("[navigation] save failed:", error.message);
    return { status: "error", message: "Could not save. Nothing was changed." };
  }

  /*
    A parent that changes menu takes its dropdown with it.

    `location` is stored on every row, and the public query filters by it — so
    children left behind would stop appearing under their parent and start
    appearing as top-level links in the menu the parent just left. Moving them
    is the only reading of "move this link" that does not quietly break two
    menus at once.
  */
  let carried = 0;

  if (location !== current.location && children.length > 0) {
    const { error: childError } = await supabase
      .from("nav_items")
      .update({ location })
      .eq("parent_id", current.id);

    if (childError) {
      console.error("[navigation] child move failed:", childError.message);
      refresh();
      return {
        status: "error",
        message: `“${current.label}” moved, but the ${children.length} links under it did not. Open one of them and set its menu by hand.`,
      };
    }

    carried = children.length;
  }

  refresh();

  return {
    status: "success",
    message: carried
      ? `Saved, and the ${carried} links in its dropdown moved with it.`
      : "The header and footer are already showing it.",
  };
}

/**
 * Move a link one place among its siblings.
 *
 * Siblings, not the whole menu: `sort_order` is one number across both levels,
 * so swapping with the next row of the flattened list would swap a dropdown
 * entry with the top-level link after it — a move that looks like the arrows
 * doing nothing, since neither row lands where the arrow pointed. The list
 * disables the arrow at each end of each sibling group for the same reason.
 */
export async function moveNavItem(
  _previous: RecordActionState,
  formData: FormData,
): Promise<RecordActionState> {
  const refused = await guard();
  if (refused) return refused;

  const parsed = moveRecordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { status: "error", message: "That request did not make sense." };
  }

  const rows = await allItems();
  if (!rows) return { status: "error", message: "Could not read the menu." };

  const siblings = navSiblings(rows, parsed.data.id);

  const index = siblings.findIndex((row) => row.id === parsed.data.id);
  const target = parsed.data.direction === "up" ? index - 1 : index + 1;

  if (index < 0 || target < 0 || target >= siblings.length) {
    return { status: "error", message: "It is already at the end." };
  }

  const a = siblings[index];
  const b = siblings[target];

  const supabase = await createClient();

  const [first, second] = await Promise.all([
    supabase.from("nav_items").update({ sort_order: b.sort_order }).eq("id", a.id),
    supabase.from("nav_items").update({ sort_order: a.sort_order }).eq("id", b.id),
  ]);

  if (first.error || second.error) {
    console.error("[navigation] move failed:", first.error?.message ?? second.error?.message);
    return { status: "error", message: "Could not move it." };
  }

  refresh();

  return { status: "success", message: "Moved." };
}

/**
 * Duplicate a link.
 *
 * Hidden, at the end of the same list, beside the one it was copied from. The
 * dropdown underneath a parent is not copied — a second copy of six service
 * links is not what anyone pressing this on a parent means, and the message
 * says so rather than leaving it to be discovered.
 */
export async function duplicateNavItem(
  _previous: RecordActionState,
  formData: FormData,
): Promise<RecordActionState> {
  const refused = await guard();
  if (refused) return refused;

  const parsed = recordIdSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { status: "error", message: "That request did not make sense." };
  }

  const rows = await allItems();
  if (!rows) return { status: "error", message: "Could not read the menu." };

  const item = rows.find((row) => row.id === parsed.data.id);
  if (!item) return { status: "error", message: "That link no longer exists." };

  const supabase = await createClient();

  const { data: created, error } = await supabase
    .from("nav_items")
    .insert({
      label: `${item.label} (copy)`,
      href: item.href,
      location: item.location,
      parent_id: item.parent_id,
      is_external: item.is_external,
      open_new_tab: item.open_new_tab,
      icon: item.icon,
      badge_text: item.badge_text,
      is_active: false,
      sort_order: nextSortOrder(rows, item.location, item.parent_id),
    })
    .select("id")
    .single();

  if (error) {
    console.error("[navigation] duplicate failed:", error.message);
    return { status: "error", message: "Could not duplicate it." };
  }

  refresh();

  redirect(`/admin/navigation?location=${item.location}&item=${created.id}`);
}

/**
 * Delete a link.
 *
 * The one irreversible action on this screen, and the only one on the panel
 * that can take rows with it: the foreign key cascades, so deleting a parent
 * deletes its whole dropdown. The confirmation counts them before it asks, and
 * offers the switch instead — a hidden link is out of the menu just as
 * completely and comes back if it was the wrong call.
 */
export async function deleteNavItem(
  _previous: RecordActionState,
  formData: FormData,
): Promise<RecordActionState> {
  const refused = await guard();
  if (refused) return refused;

  const parsed = recordIdSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { status: "error", message: "That request did not make sense." };
  }

  const supabase = await createClient();

  const { error } = await supabase.from("nav_items").delete().eq("id", parsed.data.id);

  if (error) {
    console.error("[navigation] delete failed:", error.message);
    return { status: "error", message: "Could not delete it. Nothing was changed." };
  }

  refresh();

  return { status: "success", message: "Deleted." };
}
