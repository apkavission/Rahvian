import { BrandLogo } from "@/components/site/brand-logo";
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
  const [items, settings] = await Promise.all([
    getNavigation("header"),
    getSiteSettings(),
  ]);

  return (
    <HeaderNav
      items={items}
      companyName={settings?.company_name ?? "Apka Saathi"}
      // The logo is resolved here rather than inside the client shell: it needs
      // a database read, and passing the rendered element keeps `header-nav`
      // free of any data dependency.
      logo={<BrandLogo height={30} />}
      ctaLabel="Start Your Project"
      ctaHref="/request-a-quote"
    />
  );
}
