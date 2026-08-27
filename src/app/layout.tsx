import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono, Sora } from "next/font/google";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { BusyProvider } from "@/components/brand/busy-overlay";
import { ConfirmProvider } from "@/components/ui/confirm-dialog";
import { ToastProvider } from "@/components/ui/toast";
import { SITE_URL } from "@/lib/env";
import { getSeoDefaults } from "@/lib/queries/seo";
import { themeInitScript } from "@/lib/theme/constants";
import "./globals.css";

const sora = Sora({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-heading",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
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
 * "Software Development Services | Apka Saathi Private Limited | Apka Vission".
 *
 * What this does own is `metadataBase` — the single value every canonical URL,
 * sitemap entry and Open Graph tag is resolved against.
 */
export async function generateMetadata(): Promise<Metadata> {
  const defaults = await getSeoDefaults();

  return {
    metadataBase: new URL(SITE_URL),
    title: defaults?.default_title ?? "Apka Vission",
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
      className={`${sora.variable} ${inter.variable} ${jetbrainsMono.variable}`}
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
          href="/brand/symbol-light.svg"
          media="(prefers-color-scheme: light)"
        />
        <link
          rel="preload"
          as="image"
          href="/brand/symbol-dark.svg"
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
