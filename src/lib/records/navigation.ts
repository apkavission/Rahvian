import type { Fieldset } from "@/lib/records/definition";
import { recordSchema } from "@/lib/records/definition";
import type { Enums, Tables, TablesUpdate } from "@/types/database";

export type NavItemRow = Tables<"nav_items">;
export type NavLocation = Enums<"nav_location">;

/**
 * The menus a link can sit in.
 *
 * Every value of the `nav_location` enum is listed, including the one nothing
 * renders. Hiding `mobile` would be tidier and would also make any row already
 * stored under it unreachable from this screen — a link nobody can find and
 * nobody can delete. It is offered with a label that says what it does, which
 * is the honest version of the same tidiness.
 *
 * The notes are shown on the screen rather than kept here as a comment,
 * because "which of these three footer lists is the one with the services in
 * it" is exactly the question this screen exists to answer without a
 * developer.
 */
export const NAV_LOCATIONS: {
  value: NavLocation;
  label: string;
  /** One line on where these links actually appear. */
  note: string;
}[] = [
  {
    value: "header",
    label: "Header",
    note: "Across the top of every page, and — because the phone menu shows the same list — down the mobile panel as well. The only menu that renders a dropdown.",
  },
  {
    value: "footer_primary",
    label: "Footer · Services",
    note: "The first footer column, headed “Services”. The whole column disappears while it is empty rather than showing a heading with nothing under it.",
  },
  {
    value: "footer_secondary",
    label: "Footer · Company",
    note: "The second footer column, headed “Company”. The whole column disappears while it is empty.",
  },
  {
    value: "footer_legal",
    label: "Footer · Legal",
    note: "The small row beside the copyright line. Privacy and terms live here.",
  },
  {
    value: "mobile",
    label: "Mobile (unused)",
    note: "Nothing renders this. The phone menu shows the header links, so a link put here appears nowhere. It is listed so that anything already stored under it can be found and moved.",
  },
];

/** The locations as a select's options. */
export const NAV_LOCATION_OPTIONS = NAV_LOCATIONS.map(({ value, label }) => ({
  value,
  label,
}));

/** One location's label, or the raw value if the enum ever grows past this list. */
export function navLocationLabel(location: string): string {
  return NAV_LOCATIONS.find((entry) => entry.value === location)?.label ?? location;
}

/** The menu someone opening this screen means. */
export const DEFAULT_NAV_LOCATION: NavLocation = "header";

/** True if the value is a location this codebase knows about. */
export function isNavLocation(value: unknown): value is NavLocation {
  return NAV_LOCATIONS.some((entry) => entry.value === value);
}

/**
 * One link, as the admin edits it.
 *
 * `icon` and `badge_text` are columns on the table and are deliberately not
 * offered here. Neither the header, the dropdown, the mobile panel nor any of
 * the three footer lists reads them, so a form that collected them would be a
 * form whose values never reach a page — the worst kind of field, because it
 * looks like it worked. They go in when something renders them.
 *
 * `sort_order` is absent for the same reason it is absent from every other
 * record on this panel: the order is set with the arrows on the list, where it
 * can be seen, rather than by typing a number into a form.
 */
