import { BrandLogo } from "@/components/site/brand-logo";
import { getBrandLogos } from "@/lib/queries/brand";
import { HeaderNav } from "@/components/site/header-nav";
import { getNavigation } from "@/lib/queries/navigation";
import { getSiteSettings } from "@/lib/queries/site-settings";

/**
 * Header data boundary.
 *
 * A Server Component so the navigation and company name are fetched on the
 * server and present in the HTML — a menu that only appears after hydration
 * is invisible to crawlers and flickers for the visitor.
 *
 * The interactive shell lives in `header-nav.tsx`, which is the only part that
 * needs to be a Client Component.
 */
export async function Header() {
  const [items, settings, logos] = await Promise.all([
    getNavigation("header"),
    getSiteSettings(),
    /* Read here as well as inside `BrandLogo` — both go through the same
       cached query, so it is one database read either way, and the header
       needs to know whether a mark exists before it decides to print a name. */
    getBrandLogos(),
  ]);

  return (
    <HeaderNav
      items={items}
      companyName={settings?.company_name ?? "Rahvian"}
      /* Only when there is no mark to show instead. `BrandLogo` renders
         nothing on a database with no logo, and a header with an empty
         corner is worse than one with a name in it. */
      showName={!logos.light && !logos.dark}
      // The logo is resolved here rather than inside the client shell: it needs
      // a database read, and passing the rendered element keeps `header-nav`
      // free of any data dependency.
      logo={<BrandLogo height={56} />}
      ctaLabel="Start Your Project"
      ctaHref="/request-a-quote"
    />
  );
}
