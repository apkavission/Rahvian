"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Upload } from "lucide-react";
import { BrandSpinner } from "@/components/brand/brand-loader";
import { useBusyWhile } from "@/components/forms/use-busy-while";
import { useFormToast } from "@/components/forms/use-form-toast";
import { Button } from "@/components/ui/button";
import { Field, FIELD } from "@/components/ui/field";
import { uploadMedia } from "@/lib/actions/media";
import { QualityNote } from "@/components/admin/quality-note";
import { ACCEPTED_IMAGE_TYPES } from "@/lib/media/image-file";
import { assessQuality } from "@/lib/media/image-fields";
import { initialRecordState } from "@/lib/validation/records";
import { cn } from "@/lib/utils";

/** Matches the limit the action enforces. Stated here so the form can say it. */
const MAX_BYTES = 8 * 1024 * 1024;

interface Chosen {
  name: string;
  size: number;
  width: number | null;
  height: number | null;
  url: string;
  vector: boolean;
}

/**
 * Add a file.
 *
 * Two things it does that a plain file input does not, both from
 * `docs/image-rules.md`:
 *
 *   **It shows the file's real size before it is uploaded**, read from the
 *   image itself in the browser. The rules require every field to state the
 *   pixels it wants and to say when a file does not match; that conversation
 *   has to start here, at the moment someone picks a file, rather than after
 *   the picture is already on a page looking wrong.
 *
 *   **It asks for alt text and will not proceed without it.** The table refuses
 *   a row without one, deliberately — it is trivial to write while looking at
 *   the picture and expensive to retrofit across a site later.
 *
 * The dimensions shown here are the browser's reading and are not trusted for
 * anything: the action reads them again from the file's own header, because
 * `File.type` and a client-side measurement are both things a request can
 * simply lie about.
 */
export function UploadForm({ folder }: { folder: string }) {
  const [state, formAction, pending] = useActionState(uploadMedia, initialRecordState);
  const [open, setOpen] = useState(false);
  const [chosen, setChosen] = useState<Chosen | null>(null);
  const input = useRef<HTMLInputElement>(null);

  useBusyWhile(pending, "Uploading the file");
  useFormToast(state, { successTitle: "File uploaded", errorTitle: "Could not upload it" });

  // The object URL is a handle on memory the browser holds until it is told
  // otherwise. Released when the choice changes and when the form closes.
  useEffect(() => {
    return () => {
      if (chosen) URL.revokeObjectURL(chosen.url);
    };
  }, [chosen]);

  async function choose(file: File | undefined) {
    setChosen((previous) => {
      if (previous) URL.revokeObjectURL(previous.url);
      return null;
    });

    if (!file) return;

    const url = URL.createObjectURL(file);
    const vector = file.type === "image/svg+xml";
    const size = await measure(url);

    setChosen({
      name: file.name,
      size: file.size,
      width: size?.width ?? null,
      height: size?.height ?? null,
      url,
      vector,
    });
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-border px-3.5 py-2.5 text-sm text-text-muted transition-colors hover:border-border-strong hover:text-text"
      >
        <Upload className="size-4" aria-hidden />
        Upload a file
      </button>
    );
  }

  const tooBig = chosen ? chosen.size > MAX_BYTES : false;

  return (
    <form action={formAction} className="surface-raised mt-4 rounded-xl border border-border p-4">
      <input type="hidden" name="folder" value={folder} />

      <h2 className="font-display text-base font-semibold">Upload a file</h2>
      <p className="mt-1.5 text-sm text-text-muted">
        PNG, JPEG, GIF, WebP or SVG, up to 8&nbsp;MB. It is filed in{" "}
        <span className="font-mono text-xs">{folder}</span>.
      </p>

      <div className="mt-4 space-y-4">
        <Field label="File" required error={state.fieldErrors?.file}>
          {(id, describedBy) => (
            <input
              id={id}
              ref={input}
              type="file"
              name="file"
              required
              accept={ACCEPTED_IMAGE_TYPES}
              aria-describedby={describedBy}
              onChange={(event) => void choose(event.target.files?.[0])}
              className={cn(
                FIELD,
                "file:mr-3 file:rounded-md file:border-0 file:bg-surface-2 file:px-3 file:py-1.5 file:text-sm file:text-text",
              )}
            />
          )}
        </Field>

        {chosen && (
          <div className="rounded-lg border border-border bg-surface-2/60 p-3">
            <div className="flex items-start gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element -- a local
                  object URL for a file that has not been uploaded yet; there is
                  nothing for the optimiser to fetch. */}
              <img
                src={chosen.url}
                alt=""
                aria-hidden
                className="size-14 shrink-0 rounded-md border border-border bg-surface object-contain p-1"
              />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{chosen.name}</p>
                <p className="mt-1 font-mono text-[0.65rem] uppercase tracking-[0.12em] text-text-subtle">
                  {chosen.vector
                    ? "vector · scales to any size"
                    : chosen.width && chosen.height
                      ? `${chosen.width} × ${chosen.height} px`
                      : "size could not be read"}{" "}
                  · {formatSize(chosen.size)}
                </p>
              </div>
            </div>

            {tooBig && (
              <p role="alert" className="mt-3 text-sm text-danger">
                That is over the 8&nbsp;MB limit. Export it smaller rather than
                uploading it as it came off the camera.
              </p>
            )}

            {/*
              The verdict, before the file is sent rather than after.

              The same assessment the picker and the library show, from the
              same function — so a file called "too small" here is called too
              small everywhere, in the same words. This is the earliest and
              most useful moment for it: the original is still on the person's
              computer and a bigger export is one step away.
            */}
            {!tooBig && (
              <QualityNote
                quality={assessQuality({
                  width: chosen.width,
                  height: chosen.height,
                  vector: chosen.vector,
                  sizeBytes: chosen.size,
                })}
                className="mt-3"
              />
            )}
          </div>
        )}

        <Field
          label="Alt text"
          required
          hint="What the image shows, to someone who cannot see it. Required — it cannot be stored without one."
          error={state.fieldErrors?.alt_text}
        >
          {(id, describedBy) => (
            <textarea
              id={id}
              name="alt_text"
              required
              rows={2}
              aria-describedby={describedBy}
              className={cn(FIELD, "resize-y")}
            />
          )}
        </Field>
      </div>

      {state.status === "error" && !state.fieldErrors ? (
        <p role="alert" className="mt-4 text-sm text-danger">
          {state.message}
        </p>
      ) : null}

      <div className="mt-5 flex items-center gap-3">
        <Button type="submit" disabled={pending || tooBig}>
          {pending ? (
            <>
              <BrandSpinner />
              Uploading
            </>
          ) : (
            "Upload"
          )}
        </Button>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            void choose(undefined);
          }}
          className="rounded-lg px-3 py-2 text-sm text-text-muted transition-colors hover:bg-surface-2 hover:text-text"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

/**
 * The chosen file's pixel size, read by decoding it in the browser.
 *
 * Resolves to null rather than rejecting for anything that will not decode —
 * an SVG with no intrinsic size, a corrupt file — because a size that cannot
 * be read is a fact to report, not an error to throw. The action reads the
 * authoritative dimensions from the file's own header regardless.
 */
function measure(url: string): Promise<{ width: number; height: number } | null> {
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () =>
      resolve(
        image.naturalWidth > 0 && image.naturalHeight > 0
          ? { width: image.naturalWidth, height: image.naturalHeight }
          : null,
      );
    image.onerror = () => resolve(null);
    image.src = url;
  });
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
