import { describe, expect, it } from "vitest";
import { ADMIN_NAV_ITEMS } from "@/components/admin/nav";
import {
  GRANTABLE_ITEMS,
  canReach,
  defaultMenuFor,
  menuOverrides,
  navForProfile,
  resolveMenu,
} from "@/lib/auth/menu";
import {
  FALLBACK_ROLES,
  assignableRoles,
  roleByKey,
  type RoleDefinition,
} from "@/lib/auth/roles";

/**
 * The menu is a permission, so these are permission tests.
 *
 * Every case here is one that would be an access-control bug rather than a
 * cosmetic one: a screen reachable by somebody it was taken from, a grant
 * surviving a role that no longer exists, an owner-only screen handed out by
 * writing a key into a column.
 */

const admin = roleByKey(FALLBACK_ROLES, "admin")!;
const editor = roleByKey(FALLBACK_ROLES, "editor")!;
const client = roleByKey(FALLBACK_ROLES, "client")!;

const nobody = { menu_extra: [], menu_denied: [] };

describe("defaultMenuFor", () => {
  it("gives an admin every screen the panel has", () => {
    expect(defaultMenuFor(admin).sort()).toEqual(
      ADMIN_NAV_ITEMS.map((item) => item.key).sort(),
    );
  });

  it("keeps enquiries away from an editor", () => {
    expect(defaultMenuFor(editor)).not.toContain("leads");
    expect(defaultMenuFor(admin)).toContain("leads");
  });

  /*
    Admin reaches the accounts screen as of 2026-08-31, because Admin is what
    Owner became. What this guards is the line underneath: carrying `is_owner`
    is the only way to reach it, and a role that does not carry the flag does
    not get there however senior it looks.
  */
  it("keeps the accounts screen away from every role without is_owner", () => {
    expect(defaultMenuFor(admin)).toContain("users");
    expect(defaultMenuFor(editor)).not.toContain("users");
    expect(defaultMenuFor(client)).not.toContain("users");
  });

  it("gives nothing to a role that reaches nothing here", () => {
    expect(defaultMenuFor(client)).toEqual([]);
  });

  it("gives nothing when the role is missing or switched off", () => {
    expect(defaultMenuFor(undefined)).toEqual([]);
    expect(defaultMenuFor({ ...editor, is_active: false })).toEqual([]);
  });

  it("drops a screen the menu no longer declares", () => {
    const stale: RoleDefinition = {
      ...editor,
      default_menu: ["pages", "a-screen-that-was-deleted"],
    };
    expect(defaultMenuFor(stale)).toEqual(["pages"]);
  });

  it("refuses an owner-only screen to a role that does not carry is_owner", () => {
    // Built on editor, not admin: admin now carries the flag, so a pretender
    // based on it would be testing nothing.
    const pretender: RoleDefinition = {
      ...editor,
      default_menu: [...editor.default_menu, "users"],
    };
    expect(defaultMenuFor(pretender)).not.toContain("users");
  });
});

describe("resolveMenu", () => {
  it("adds a granted screen", () => {
    const menu = resolveMenu({ menu_extra: ["leads"], menu_denied: [] }, editor);
    expect(menu.has("leads")).toBe(true);
  });

  it("removes a screen taken away", () => {
    const menu = resolveMenu({ menu_extra: [], menu_denied: ["media"] }, editor);
    expect(menu.has("media")).toBe(false);
  });

  it("fails closed when a screen is both granted and taken away", () => {
    const menu = resolveMenu({ menu_extra: ["leads"], menu_denied: ["leads"] }, editor);
    expect(menu.has("leads")).toBe(false);
  });

  it("never grants the accounts screen, whatever the column says", () => {
    // Editor, not admin: admin reaches `users` by default now, so asking
    // whether admin can be *granted* it would pass without testing anything.
    const menu = resolveMenu({ menu_extra: ["users"], menu_denied: [] }, editor);
    expect(menu.has("users")).toBe(false);
  });

  it("grants nothing at all to an account whose role has gone", () => {
    const menu = resolveMenu({ menu_extra: ["leads", "pages"], menu_denied: [] }, undefined);
    expect(menu.size).toBe(0);
  });

  it("grants nothing to an account whose role has been switched off", () => {
    const menu = resolveMenu(
      { menu_extra: ["leads"], menu_denied: [] },
      { ...admin, is_active: false },
    );
    expect(menu.size).toBe(0);
  });

  it("treats missing columns as no adjustment", () => {
    // The state before the migration has been run.
    const menu = resolveMenu({}, editor);
    expect([...menu].sort()).toEqual(defaultMenuFor(editor).sort());
  });
});

