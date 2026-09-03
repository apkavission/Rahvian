import type { Metadata } from "next";
import Link from "next/link";
import { PreviewPane } from "@/components/admin/preview-pane";
import { requireMenu } from "@/lib/auth/session";
import { getAdminNavItems } from "@/lib/queries/navigation-admin";
import {
  DEFAULT_NAV_LOCATION,
  isNavLocation,
  navDisplayOrder,
  navParentOptions,
  navToValues,
  NAV_LOCATIONS,
} from "@/lib/records/navigation";
import { cn } from "@/lib/utils";
import { NavItemEditor } from "./nav-item-editor";
import { NavList } from "./nav-list";
import { NewNavItemForm } from "./new-nav-item-form";

export const metadata: Metadata = {
  title: "Navigation",
  robots: { index: false, follow: false, nocache: true },
};

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/**
 * The navigation screen.
 *
 * The same three columns as every other content list, with two differences
 * that come from what a menu is rather than from taste.
 *
 * The first is the menu filter on top. `nav_items.sort_order` is one number
 * across five menus, so listing every link at once would mean the arrows
 * swapping a header link with a footer one — two rows that never appear
 * together, leaving the arrows looking broken in both places. Filtered to one
 * menu, every arrow moves something the person can see move.
 *
 * The second is that the list is a tree. A link nested under another is
 * indented and moves only among the other links of that dropdown, which is
 * what makes an arrow do what it points at.
 *
 * There is no preview of "one link" because there is no such thing: a menu is
 * read as a whole, and the fact worth checking — whether the header still fits
 * on one line — is invisible until the other links are beside it. So the
 * preview is the real header, or the real footer, whichever this menu is part
 * of.
 */
export default async function NavigationScreen({ searchParams }: Props) {
  await requireMenu("navigation");

  const query = await searchParams;

  const location = isNavLocation(query.location) ? query.location : DEFAULT_NAV_LOCATION;
  const current = NAV_LOCATIONS.find((entry) => entry.value === location)!;

  const rows = await getAdminNavItems();

  const display = navDisplayOrder(rows.filter((row) => row.location === location));

  const requested = typeof query.item === "string" ? query.item : null;
  const selected =
    display.find((entry) => entry.row.id === requested)?.row ?? display[0]?.row ?? null;

  // Built from every row rather than from this menu's, because the form lets
  // the menu be changed — and the parents on offer must be the ones in the
  // menu the link is in now, not the one it might move to next.
  const parents = selected
    ? navParentOptions(rows, selected.location, selected.id)
    : [];

  const live = display.filter((entry) => entry.row.is_active).length;

  return (
    <div className="mx-auto w-full max-w-7xl">
      <header>
        <h1 className="font-display text-2xl font-semibold">Navigation</h1>
        <p className="measure mt-2 text-sm leading-relaxed text-text-muted">
          The links across the top of the site and down the footer. Nothing here
          checks that a page exists at the address — a link is a promise about
          where something is, and this screen only records the promise.
        </p>
      </header>

      {/*
        The menu filter.

        Links rather than a dropdown, and the same pattern the FAQ screen uses:
        the counts are worth seeing at once, and a filter in the address bar is
        one that can be sent to someone.
      */}
      <nav aria-label="Choose a menu" className="mt-7 -mx-1 overflow-x-auto px-1 pb-1">
        <ul className="flex w-max gap-2">
          {NAV_LOCATIONS.map((entry) => (
            <li key={entry.value}>
              <Link
                href={`/admin/navigation?location=${entry.value}`}
                aria-current={entry.value === location ? "page" : undefined}
                className={cn(
                  "inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm transition-colors",
                  entry.value === location
                    ? "border-accent bg-accent-soft font-semibold text-accent"
                    : "border-border bg-surface text-text-muted hover:border-border-strong hover:text-text",
                )}
              >
                {entry.label}
                <span
                  className={cn(
                    "font-mono text-[0.65rem]",
                    rows.some((row) => row.location === entry.value)
                      ? "text-text-muted"
                      : "text-text-subtle",
                  )}
                >
                  {rows.filter((row) => row.location === entry.value).length}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <p className="measure mt-4 text-sm leading-relaxed text-text-muted">{current.note}</p>

      <div className="mt-8 grid gap-8 xl:grid-cols-[19rem_minmax(0,1fr)_minmax(0,1fr)]">
        <div className="min-w-0 xl:sticky xl:top-24 xl:self-start">
          <h2 className="font-mono text-[0.65rem] uppercase tracking-[0.16em] text-text-subtle">
            In the order shown · {live} of {display.length} live
          </h2>
          <div className="mt-3">
            <NavList
              items={display.map((entry) => ({
                id: entry.row.id,
                label: entry.row.label,
                href: entry.row.href,
                isActive: entry.row.is_active,
                depth: entry.depth,
                group: entry.row.parent_id ?? "",
                childCount: rows.filter((row) => row.parent_id === entry.row.id).length,
              }))}
              selectedId={selected?.id ?? null}
              emptyLabel={`Nothing in the ${current.label.toLowerCase()} menu yet. Add the first link below.`}
            />
            <NewNavItemForm location={location} locationLabel={current.label} />
          </div>
        </div>

        <div className="min-w-0">
          {selected ? (
            <div className="surface-raised rounded-2xl border border-border p-6">
              {/*
                Keyed on the link, so selecting another one remounts the form.
                Without it React would reuse the component and keep the first
                link's words in state — the editor would show one address under
                another's label.
              */}
              <NavItemEditor
                key={selected.id}
                id={selected.id}
                values={navToValues(selected)}
                parents={parents}
              />
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-border bg-surface-2/40 p-8">
              <h2 className="font-display text-lg font-semibold">
                Nothing in this menu yet
              </h2>
              <p className="measure mt-3 text-sm leading-relaxed text-text-muted">
                Add a link on the left and it will open here. New links start
                hidden, so nothing half-typed reaches the menu every visitor
                sees on every page.
              </p>
            </div>
          )}
        </div>

        {/*
          The preview, beside the form rather than behind a link.

          It renders the real header or the real footer, so what is being
          checked is the thing itself: whether the labels still fit on one
          line, whether the dropdown is the right length, whether the footer
          column reads as a list rather than as leftovers.
        */}
        <div className="min-w-0 xl:sticky xl:top-24 xl:self-start">
          <PreviewPane
            path={`/admin/preview/navigation?location=${location}`}
            note="The menu as visitors see it — hidden links are left out, exactly as they are on the site."
          />
        </div>
      </div>
    </div>
  );
}
