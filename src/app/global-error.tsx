"use client";

import { useEffect } from "react";
import "./globals.css";

/**
 * The last boundary.
 *
 * Only reached when the root layout itself fails, which means the theme
 * script, the fonts and the providers are all gone with it. That rules out
 * every shared component here — `BrandLoader` included, since its themed
 * variants come from a stylesheet this page cannot rely on having applied.
 *
 * So this file is deliberately the one place with its own colours: the two
 * halves of the name and the mark, drawn with the palette's own values, on a
 * background that is legible whether or not anything else loaded. It is a
 * lifeboat, not a page, and it should be reached roughly never.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[global-error]", error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "1.5rem",
          padding: "2rem 1.5rem",
          textAlign: "center",
          background: "#0b0e13",
          color: "#e8edf4",
          fontFamily:
            "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <span style={{ fontSize: "1.5rem", fontWeight: 600 }}>Rahvian</span>
          {/* eslint-disable-next-line @next/next/no-img-element -- no bundler
              guarantees at this point; a committed file and a plain tag are the
              only things certain to work. */}
          <img src="/brand/symbol-dark.png" alt="" width={40} height={40} />
          <span style={{ fontSize: "1.5rem", fontWeight: 600 }}>Technologies</span>
        </div>

        <h1 style={{ margin: 0, fontSize: "1.5rem", fontWeight: 600 }}>
          The site failed to load
        </h1>
        <p style={{ margin: 0, maxWidth: "34rem", lineHeight: 1.6, color: "#98a5b6" }}>
          Something went wrong before the page could start. Reloading usually
          clears it.
        </p>

        <button
          type="button"
          onClick={() => reset()}
          style={{
            border: 0,
            borderRadius: "0.5rem",
            background: "#2dd4bf",
            color: "#04201a",
            padding: "0.75rem 1.5rem",
            fontSize: "1rem",
            fontWeight: 500,
            cursor: "pointer",
          }}
        >
          Reload
        </button>

        {error.digest && (
          <p style={{ margin: 0, fontSize: "0.75rem", color: "#6b7a8d" }}>
            Reference {error.digest}
          </p>
        )}
      </body>
    </html>
  );
}
