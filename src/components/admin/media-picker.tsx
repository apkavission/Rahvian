"use client";

import { useState } from "react";
import { Check, ImageOff, Plus, TriangleAlert, X } from "lucide-react";
import { QualityNote } from "@/components/admin/quality-note";
import {
  assessQuality,
  describeFit,
  specLabel,
  type Fit,
  type ImageFieldSpec,
  type MediaOption,
} from "@/lib/media/image-fields";
import { cn } from "@/lib/utils";

/**
 * Choosing an image for a field, with the field's own size rules applied.
 *
 * This control is where `docs/image-rules.md` stops being a document. Three
 * things it does that a dropdown of filenames would not:
 *
 *   **It says the size before anything is chosen.** "1200 × 630 px (40:21)" is
 *   on screen while the folder of photographs is still closed, which is the
 *   only moment that number is useful. After a picture has been chosen it is
 *   an autopsy.
 *
 *   **It names both numbers on a mismatch.** "Wrong size" is a warning nobody
 *   can act on. "1600 × 900 is a different shape from the 1200 × 630 this
 *   field wants" is one they can.
 *
 *   **It warns, and does not block.** A control that refuses 1199 × 630 is a
 *   control that gets fought rather than used. The judgement stays with the
 *   person; what the panel owes them is the facts.
 *
 * Every thumbnail is `object-contain` inside a box at the *field's* ratio, not
 * the file's. That is deliberate and it is the whole trick: a file of the wrong
 * shape shows its empty edges here, in the picker, at the moment of choosing —
 * rather than on the page, later, where nobody is looking for it.
 */
