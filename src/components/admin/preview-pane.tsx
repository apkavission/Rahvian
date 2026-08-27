"use client";

import { useCallback, useEffect, useState } from "react";
import { ExternalLink, Monitor, RefreshCw, Smartphone } from "lucide-react";
import { SkeletonCardGrid, SkeletonRegion } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/**
 * The event a save fires when it has finished.
 *
 * A plain window event rather than shared state, because the editor and the
 * preview are siblings with a server-rendered page between them. Lifting the
 * state would mean making the whole screen a client component to pass a number
 * down two levels.
 */
export const PREVIEW_REFRESH_EVENT = "preview:refresh";

export function requestPreviewRefresh() {
  window.dispatchEvent(new CustomEvent(PREVIEW_REFRESH_EVENT));
}

/**
 * The record as it will look, beside the form that changes it.
 *
 * It renders the real thing in an iframe — the same components the public
 * route uses — rather than a second implementation. A preview that is only
 * approximately the page gets trusted and is then wrong.
 *
 * It refreshes when a save reports success, which is what makes an edit
 * visible without leaving the screen. Not on every keystroke: each refresh is a
 * server render of the whole page, and a preview that flickers while you type
 * is worse than one that settles when you save.
 *
 * The width toggle is not decoration. Responsive is a release blocker for this
 * site (spec §29), and the person writing the copy is the one who should see
 * that their heading wraps badly on a phone.
 *
 * One component for every admin screen that has a preview, taking the path as a
 * prop. The pages builder and the content lists show different things in it;
 * they must not show them differently.
 */
export function PreviewPane({
  path,
  note,
}: {
  /** The preview route to load. A cache-busting parameter is added here. */
  path: string;
  /** One line under the frame, saying what this preview does and does not show. */
  note?: string;
}) {
  const [width, setWidth] = useState<"phone" | "full">("full");
  const [nonce, setNonce] = useState(0);

  /*
    Which src has finished loading, rather than a boolean.

    A refresh changes `src`, which remounts the frame — and a boolean set back
    to false on every render would flicker, while one never reset would leave
    the skeleton hidden through the second load. Comparing the loaded src to
    the current one is the same fact without either failure.
  */
  const [loadedSrc, setLoadedSrc] = useState<string | null>(null);

  const refresh = useCallback(() => setNonce((current) => current + 1), []);

  useEffect(() => {
    window.addEventListener(PREVIEW_REFRESH_EVENT, refresh);
    return () => window.removeEventListener(PREVIEW_REFRESH_EVENT, refresh);
  }, [refresh]);

  const src = nonce
    ? `${path}${path.includes("?") ? "&" : "?"}v=${nonce}`
    : path;

  return (
    <section aria-labelledby="preview-heading" className="min-w-0">
      <div className="flex flex-wrap items-center gap-2">
        <h2
          id="preview-heading"
          className="mr-auto font-mono text-[0.65rem] uppercase tracking-[0.16em] text-text-subtle"
        >
          Preview
        </h2>

        <div className="flex rounded-lg border border-border p-0.5">
          <WidthButton
            active={width === "phone"}
            onClick={() => setWidth("phone")}
            label="Phone width"
          >
            <Smartphone className="size-4" aria-hidden />
          </WidthButton>
          <WidthButton
            active={width === "full"}
            onClick={() => setWidth("full")}
            label="Full width"
          >
            <Monitor className="size-4" aria-hidden />
          </WidthButton>
        </div>

        <button
          type="button"
          onClick={refresh}
          className="grid size-9 place-items-center rounded-lg border border-border text-text-subtle transition-colors hover:bg-surface-2 hover:text-text"
          aria-label="Refresh the preview"
          title="Refresh the preview"
        >
          <RefreshCw className="size-4" aria-hidden />
        </button>

        <a
          href={src}
          target="_blank"
          rel="noopener noreferrer"
          className="grid size-9 place-items-center rounded-lg border border-border text-text-subtle transition-colors hover:bg-surface-2 hover:text-accent"
          aria-label="Open the preview in a new tab"
          title="Open in a new tab"
        >
          <ExternalLink className="size-4" aria-hidden />
        </a>
      </div>

      <div className="mt-3 overflow-hidden rounded-2xl border border-border bg-surface-2">
        <div
          className={cn(
            "mx-auto transition-[max-width]",
            width === "phone" ? "max-w-[390px]" : "max-w-none",
          )}
        >
          {/*
            The frame, over a skeleton in the shape of what is loading.

            The frame is transparent until it reports itself loaded, so the
            placeholder underneath is what is on screen for the second or so a
            server render takes — rather than a blank rectangle, which reads as
            the preview having broken.
          */}
          <div className="relative">
            {loadedSrc !== src && (
              <SkeletonRegion
                label="Loading the preview"
                className="absolute inset-0 overflow-hidden p-5"
              >
                <SkeletonCardGrid count={3} lines={4} className="lg:grid-cols-2" />
              </SkeletonRegion>
            )}

            <iframe
              key={src}
              src={src}
              title="Preview"
              onLoad={() => setLoadedSrc(src)}
              className={cn(
                "relative h-[70vh] w-full border-0 lg:h-[calc(100vh-14rem)]",
                loadedSrc === src ? "bg-bg" : "bg-transparent",
              )}
            />
          </div>
        </div>
      </div>

      <p className="mt-2 text-xs text-text-subtle">
        {note ?? "Updates when you save."}
      </p>
    </section>
  );
}

function WidthButton({
  active,
  onClick,
  label,
  children,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      aria-label={label}
      title={label}
      className={cn(
        "grid size-8 place-items-center rounded-md transition-colors",
        active ? "bg-accent-soft text-accent" : "text-text-subtle hover:text-text",
      )}
    >
      {children}
    </button>
  );
}
