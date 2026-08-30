import type { Json } from "@/types/database";

/**
 * A picture in a gallery: an id from the media library, and what to say under
 * it.
 *
 * Two columns hold this shape — `projects.gallery` and
 * `case_studies.screenshots` — and both are `jsonb`, so nothing at the database
 * level guarantees it. The reader below is what makes reading one safe; the
 * writer is what makes writing one consistent. They live together because a
 * reader that tolerates a shape the writer never produces is a reader nobody
 * can reason about.
 *
 * Held as a document rather than as a join table because the caption belongs to
 * the placement, not to the file: the same screenshot can be captioned one way
 * in a portfolio gallery and another way in a case study, and a column on
 * `media` could only carry one of them.
 */
export interface GalleryItem {
  media_id: string;
  caption: string | null;
}

/**
 * A stored gallery, as something safe to render.
 *
 * Anything that is not an object with a string `media_id` is dropped rather
 * than repaired. The public page maps over the result and looks each id up, so
 * a malformed entry that survived this would become a missing image — and one
 * bad row would take the whole page down if it were allowed to throw instead.
 *
 * One copy of this, deliberately. It was two — one in `project-detail.tsx` and
 * one in `case-study-detail.tsx`, identical — which is exactly the arrangement
 * where the fix lands in one of them.
 */
export function readGallery(value: unknown): GalleryItem[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((entry) => {
    if (!entry || typeof entry !== "object") return [];
    const row = entry as Record<string, unknown>;
    if (typeof row.media_id !== "string") return [];

    return [
      {
        media_id: row.media_id,
        caption:
          typeof row.caption === "string" && row.caption.trim() ? row.caption : null,
      },
    ];
  });
}

/**
 * The admin's rows, as the column stores them.
 *
 * A row with no picture is dropped rather than written. The form marks the
 * picker required, so this only catches a posted request — but a gallery entry
 * that is a caption with no image is an entry the page cannot draw, and the
 * page's own reader would drop it anyway. Dropping it here means the stored
 * document and the rendered page agree.
 *
 * An empty caption is omitted from the object rather than stored as `""` or as
 * `null`. All three read the same to `readGallery`, and the shortest is the one
 * that does not fill the column with keys nobody set.
 */
export function galleryToJson(value: unknown): Json {
  if (!Array.isArray(value)) return [] as unknown as Json;

  const rows = value.flatMap((entry) => {
    const row = (entry ?? {}) as Record<string, unknown>;

    const mediaId = typeof row.media_id === "string" ? row.media_id.trim() : "";
    if (!mediaId) return [];

    const caption = typeof row.caption === "string" ? row.caption.trim() : "";

    return [caption ? { media_id: mediaId, caption } : { media_id: mediaId }];
  });

  return rows as unknown as Json;
}