export function MediaPicker({
  id,
  spec,
  assets,
  value,
  invalid,
  describedBy,
  onChange,
}: {
  id: string;
  spec: ImageFieldSpec;
  assets: MediaOption[];
  value: string;
  invalid?: boolean;
  describedBy?: string;
  onChange: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);

  const chosen = assets.find((asset) => asset.id === value) ?? null;
  const fit = chosen ? describeFit(spec, chosen) : null;
  const quality = chosen ? assessQuality(chosen) : null;

  return (
    <div className="mt-2">
      {chosen ? (
        <div
          className={cn(
            "rounded-xl border p-3",
            fit?.level === "warn" ? "border-warning/50 bg-warning-soft/30" : "border-border bg-surface",
          )}
        >
          <div className="flex items-start gap-3">
            <Frame spec={spec} asset={chosen} className="w-24 shrink-0" />

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{chosen.filename}</p>
              {fit && <FitLine fit={fit} className="mt-1.5" />}
            </div>
          </div>

          {/*
            Two different questions, both worth answering here. The line above
            says whether the file suits *this field*; this one says whether the
            file is any good at all — a picture can be exactly the right shape
            and still be too small to look like anything.

            Shown only when there is something to say. A verdict of "this is
            fine" on every field would be noise, and noise is what stops
            warnings being read.
          */}
          {quality && quality.level !== "good" && (
            <QualityNote quality={quality} className="mt-3" />
          )}

          <div className="mt-3 flex gap-2 border-t border-border pt-3">
            <button
              type="button"
              onClick={() => setOpen((current) => !current)}
              className="rounded-lg px-2.5 py-1.5 text-sm text-text-muted transition-colors hover:bg-surface-2 hover:text-text"
            >
              {open ? "Close" : "Choose another"}
            </button>
            <button
              type="button"
              onClick={() => {
                onChange("");
                setOpen(false);
              }}
              className="ml-auto inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm text-text-subtle transition-colors hover:bg-danger-soft hover:text-danger"
            >
              <X className="size-3.5" aria-hidden />
              Remove
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          id={id}
          aria-describedby={describedBy}
          onClick={() => setOpen((current) => !current)}
          className={cn(
            "inline-flex w-full items-center justify-center gap-2 rounded-lg border border-dashed px-3.5 py-3 text-sm transition-colors",
            invalid
              ? "border-danger text-danger"
              : "border-border text-text-muted hover:border-border-strong hover:text-text",
          )}
        >
          <Plus className="size-4" aria-hidden />
          Choose an image — {specLabel(spec)}
        </button>
      )}

      {open && (
        <div className="mt-3 rounded-xl border border-border bg-surface-2/50 p-3">
          <p className="text-xs leading-relaxed text-text-subtle">
            This field wants{" "}
            <span className="font-medium text-text">{specLabel(spec)}</span>.
            Anything else still works — it is shown whole and never cut off, so a
            different shape simply leaves space along one edge.
          </p>

          {assets.length === 0 ? (
            <p className="mt-3 rounded-lg border border-dashed border-border p-4 text-sm text-text-muted">
              The media library is empty. Upload something at{" "}
              <span className="font-mono text-xs">/admin/media</span> and it will
              appear here.
            </p>
          ) : (
            <ul className="mt-3 grid max-h-96 grid-cols-2 gap-2 overflow-y-auto sm:grid-cols-3">
              {assets.map((asset) => {
                const assetFit = describeFit(spec, asset);
                const selected = asset.id === value;

                return (
                  <li key={asset.id}>
                    <button
                      type="button"
                      onClick={() => {
                        onChange(asset.id);
                        setOpen(false);
                      }}
                      aria-pressed={selected}
                      className={cn(
                        "group w-full rounded-lg border p-2 text-left transition-colors",
                        selected
                          ? "border-accent bg-accent-soft/40"
                          : "border-border bg-surface hover:border-border-strong",
                      )}
                    >
                      <Frame spec={spec} asset={asset} />

                      <p className="mt-2 truncate text-xs font-medium">{asset.filename}</p>
                      <p
                        className={cn(
                          "mt-0.5 truncate font-mono text-[0.6rem] uppercase tracking-[0.1em]",
                          assessQuality(asset).level === "poor"
                            ? "text-warning"
                            : assetFit.level === "warn"
                              ? "text-warning"
                              : "text-text-subtle",
                        )}
                      >
                        {asset.vector
                          ? "vector"
                          : asset.width && asset.height
                            ? `${asset.width} × ${asset.height}`
                            : "size unknown"}
                        {assetFit.level === "warn" ? " · check" : ""}
                      </p>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * A thumbnail, in a box at the *field's* aspect ratio.
 *
 * The field's, not the file's — which is the opposite of the media library's
 * own preview and right for the opposite reason. There, the question is "what
 * is this file?". Here it is "what will this file look like in that space?",
 * and the only way to answer it is to draw the space.
 *
 * `object-contain`, so a wrong-shaped file shows its empty edges rather than
 * being quietly cropped to fit — the crop being invisible is exactly what makes
 * it dangerous.
 */
function Frame({
  spec,
  asset,
  className,
}: {
  spec: ImageFieldSpec;
  asset: MediaOption;
  className?: string;
}) {
  return (
    <div
      style={{ aspectRatio: `${spec.width} / ${spec.height}` }}
      className={cn(
        "flex w-full items-center justify-center overflow-hidden rounded-md border border-border bg-surface-3",
        className,
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- served from this
          application's own media route at a known intrinsic size; the optimiser
          must not resample the file being judged. */}
      <img
        src={asset.url}
        alt=""
        aria-hidden
        loading="lazy"
        className="size-full object-contain"
      />
    </div>
  );
}

function FitLine({ fit, className }: { fit: Fit; className?: string }) {
  const Icon = fit.level === "warn" ? TriangleAlert : fit.level === "ok" ? Check : ImageOff;

  return (
    <p
      className={cn(
        "flex items-start gap-1.5 text-xs leading-relaxed",
        fit.level === "warn" ? "text-warning" : "text-text-subtle",
        className,
      )}
    >
      <Icon
        className={cn(
          "mt-0.5 size-3.5 shrink-0",
          fit.level === "ok" && "text-success",
        )}
        aria-hidden
      />
      <span>{fit.message}</span>
    </p>
  );
}
