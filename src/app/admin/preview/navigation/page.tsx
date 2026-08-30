import type { Metadata } from "next";
import { Footer } from "@/components/site/footer";
import { Header } from "@/components/site/header";
import { requireMenu } from "@/lib/auth/session";
import { DEFAULT_NAV_LOCATION, isNavLocation, NAV_LOCATIONS } from "@/lib/records/navigation";

export const metadata: Metadata = {
  title: "Navigation preview",
  robots: { index: false, follow: false, nocache: true },
};

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/**
 * The menu as visitors meet it.
 *
 * The real `Header` and the real `Footer`, not a drawing of them. A menu has
 * exactly one interesting failure — it stops fitting — and a mock-up that
 * lists the labels in a column is the one rendering guaranteed never to show
 * it.
 *
 * **What this pane cannot show is the dropdown**, and it used to say it could.
 * The preview column is about 450px wide on a 1600px screen, and the header
 * swaps to its phone form below `lg` — 1024px — so there is no desktop nav in
 * here to hover, at either of the pane's two widths. The copy said "hover a
 * link with a dropdown to open it", which was an instruction nobody could
 * follow; found in a browser click-through on 2026-08-28. It now says what the
 * pane actually shows, and points at the button that opens the real page.
 *
 * These are the public components, so they read through the cached anonymous
 * query and hidden links are absent — which is the truth being previewed.
 * Every navigation action clears the `navigation` tag before the pane reloads,
 * so a save is visible on the next refresh rather than a deploy later.
 *
 * It sits outside the `(dashboard)` group so the admin chrome does not wrap it.
 */
export default async function NavigationPreview({ searchParams }: Props) {
  await requireMenu("navigation");

  const query = await searchParams;
  const location = isNavLocation(query.location) ? query.location : DEFAULT_NAV_LOCATION;
  const entry = NAV_LOCATIONS.find((candidate) => candidate.value === location)!;

  const isFooter = location.startsWith("footer");

  return (
    <div className="min-h-dvh bg-bg">
      <div className="border-b border-border bg-surface-2 px-4 py-2">
        <p className="font-mono text-[0.65rem] uppercase tracking-[0.14em] text-text-subtle">
          Preview · {entry.label}
        </p>
      </div>

      {location === "mobile" ? (
        <div className="mx-auto max-w-2xl px-5 py-16 sm:px-8">
          <h1 className="font-display text-lg font-semibold">Nothing renders this menu</h1>
          <p className="measure mt-3 text-sm leading-relaxed text-text-muted">
            The phone menu shows the header links, so there is nothing to
            preview here and a link stored under this menu appears nowhere on
            the site. Anything listed beside this can safely be moved to the
            header or deleted.
          </p>
        </div>
      ) : isFooter ? (
        <Footer />
      ) : (
        <>
          <Header />
          <div className="container-page py-16">
            <p className="measure text-sm leading-relaxed text-text-muted">
              The page below the header, standing in for whatever the visitor
              came to read. This pane is narrower than a laptop, so the header
              shows its phone form — press the menu button to open the panel.
            </p>
            <p className="measure mt-3 text-sm leading-relaxed text-text-subtle">
              The dropdown only exists from 1024px up, which is wider than this
              pane gets. To see it, open the site itself with the arrow above.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
