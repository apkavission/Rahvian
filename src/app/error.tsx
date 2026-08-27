"use client";

import { useEffect, useTransition } from "react";
import { BrandLoader, BrandSpinner } from "@/components/brand/brand-loader";
import { Button, ButtonLink } from "@/components/ui/button";

/**
 * The error boundary for every route below the root layout.
 *
 * Covers what `loading.tsx` cannot: a `GET` that threw, a Server Action that
 * failed on the way back, a render that hit a null it did not expect.
 *
 * Same overlay as the loader and the not-found screen, because there is one
 * loader in this application and every state that interrupts a page uses it.
 * Retrying is one button, and it shows the compact spinner while the retry
 * runs, so a slow recovery does not read as a dead click.
 *
 * `digest` is the only detail shown. It is the id the same failure carries in
 * the server log, which makes a report actionable; the message itself is never
 * printed, because it can carry internals a visitor should not see.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [retrying, startRetry] = useTransition();

  useEffect(() => {
    console.error("[error-boundary]", error);
  }, [error]);

  return (
    <BrandLoader overlay size="lg" label="Something went wrong" showLabel>
      <div className="text-center">
        <h1 className="font-display text-3xl font-semibold sm:text-4xl">
          Something went wrong at our end
        </h1>
        <p className="measure mx-auto mt-4 leading-relaxed text-text-muted">
          This is our problem, not yours. Trying again often works — the failure
          is usually a moment rather than a state.
        </p>

        <div className="mt-9 flex flex-wrap justify-center gap-3">
          <Button size="lg" onClick={() => startRetry(() => reset())} disabled={retrying}>
            {retrying ? (
              <>
                <BrandSpinner />
                Trying again
              </>
            ) : (
              "Try again"
            )}
          </Button>
          <ButtonLink href="/" size="lg" variant="secondary">
            Back to the home page
          </ButtonLink>
        </div>

        {error.digest && (
          <p className="mt-8 font-mono text-xs text-text-subtle">
            Reference {error.digest}
          </p>
        )}
      </div>
    </BrandLoader>
  );
}
