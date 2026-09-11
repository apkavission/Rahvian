import { Suspense } from "react";
import type { Metadata } from "next";
import { BrandLogo } from "@/components/site/brand-logo";
import { getSiteSettings } from "@/lib/queries/site-settings";
import { LoginForm } from "./login-form";

/**
 * Never indexed, whatever the site-wide switch says.
 *
 * `buildMetadata` is deliberately not used here: it reads `seo_defaults` so a
 * page can inherit the admin's own crawl settings, and a login screen must not
 * be able to inherit its way into an index. This is the one place where a
 * hardcoded robots directive is the correct choice.
 */
export const metadata: Metadata = {
  title: "Sign in",
  robots: { index: false, follow: false, nocache: true },
};

export default async function LoginPage() {
  const settings = await getSiteSettings();

  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm">
        {/* The mark returns null on a database with no logo configured, so
            the company name is printed underneath rather than beside it —
            the screen is correct either way. */}
        <div className="flex flex-col items-center gap-4">
          {/* The mark, and "Admin" rather than the company name beside it: the
              name is in the mark, and what this screen has to say is which
              door this is. */}
          <BrandLogo height={40} decorative={false} />
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-text-subtle">
            Admin
          </p>
        </div>

        <h1 className="mt-10 text-center font-display text-2xl font-semibold">
          Sign in
        </h1>
        <p className="mt-2 text-center text-sm text-text-muted">
          This admin is for staff accounts. Ask an owner if you need one.
        </p>

        <div className="surface-raised mt-8 rounded-2xl border border-border p-7">
          {/*
            The form reads `next` from the query string, which makes it depend
            on request-time data. The boundary keeps that dependency local, so
            the logo and the heading still render while it resolves.
          */}
          <Suspense fallback={<FormSkeleton />}>
            <LoginForm />
          </Suspense>
        </div>
      </div>
    </main>
  );
}

/** Matches the form's height, so the card does not jump when it arrives. */
function FormSkeleton() {
  return (
    <div className="space-y-5" aria-hidden>
      <div className="space-y-2">
        <div className="h-4 w-14 rounded bg-surface-2" />
        <div className="h-11 rounded-md bg-surface-2" />
      </div>
      <div className="space-y-2">
        <div className="h-4 w-20 rounded bg-surface-2" />
        <div className="h-11 rounded-md bg-surface-2" />
      </div>
      <div className="h-11 rounded-lg bg-surface-2" />
    </div>
  );
}
