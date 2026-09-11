import type { Metadata, Viewport } from "next";
import { JetBrains_Mono, Montserrat, Poppins } from "next/font/google";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { BusyProvider } from "@/components/brand/busy-overlay";
import { ConfirmProvider } from "@/components/ui/confirm-dialog";
import { ToastProvider } from "@/components/ui/toast";
import { SITE_URL } from "@/lib/env";
import { getSeoDefaults } from "@/lib/queries/seo";
import { themeInitScript } from "@/lib/theme/constants";
import "./globals.css";

/*
  The two faces the brand sheet names: "Montserrat / Poppins (Modern · Clean ·
  Professional)" for the name, "Poppins Medium / Regular (Clean & Readable)"
  for everything else.

  The wordmark in the logo is set in Montserrat, so the headings on the site
  being set in anything else is the small wrongness that makes a page look
  assembled rather than designed — it was Sora and Inter until the identity
  arrived, which were chosen before there was one to follow.

  Weights are named rather than taken as a variable range: Poppins is used at
  400 and 500 for prose and 600 for a strong label, and shipping nine weights
  of a geometric face to save typing three is a slower page for no reason.
*/
const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  variable: "--font-heading",
  display: "swap",
});

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-body",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono-face",
  display: "swap",
});

/**
 * Root metadata, from the database.
 *
 * Deliberately declares no `title.template`. The template string is admin
 * content and is applied inside `buildMetadata`, which every route uses. A
 * template here as well would apply twice, and `/services` would render as
 * "Software Development Services | Rahvian Technologies Private Limited | Rahvian".
 *
 * What this does own is `metadataBase` — the single value every canonical URL,
 * sitemap entry and Open Graph tag is resolved against.
 */
export async function generateMetadata(): Promise<Metadata> {
  const defaults = await getSeoDefaults();

  return {
    metadataBase: new URL(SITE_URL),
    title: defaults?.default_title ?? "Rahvian",
    description: defaults?.default_description ?? undefined,
    robots: defaults?.site_noindex
      ? { index: false, follow: false }
      : { index: true, follow: true },
  };
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fcfcfd" },
    { media: "(prefers-color-scheme: dark)", color: "#07090c" },
  ],
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      /* Tells Next that the smooth scrolling in `globals.css` is deliberate, so
         it suppresses it for the duration of a route change. Without it, Next
         waits on an animated scroll to the top on every navigation — which it
         warns about on every build, and which is long enough that a click on a
         menu link appears not to have worked. Within a page, an anchor link
         still scrolls smoothly; that is what the CSS rule was added for and it
         is untouched. */
      data-scroll-behavior="smooth"
      className={`${montserrat.variable} ${poppins.variable} ${jetbrainsMono.variable}`}
    >
      <head>
        {/*
          Must run before the first paint, so it cannot be a component effect.
          Sets data-theme on <html> from localStorage or the OS preference.
          suppressHydrationWarning above is required: this script mutates the
          element that React is about to hydrate.
        */}
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />

        {/*
          The loader's symbol, fetched early.

          The brand loader has to paint complete in the frame it appears, and
          the first wait of a session is exactly when the symbol has never been
          requested — so without this the name arrives with a hole between its
          halves for as long as the file takes. Found by watching a real
          submit, not by reading the code.

          One variant per colour scheme, so a visitor downloads the mark they
          will actually see rather than both.
        */}
        <link
          rel="preload"
          as="image"
          href="/brand/symbol-light.png"
          media="(prefers-color-scheme: light)"
        />
        <link
          rel="preload"
          as="image"
          href="/brand/symbol-dark.png"
          media="(prefers-color-scheme: dark)"
        />
      </head>
      <body>
        {/*
          Organization and WebSite JSON-LD live in the public layout, not here.
          They describe the marketing site, and the admin and portal routes that
          also mount this layout have no business claiming to be it.
        */}
        {/* Toasts and confirmations live above the theme provider's children so
            every surface in the application — public site, admin, portal —
            reports success, failure and "are you sure" through the same two
            components. `window.confirm` is never used anywhere. */}
        <ThemeProvider>
          <ToastProvider>
            <ConfirmProvider>
              <BusyProvider>{children}</BusyProvider>
            </ConfirmProvider>
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
