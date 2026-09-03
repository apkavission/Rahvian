"use client";

import { useCallback, useState } from "react";
import { Monitor, Smartphone, Tablet } from "lucide-react";
import type { EmailSample } from "@/lib/email/samples";

/**
 * Every email this application sends, at the widths people read them on.
 *
 * ---------------------------------------------------------------------------
 * **The point is the narrow one.** Most transactional email is read on a phone,
 * and an email layout is the one place where a browser's rules do not apply:
 * Gmail rewrites the document, Outlook renders through Word, and a design that
 * relies on anything modern collapses. The frame these are built in is tables
 * and inline styles with a single media query, and this is where somebody can
 * see whether that actually holds at 360 pixels.
 *
 * ---------------------------------------------------------------------------
 * **An iframe, not a div.**
 *
 * The message carries its own `<style>` block and a full document, and dropping
 * that into the admin would let the panel's stylesheet reach into it — so it
 * would look better here than in anybody's inbox, which is the opposite of
 * useful. `srcDoc` gives it its own document.
 *
 * **The sandbox allows same-origin and nothing else.** Without `allow-scripts`
 * no code in that document can run at all, so there is nothing for same-origin
 * to hand over; what it buys is the ability to measure the rendered height from
 * here. That matters: a fixed height either cuts the email off — which it did,
 * halfway down the enquiry summary — or leaves a field of white under a short
 * one, and neither is what somebody is here to look at.
 */

const WIDTHS = [
  { key: "phone", label: "Phone", width: 360, icon: Smartphone },
  { key: "tablet", label: "Tablet", width: 600, icon: Tablet },
  { key: "desktop", label: "Desktop", width: 800, icon: Monitor },
] as const;

export function EmailPreview({ samples }: { samples: EmailSample[] }) {
  const [chosen, setChosen] = useState(samples[0]?.key ?? "");
  const [width, setWidth] = useState<number>(360);
  const [asText, setAsText] = useState(false);
  const [height, setHeight] = useState(900);

  const sample = samples.find((one) => one.key === chosen) ?? samples[0];

  /**
   * Grow the frame to whatever the email turned out to be.
   *
   * Measured on load rather than guessed. A narrow width makes the same message
   * much taller, so the height has to follow the width as well as the message —
   * which is why the iframe is keyed on both and this runs again each time.
   *
   * If the measurement fails for any reason the last height stands, which is a
   * scrollable frame rather than a blank one.
   */
  const measure = useCallback((frame: HTMLIFrameElement | null) => {
    if (!frame) return;

    const fit = () => {
      const body = frame.contentDocument?.body;
      if (body?.scrollHeight) setHeight(Math.max(400, body.scrollHeight + 24));
    };

    /*
      Both, and both are needed.

      `srcDoc` on a small document can finish parsing before this ref callback
      runs, so the load event has already gone and the listener alone never
      fires — which is exactly what happened on the first email shown: every
      other width measured correctly and the one on screen at load kept the
      placeholder height.
    */
    frame.addEventListener("load", fit);
    fit();
  }, []);

  if (!sample) {
    return (
      <p className="rounded-xl border border-dashed border-border p-8 text-sm text-text-muted">
        This application sends no email.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <section>
        <h2 className="font-display text-lg font-semibold">What gets sent</h2>
        <p className="measure mt-1 text-sm text-text-muted">
          Built by the same code that sends the real thing, including the copy
          stored in the database — so what is on screen is what arrives. Nothing
          here sends anything.
        </p>

        <ul className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          {samples.map((one) => (
            <li key={one.key}>
              <button
                type="button"
                onClick={() => setChosen(one.key)}
                aria-pressed={one.key === sample.key}
                className={`h-full w-full rounded-xl border p-3 text-left transition-colors ${
                  one.key === sample.key
                    ? "border-accent bg-accent-soft/40"
                    : "border-border bg-surface hover:bg-surface-2"
                }`}
              >
                <p className="text-sm font-medium">{one.name}</p>
                <p className="mt-1 text-xs text-text-subtle">{one.when}</p>
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs text-text-subtle">Subject line</p>
            <p className="truncate font-medium">{sample.subject}</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {WIDTHS.map((size) => {
              const Icon = size.icon;

              return (
                <button
                  key={size.key}
                  type="button"
                  onClick={() => setWidth(size.width)}
                  aria-pressed={width === size.width}
                  className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm transition-colors ${
                    width === size.width && !asText
                      ? "border-accent bg-accent-soft/40"
                      : "border-border hover:bg-surface-2"
                  }`}
                >
                  <Icon className="size-3.5" aria-hidden />
                  {size.label}
                  <span className="font-mono text-[11px] text-text-subtle">{size.width}</span>
                </button>
              );
            })}

            {/*
              The plain-text half is not a fallback nobody sees.

              Some people read mail as text by choice, some clients render it
              when the HTML fails, and a text part that is empty or garbled is
              the usual reason a well-designed email lands in spam.
            */}
            <button
              type="button"
              onClick={() => setAsText((was) => !was)}
              aria-pressed={asText}
              className={`rounded-lg border px-3 py-1.5 text-sm transition-colors ${
                asText ? "border-accent bg-accent-soft/40" : "border-border hover:bg-surface-2"
              }`}
            >
              Plain text
            </button>
          </div>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-border bg-surface-2 p-4">
          {asText ? (
            <pre className="mx-auto max-w-[680px] whitespace-pre-wrap rounded-xl bg-surface p-6 font-mono text-xs leading-relaxed">
              {sample.text}
            </pre>
          ) : (
            <iframe
              key={`${sample.key}-${width}`}
              ref={measure}
              title={`${sample.name}, at ${width} pixels`}
              srcDoc={sample.html}
              sandbox="allow-same-origin"
              style={{ width, height }}
              className="mx-auto block rounded-xl border border-border bg-white"
            />
          )}
        </div>

        <p className="text-xs text-text-subtle">
          The logo is shown here from <code>/brand/logo-email.png</code>. In a
          real message it travels inside the email as an attachment, so it
          appears without anybody pressing “show images”.
        </p>
      </section>
    </div>
  );
}
