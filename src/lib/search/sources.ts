import type { MenuKey } from "@/components/admin/nav";
import type { Database } from "@/types/database";

/**
 * What the command palette can find, and how each kind is named and addressed.
 *
 * Pure, and separate from the Server Action that runs the queries, for two
 * reasons. A `"use server"` module may only export async functions, so a table
 * of descriptors cannot live in one. And the part most worth pinning with a
 * test is exactly the part with no database in it: the address each result
 * links to. A palette that opens a record at an address its own list screen
 * does not use sends somebody to a screen that selects nothing — and it looks
 * like the record is missing.
 */

/**
 * A table the palette may read.
 *
 * Named as the union rather than as `string` so that a typo in `SOURCES` is a
 * compile error rather than a source that silently returns nothing. It is also
 * what lets `from()` be called with a variable at all — the generated client
 * types the argument as this union, and a plain string does not narrow to it.
 */
export type SearchTable = keyof Database["company"]["Tables"];

export interface SearchHit {
  /** Stable per result, so React can key the list. */
  id: string;
  /** The screen this belongs to. Used for the group heading and the icon. */
  menu: MenuKey;
  /** What the thing is called. */
  label: string;
  /** State, address, or whatever tells two similar rows apart. May be empty. */
  detail: string;
  /** Where selecting it goes. */
  href: string;
}

/** One searchable kind: the screen it needs, and how to find and name a row. */
export interface Source {
  menu: MenuKey;
  table: SearchTable;
  /** Columns to read. The first is always `id`. */
  select: string;
  /** Columns matched against the query, joined into one `or` filter. */
  match: string[];
  row: (row: Record<string, unknown>) => { label: string; detail: string; href: string };
}

/** A column value as a string, or empty. `jsonb` and `null` both read as "". */
export const text = (value: unknown): string =>
  typeof value === "string" ? value : "";

/**
 * Every kind the palette can find.
 *
 * Ordered as the sidebar is, so the results read in the order the person
 * already knows. Each `href` is the same address the screen's own list links
 * to — a result that opened a record differently from the list would be a
 * second way to reach one thing, and the two would drift.
 */
export const SOURCES: Source[] = [
  {
    menu: "leads",
    table: "leads",
    select: "id, name, company_name, email, status",
    match: ["name", "company_name", "email"],
    row: (r) => ({
      label: text(r.name) || text(r.email),
      detail: [text(r.company_name), text(r.status)].filter(Boolean).join(" · "),
      href: `/admin/leads/${text(r.id)}`,
    }),
  },
  {
    menu: "pages",
    table: "pages",
    select: "id, title, slug, status",
    match: ["title", "slug"],
    row: (r) => ({
      label: text(r.title),
      detail: [`/${text(r.slug)}`, text(r.status)].filter(Boolean).join(" · "),
      href: `/admin/pages/${text(r.id)}`,
    }),
  },
  {
    menu: "navigation",
    table: "nav_items",
    select: "id, label, href, location",
    match: ["label", "href"],
    row: (r) => ({
      label: text(r.label),
      detail: text(r.href),
      href: `/admin/navigation?location=${text(r.location)}&item=${text(r.id)}`,
    }),
  },
  {
    menu: "services",
    table: "services",
    select: "id, name, slug, status",
    match: ["name", "slug"],
    row: (r) => ({
      label: text(r.name),
      detail: [`/${text(r.slug)}`, text(r.status)].filter(Boolean).join(" · "),
      href: `/admin/services?service=${text(r.id)}`,
    }),
  },
  {
    menu: "portfolio",
    table: "projects",
    select: "id, title, slug, client_name, status",
    match: ["title", "slug", "client_name"],
    row: (r) => ({
      label: text(r.title),
      detail: [text(r.client_name), text(r.status)].filter(Boolean).join(" · "),
      href: `/admin/portfolio?project=${text(r.id)}`,
    }),
  },
  {
    menu: "case-studies",
    table: "case_studies",
    select: "id, title, slug, client_name, status",
    match: ["title", "slug", "client_name"],
    row: (r) => ({
      label: text(r.title),
      detail: [text(r.client_name), text(r.status)].filter(Boolean).join(" · "),
      href: `/admin/case-studies?study=${text(r.id)}`,
    }),
  },
  {
    /*
      Searched by who said it and where they work, and by the words themselves.

      The quote is in `match` because that is how somebody actually looks for
      one — you remember a phrase, not the name of the person who said it. It is
      not in `select`: a quote is long enough to make the result list unreadable,
      and the detail line is more useful as the state of the thing.
    */
    menu: "testimonials",
    table: "testimonials",
    select: "id, author_name, company_name, status, consent_confirmed",
    match: ["author_name", "company_name", "quote"],
    row: (r) => ({
      label: text(r.author_name),
      detail: [
        text(r.company_name),
        r.consent_confirmed === true ? text(r.status) : "no consent recorded",
      ]
        .filter(Boolean)
        .join(" · "),
      href: `/admin/testimonials?quote=${text(r.id)}`,
    }),
  },
  {
    menu: "blog",
    table: "blog_posts",
    select: "id, title, slug, status",
    match: ["title", "slug", "excerpt"],
    row: (r) => ({
      label: text(r.title),
      detail: [`/${text(r.slug)}`, text(r.status)].filter(Boolean).join(" · "),
      href: `/admin/blog?post=${text(r.id)}`,
    }),
  },
  {
    menu: "pricing",
    table: "pricing_plans",
    select: "id, name, tagline, status",
    match: ["name", "tagline"],
    row: (r) => ({
      label: text(r.name),
      detail: [text(r.tagline), text(r.status)].filter(Boolean).join(" · "),
      href: `/admin/pricing?plan=${text(r.id)}`,
    }),
  },
  {
    menu: "faqs",
    table: "faqs",
    select: "id, question, is_active",
    match: ["question", "answer"],
    row: (r) => ({
      label: text(r.question),
      detail: r.is_active === true ? "" : "hidden",
      // No scope, so the screen falls back to its first page filter and then
      // selects this question — the same thing a link to one question does.
      href: `/admin/faqs?scope=&faq=${text(r.id)}`,
    }),
  },
  {
    menu: "team",
    table: "team_members",
    select: "id, name, role, status",
    match: ["name", "role"],
    row: (r) => ({
      label: text(r.name),
      detail: [text(r.role), text(r.status)].filter(Boolean).join(" · "),
      href: `/admin/team?member=${text(r.id)}`,
    }),
  },
  {
    menu: "media",
    table: "media",
    select: "id, filename, alt_text, folder",
    match: ["filename", "alt_text", "folder"],
    row: (r) => ({
      label: text(r.filename),
      detail: [text(r.folder), text(r.alt_text)].filter(Boolean).join(" · "),
      href: `/admin/media?asset=${text(r.id)}`,
    }),
  },
];

/** Below this a search matches most of the database and helps nobody. */
export const MIN_QUERY = 2;

/** Per source. Ten of one kind is a list screen's job, not a palette's. */
export const PER_SOURCE = 5;

/**
 * Escape what PostgREST's `or` filter treats as structure.
 *
 * Commas separate the conditions and parentheses group them, so a query
 * containing either would be read as more filters rather than as text. They
 * are dropped rather than escaped: nobody searches for a comma, and a filter
 * assembled from unescaped input is the shape an injection takes here.
 */
export function safeQuery(query: string): string {
  return query.replace(/[,()*\\]/g, " ").trim();
}

