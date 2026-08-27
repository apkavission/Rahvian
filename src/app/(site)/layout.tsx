import { JsonLd } from "@/components/seo/json-ld";
import { Footer } from "@/components/site/footer";
import { Header } from "@/components/site/header";
import {
  buildOrganizationSchema,
  buildWebSiteSchema,
} from "@/lib/structured-data";

/**
 * Layout for every public page.
 *
 * Separated from the root layout by a route group so that `/admin` and the
 * client portal do not inherit the marketing header and footer.
 *
 * Organization and WebSite are emitted here rather than per route. Both
 * describe the site as a whole, so repeating them on each page would say the
 * same thing many times, and the `@id` values let a page's own graph point
 * back at them instead.
 */
export default async function SiteLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const [organization, website] = await Promise.all([
    buildOrganizationSchema(),
    buildWebSiteSchema(),
  ]);

  return (
    <div className="flex min-h-dvh flex-col">
      <JsonLd data={organization} />
      <JsonLd data={website} />

      {/*
        Skip link. The header carries a services dropdown, so without this a
        keyboard or screen-reader user traverses the whole menu again on every
        page before reaching the content.

        Off-screen until focused rather than `display:none`, because a hidden
        element cannot receive focus and the link would never appear.

        The padding sits under the same variant as `not-sr-only`: that utility
        resets padding to zero, and stating it unconditionally would collapse
        the pill to the width of its text.
      */}
      <a
        href="#main"
        className="sr-only rounded-lg bg-accent text-sm font-medium text-accent-fg focus-visible:not-sr-only focus-visible:absolute focus-visible:left-4 focus-visible:top-4 focus-visible:z-100 focus-visible:p-[0.625rem_1.25rem]"
      >
        Skip to content
      </a>

      <Header />
      <main id="main" tabIndex={-1} className="flex-1">
        {children}
      </main>
      <Footer />
    </div>
  );
}
