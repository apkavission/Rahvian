import { describe, expect, it } from "vitest";
import { ADMIN_NAV_ITEMS } from "@/components/admin/nav";
import { safeQuery, SOURCES } from "@/lib/search/sources";

/**
 * The command palette's descriptors.
 *
 * Two things here are worth pinning and neither needs a database.
 *
 * **The address each result links to.** A result that opens a record at an
 * address the screen's own list does not use lands on a screen that selects
 * nothing — which reads as the record being missing rather than as a broken
 * link. The list screens are the authority, and these expectations are copied
 * from them.
 *
 * **What gets stripped out of a query.** PostgREST's `or` filter is a string
 * whose commas and parentheses are structure, so a query carrying either would
 * be read as more filters. That is the shape an injection takes here.
 */

const source = (menu: string) => {
  const found = SOURCES.find((candidate) => candidate.menu === menu);
  if (!found) throw new Error(`no search source for ${menu}`);
  return found;
};

const row = (menu: string, values: Record<string, unknown>) =>
  source(menu).row(values);

describe("every source names a screen that exists", () => {
  it.each(SOURCES.map((entry) => entry.menu))("%s is in the admin menu", (menu) => {
    // A source pointing at a menu key nobody declares can never be reached:
    // `canReach` would answer false for everyone, and the table would silently
    // never be searched.
    expect(ADMIN_NAV_ITEMS.some((item) => item.key === menu)).toBe(true);
  });

  it("reads the id column, which every href is built from", () => {
    for (const entry of SOURCES) {
      expect(entry.select.split(",").map((column) => column.trim())).toContain("id");
    }
  });

  it("matches on at least one column, or the filter would be empty", () => {
    for (const entry of SOURCES) {
      expect(entry.match.length).toBeGreaterThan(0);
    }
  });
});

describe("the address a result opens", () => {
  it("selects a record with the same key its own list screen uses", () => {
    expect(row("services", { id: "1", name: "Web" }).href).toBe(
      "/admin/services?service=1",
    );
    expect(row("portfolio", { id: "2", title: "Clinic" }).href).toBe(
      "/admin/portfolio?project=2",
    );
    expect(row("case-studies", { id: "3", title: "Study" }).href).toBe(
      "/admin/case-studies?study=3",
    );
    expect(row("blog", { id: "4", title: "Post" }).href).toBe("/admin/blog?post=4");
    expect(row("pricing", { id: "5", name: "Starter" }).href).toBe(
      "/admin/pricing?plan=5",
    );
    expect(row("team", { id: "6", name: "Nitish" }).href).toBe("/admin/team?member=6");
    expect(row("media", { id: "7", filename: "logo.svg" }).href).toBe(
      "/admin/media?asset=7",
    );
  });

  it("uses a path, not a query, where the screen is a page per record", () => {
    expect(row("pages", { id: "8", title: "Home" }).href).toBe("/admin/pages/8");
    expect(row("leads", { id: "9", name: "Someone" }).href).toBe("/admin/leads/9");
  });

  it("carries a navigation link's menu, because that screen filters by one", () => {
    // Without the location the screen would open on the header and then fail
    // to find a footer link in it.
    expect(row("navigation", { id: "10", label: "Privacy", location: "footer_legal" }).href).toBe(
      "/admin/navigation?location=footer_legal&item=10",
    );
  });

  it("clears the FAQ page filter, which otherwise hides the question", () => {
    // The FAQ screen defaults to its first page and lists only that page's
    // questions. An empty scope means "every question", which is the only
    // filter guaranteed to contain the one being opened.
    expect(row("faqs", { id: "11", question: "Do you?" }).href).toBe(
      "/admin/faqs?scope=&faq=11",
    );
  });
});

describe("how a row is named", () => {
  it("falls back to the address when a lead left no name", () => {
    expect(row("leads", { id: "1", name: "", email: "someone@example.com" }).label).toBe(
      "someone@example.com",
    );
  });

  it("says what tells two similar rows apart", () => {
    expect(row("portfolio", { id: "1", title: "Clinic", client_name: "Acme", status: "draft" }).detail).toBe(
      "Acme · draft",
    );
    expect(row("services", { id: "1", name: "Web", slug: "web", status: "published" }).detail).toBe(
      "/web · published",
    );
  });

  it("marks a hidden FAQ and says nothing about a live one", () => {
    expect(row("faqs", { id: "1", question: "Q", is_active: true }).detail).toBe("");
    expect(row("faqs", { id: "1", question: "Q", is_active: false }).detail).toBe("hidden");
  });

  it("leaves out the parts a row has not got, rather than printing separators", () => {
    expect(row("leads", { id: "1", name: "Someone", company_name: "", status: "new" }).detail).toBe(
      "new",
    );
  });
});

describe("safeQuery", () => {
  it("keeps ordinary text alone", () => {
    expect(safeQuery("web development")).toBe("web development");
    expect(safeQuery("  spaced  ")).toBe("spaced");
  });

  it("strips what the filter reads as structure", () => {
    // A comma would start a second condition and a parenthesis would group
    // one, so a query containing either would be read as filters rather than
    // as text.
    expect(safeQuery("a,b")).not.toContain(",");
    expect(safeQuery("name.ilike.%x%,status.eq.published")).not.toContain(",");
    expect(safeQuery("(or(a,b))")).not.toMatch(/[(),]/);
    expect(safeQuery("back\\slash")).not.toContain("\\");
    expect(safeQuery("star*")).not.toContain("*");
  });

  it("leaves the percent sign, which is only a wildcard because we add it", () => {
    // The filter wraps the term in its own `%…%`, so a typed percent widens a
    // match at worst. Stripping it would silently change what somebody searched
    // for.
    expect(safeQuery("50% faster")).toBe("50% faster");
  });
});