export function navFieldsets(
  parents: { value: string; label: string }[],
): Fieldset[] {
  return [
    {
      legend: "The link",
      fields: [
        {
          kind: "text",
          name: "label",
          label: "Label",
          required: true,
          max: 60,
          hint: "The words on the menu. Short enough that the header still fits on a laptop — one or two words is usually right.",
        },
        {
          kind: "text",
          name: "href",
          label: "Address",
          required: true,
          max: 300,
          placeholder: "/services",
          pattern: {
            re: /^(?:\/|#|https?:\/\/|mailto:|tel:)\S*$/,
            message:
              "Start with “/” for a page on this site, or with https://, mailto: or tel: for somewhere else. No spaces.",
          },
          hint: "A page on this site starts with a slash — /pricing, /services/web-development. Nothing here checks that the page exists, so a typo is a menu item that leads to a 404.",
        },
      ],
    },
    {
      legend: "Where it sits",
      hint: "A link belongs to one menu. Changing the menu here moves it — along with anything nested under it — rather than copying it.",
      fields: [
        {
          kind: "select",
          name: "location",
          label: "Menu",
          required: true,
          options: NAV_LOCATION_OPTIONS,
        },
        {
          kind: "select",
          name: "parent_id",
          label: "Nested under",
          options: parents,
          hint: "Leave this at “Not set” unless the link belongs inside another one's dropdown. Only the header renders a dropdown, so nesting anywhere else hides the link.",
        },
      ],
    },
    {
      legend: "Behaviour",
      fields: [
        {
          kind: "boolean",
          name: "is_external",
          label: "This points at another website",
          hint: "Adds the rel attributes a link off this site should carry. Tick it for anything that is not an address on this domain.",
        },
        {
          kind: "boolean",
          name: "open_new_tab",
          label: "Open in a new tab",
          hint: "Worth it for a link off the site. On one of our own pages it takes the back button away from the visitor, so leave it unticked.",
        },
      ],
    },
    {
      legend: "Publication",
      hint: "The order the links appear in is set with the arrows on the list, not here.",
      fields: [
        {
          kind: "boolean",
          name: "is_active",
          label: "Show this link on the site",
          hint: "Untick it to take the link out of the menu without losing it. A hidden parent takes its whole dropdown with it.",
        },
      ],
    },
  ];
}

/** The schema for one link. */
export function navSchema(parents: { value: string; label: string }[]) {
  return recordSchema(navFieldsets(parents));
}

/** The row, as the form's values. */
export function navToValues(row: NavItemRow): Record<string, unknown> {
  return {
    label: row.label,
    href: row.href,
    location: row.location,
    // The select's "Not set" entry posts the empty string and the schema turns
    // that back into undefined, so a top-level link round-trips as an absent
    // parent rather than as the string "null".
    parent_id: row.parent_id ?? "",
    is_external: row.is_external,
    open_new_tab: row.open_new_tab,
    is_active: row.is_active,
  };
}

/**
 * The validated values, as columns.
 *
 * `sort_order` is not written here. Where a link sits among its siblings is
 * decided by the arrows, and — when a link changes menu or parent — by the
 * action placing it at the end of the list it has just joined. Neither is a
 * value this form carries.
 */
export function valuesToRow(
  values: Record<string, unknown>,
): TablesUpdate<"nav_items"> {
  const parent = typeof values.parent_id === "string" ? values.parent_id : "";

  return {
    label: text(values.label) ?? "",
    href: text(values.href) ?? "",
    location: values.location as NavLocation,
    parent_id: parent === "" ? null : parent,
    is_external: values.is_external === true,
    open_new_tab: values.open_new_tab === true,
    is_active: values.is_active === true,
  };
}

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim() !== "" ? value.trim() : null;
}

// ---------------------------------------------------------------------------
// Shape
//
// The menu is the one piece of content on this site that is a tree rather than
// a list, and these three functions are the whole of what that costs. They are
// pure, and they live here rather than in the query or the action because both
// need them: a tree flattened two different ways is a screen whose arrows move
// something other than what they point at.
// ---------------------------------------------------------------------------

export interface NavDisplayItem {
  row: NavItemRow;
  /** 0 for a top-level link, 1 for one inside a dropdown. */
  depth: 0 | 1;
}

/**
 * One menu's rows in the order they are read on the page: each top-level link
 * followed by whatever is nested under it.
 *
 * Rows are expected in `sort_order`. A child whose parent is not in the given
 * set is listed at the end at depth 0 rather than dropped — that only happens
 * if a parent left the menu without its children, which `saveNavItem` refuses
 * to do, and a link that cannot be seen is a link that cannot be fixed.
 */
export function navDisplayOrder(rows: NavItemRow[]): NavDisplayItem[] {
  const present = new Set(rows.map((row) => row.id));
  const ordered: NavDisplayItem[] = [];

  for (const root of rows) {
    if (root.parent_id) continue;
    ordered.push({ row: root, depth: 0 });
    for (const child of rows) {
      if (child.parent_id === root.id) ordered.push({ row: child, depth: 1 });
    }
  }

  for (const row of rows) {
    if (row.parent_id && !present.has(row.parent_id)) {
      ordered.push({ row, depth: 0 });
    }
  }

  return ordered;
}

/**
 * The rows one row's arrows move it among: same menu, same parent.
 *
 * Siblings rather than the whole menu, because `sort_order` is a single number
 * across both levels. Swapping with the next row of the flattened list would
 * routinely swap a dropdown entry with the top-level link after it — a move
 * that reads as the arrows being broken, since neither row goes where the
 * arrow pointed.
 */
export function navSiblings(rows: NavItemRow[], id: string): NavItemRow[] {
  const row = rows.find((candidate) => candidate.id === id);
  if (!row) return [];

  return rows.filter(
    (candidate) =>
      candidate.location === row.location && candidate.parent_id === row.parent_id,
  );
}

/**
 * The links a given row may be nested under.
 *
 * Top-level links in the same menu, minus the row itself. A row that already
 * has children of its own is offered nothing: nesting it would leave its
 * children at a third level, and the database's depth trigger does not catch
 * that — the trigger fires on the row being written, and the rows that would
 * become too deep are not the row being written.
 */
export function navParentOptions(
  rows: NavItemRow[],
  location: string,
  selfId: string | null,
): { value: string; label: string }[] {
  if (selfId && rows.some((row) => row.parent_id === selfId)) return [];

  return rows
    .filter((row) => row.location === location && !row.parent_id && row.id !== selfId)
    .map((row) => ({
      value: row.id,
      label: row.is_active ? row.label : `${row.label} (hidden)`,
    }));
}
