import { describe, expect, it } from "vitest";
import {
  navDisplayOrder,
  navParentOptions,
  navSiblings,
  navToValues,
  valuesToRow,
  type NavItemRow,
} from "@/lib/records/navigation";

/**
 * The shape helpers.
 *
 * These four functions are the whole of what the second level costs, and three
 * of them decide something the person cannot check by looking: which rows an
 * arrow swaps, which links may be a parent, and whether a cleared parent is
 * stored as absent or as the string "null". A menu that reorders the wrong row
 * is not an obvious failure — it looks like the button did nothing — so the
 * rules are pinned here rather than trusted to the screen.
 */

let counter = 0;

function row(overrides: Partial<NavItemRow> & { id: string }): NavItemRow {
  counter += 1;

  return {
    location: "header",
    label: overrides.label ?? `Link ${counter}`,
    href: overrides.href ?? "/",
    parent_id: null,
    sort_order: counter,
    is_external: false,
    open_new_tab: false,
    icon: null,
    badge_text: null,
    is_active: true,
    created_at: "2026-08-27T00:00:00Z",
    updated_at: "2026-08-27T00:00:00Z",
    ...overrides,
  };
}

describe("navDisplayOrder", () => {
  it("prints each parent followed by its own children", () => {
    const rows = [
      row({ id: "services", label: "Services", sort_order: 1 }),
      row({ id: "portfolio", label: "Portfolio", sort_order: 2 }),
      row({ id: "web", label: "Web", parent_id: "services", sort_order: 1 }),
      row({ id: "apps", label: "Apps", parent_id: "services", sort_order: 2 }),
    ];

    expect(navDisplayOrder(rows).map((entry) => [entry.row.id, entry.depth])).toEqual([
      ["services", 0],
      ["web", 1],
      ["apps", 1],
      ["portfolio", 0],
    ]);
  });

  it("lists an orphan rather than dropping it", () => {
    // A child whose parent is in another menu. It should not be possible, and
    // if it ever happens the link has to be reachable to be fixed.
    const rows = [
      row({ id: "portfolio", sort_order: 1 }),
      row({ id: "stray", parent_id: "elsewhere", sort_order: 2 }),
    ];

    expect(navDisplayOrder(rows).map((entry) => entry.row.id)).toEqual([
      "portfolio",
      "stray",
    ]);
  });
});

describe("navSiblings", () => {
  const rows = [
    row({ id: "services", sort_order: 1 }),
    row({ id: "web", parent_id: "services", sort_order: 1 }),
    row({ id: "apps", parent_id: "services", sort_order: 2 }),
    row({ id: "pricing", sort_order: 2 }),
    row({ id: "privacy", location: "footer_legal", sort_order: 1 }),
  ];

  it("keeps a dropdown entry among the other entries of that dropdown", () => {
    expect(navSiblings(rows, "web").map((entry) => entry.id)).toEqual(["web", "apps"]);
  });

  it("keeps a top-level link away from the dropdowns underneath it", () => {
    expect(navSiblings(rows, "services").map((entry) => entry.id)).toEqual([
      "services",
      "pricing",
    ]);
  });

  it("never crosses menus", () => {
    expect(navSiblings(rows, "privacy").map((entry) => entry.id)).toEqual(["privacy"]);
  });

  it("returns nothing for a row that is not there", () => {
    expect(navSiblings(rows, "gone")).toEqual([]);
  });
});

describe("navParentOptions", () => {
  const rows = [
    row({ id: "services", label: "Services", sort_order: 1 }),
    row({ id: "web", label: "Web", parent_id: "services", sort_order: 1 }),
    row({ id: "pricing", label: "Pricing", sort_order: 2 }),
    row({ id: "hidden", label: "Careers", is_active: false, sort_order: 3 }),
    row({ id: "privacy", label: "Privacy", location: "footer_legal", sort_order: 1 }),
  ];

  it("offers the top-level links of the same menu, and marks the hidden ones", () => {
    expect(navParentOptions(rows, "header", "pricing")).toEqual([
      { value: "services", label: "Services" },
      { value: "hidden", label: "Careers (hidden)" },
    ]);
  });

  it("offers nothing to a link that already has a dropdown", () => {
    // Nesting it would put "Web" at a third level, which the database's depth
    // trigger does not catch: it fires on the row being written, and the row
    // that would become too deep is not the row being written.
    expect(navParentOptions(rows, "header", "services")).toEqual([]);
  });

  it("never offers a parent from another menu", () => {
    expect(navParentOptions(rows, "footer_legal", null)).toEqual([
      { value: "privacy", label: "Privacy" },
    ]);
  });
});

describe("values", () => {
  it("round-trips a top-level link as an absent parent, not the string null", () => {
    const values = navToValues(row({ id: "pricing", label: "Pricing", href: "/pricing" }));

    expect(values.parent_id).toBe("");
    expect(valuesToRow(values).parent_id).toBeNull();
  });

  it("keeps a chosen parent", () => {
    const values = navToValues(row({ id: "web", parent_id: "services" }));

    expect(valuesToRow(values).parent_id).toBe("services");
  });

  it("does not write a sort order", () => {
    // Where a link sits is decided by the arrows and, when it changes menu, by
    // the action placing it at the end. A form that also wrote the number
    // would undo whichever of those ran last.
    expect(valuesToRow(navToValues(row({ id: "pricing" })))).not.toHaveProperty(
      "sort_order",
    );
  });

  it("trims the label and the address", () => {
    expect(
      valuesToRow({ label: "  Pricing  ", href: "  /pricing  ", location: "header" }),
    ).toMatchObject({ label: "Pricing", href: "/pricing" });
  });
});