describe("canReach", () => {
  it("answers for the screen asked about, not the role in general", () => {
    expect(canReach(nobody, editor, "pages")).toBe(true);
    expect(canReach(nobody, editor, "leads")).toBe(false);
    expect(canReach({ menu_extra: ["leads"], menu_denied: [] }, editor, "leads")).toBe(true);
  });
});

describe("navForProfile", () => {
  it("drops a group once nothing in it is reachable", () => {
    const groups = navForProfile(nobody, editor);
    expect(groups.some((group) => group.label === "Configuration")).toBe(false);
    expect(groups.some((group) => group.label === "Content")).toBe(true);
  });

  it("gives an account with no role nothing to render", () => {
    expect(navForProfile(nobody, undefined)).toEqual([]);
  });
});

describe("menuOverrides", () => {
  it("stores only the difference from the role", () => {
    const wanted = [...defaultMenuFor(editor), "leads"];
    expect(menuOverrides(editor, wanted)).toEqual({
      menu_extra: ["leads"],
      menu_denied: [],
    });
  });

  it("records a removal as a removal, not as an absence", () => {
    const wanted = defaultMenuFor(editor).filter((key) => key !== "media");
    expect(menuOverrides(editor, wanted)).toEqual({
      menu_extra: [],
      menu_denied: ["media"],
    });
  });

  it("stores nothing when the person matches their role exactly", () => {
    expect(menuOverrides(admin, defaultMenuFor(admin))).toEqual({
      menu_extra: [],
      menu_denied: [],
    });
  });

  it("recomputes against the role being saved, not the one before it", () => {
    // Somebody promoted from editor to admin, with the same ticks on screen.
    const wanted = [...defaultMenuFor(editor), "leads"];
    const { menu_extra, menu_denied } = menuOverrides(admin, wanted);

    // `leads` is an admin default, so it stops being stored as an extra.
    expect(menu_extra).toEqual([]);

    /*
      And the screens admin reaches that were not ticked are stored as
      removals — which is the half that proves the subtraction ran against
      admin and not against editor. Before Admin absorbed Owner both arrays
      were empty here, because the two roles differed by one screen; now admin
      reaches the whole panel, so leaving the editor's ticks in place is a
      deliberate set of removals rather than a no-op.

      This list is written out rather than derived, and it is meant to fail
      when a screen is added that an editor does not get — `studio` landed on
      2026-09-03 and this is where that showed up. The failure is the point: it
      makes somebody confirm the new screen really is owner-default, rather than
      the test quietly agreeing with whatever the code now does.

      `users` and `estate` are absent because they are owner-only rather than
      grantable, and nothing that cannot be granted is ever stored.
    */
    expect([...menu_denied].sort()).toEqual(["seo", "settings", "studio"]);
  });

  it("never writes a screen that cannot be granted", () => {
    const grantable = new Set<string>(GRANTABLE_ITEMS.map((item) => item.key));
    const { menu_extra } = menuOverrides(editor, ["users", "seo", "leads"]);

    for (const key of menu_extra) expect(grantable.has(key)).toBe(true);
  });

  it("round-trips: what is stored resolves back to what was ticked", () => {
    const wanted = [...defaultMenuFor(editor), "leads"].filter((key) => key !== "media");
    const stored = menuOverrides(editor, wanted);
    const resolved = resolveMenu(stored, editor);

    expect([...resolved].sort()).toEqual([...new Set(wanted)].sort());
  });
});

describe("assignableRoles", () => {
  it("stops an admin minting a super admin", () => {
    const keys = assignableRoles(FALLBACK_ROLES, admin).map((role) => role.key);
    expect(keys).not.toContain("super_admin");
    expect(keys).toContain("admin");
    expect(keys).toContain("editor");
  });

  it("lets a super admin assign anything", () => {
    const superAdmin = roleByKey(FALLBACK_ROLES, "super_admin")!;
    const keys = assignableRoles(FALLBACK_ROLES, superAdmin).map((role) => role.key);
    expect(keys).toContain("super_admin");
  });

  it("offers nothing to somebody with no role", () => {
    expect(assignableRoles(FALLBACK_ROLES, undefined)).toEqual([]);
  });

  it("never offers a role that has been switched off", () => {
    const roles = FALLBACK_ROLES.map((role) =>
      role.key === "editor" ? { ...role, is_active: false } : role,
    );
    const keys = assignableRoles(roles, admin).map((role) => role.key);
    expect(keys).not.toContain("editor");
  });
});
