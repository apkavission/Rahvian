"use client";

import { RecordList } from "@/components/admin/record-list";
import { deleteMedia } from "@/lib/actions/media";
import { assessQuality } from "@/lib/media/image-fields";

export interface AssetListItem {
  id: string;
  filename: string;
  url: string;
  alt: string;
  folder: string;
  width: number | null;
  height: number | null;
  mimeType: string;
  /** Phrases naming what this file is used as, already counted. */
  usedAs: string[];
}

/**
 * The left column: every asset, newest first.
 *
 * No reorder arrows — the library has no order of its own, only a date — and no
 * duplicate button, because a second copy of the same bytes under a second
 * address is not what anyone pressing it would expect. Replacing an image is an
 * upload, and the old one stays reachable for whatever still points at it.
 *
 * Each row carries a thumbnail, drawn `object-contain` inside a square rather
 * than `cover`. A cropped thumbnail in a media library is the one place a crop
 * is genuinely dangerous: it is where someone decides an image is fine.
 */
export function AssetList({
  assets,
  selectedId,
  emptyLabel,
}: {
  assets: AssetListItem[];
  selectedId: string | null;
  emptyLabel: string;
}) {
  return (
    <RecordList
      basePath="/admin/media"
      queryKey="asset"
      selectedId={selectedId}
      emptyLabel={emptyLabel}
      items={assets.map((asset) => {
        // Marked on the row, so a file that is too small to use well is
        // visible in the list rather than only once it has been opened.
        const quality = assessQuality({
          width: asset.width,
          height: asset.height,
          vector: asset.mimeType === "image/svg+xml",
        });

        return {
        id: asset.id,
        title: asset.filename,
        subtitle: [
          asset.width && asset.height ? `${asset.width} × ${asset.height}` : "vector",
          asset.folder,
          quality.level === "poor" ? "too small" : null,
        ]
          .filter(Boolean)
          .join(" · "),
        dimmed: quality.level === "poor",
        icon: (
          /* eslint-disable-next-line @next/next/no-img-element -- served from
             this application's own media route; there is nothing the optimiser
             can add to a 32px thumbnail of a known file. */
          <img
            src={asset.url}
            alt=""
            aria-hidden
            loading="lazy"
            className="size-8 rounded-md border border-border bg-surface-2 object-contain p-0.5"
          />
        ),
        };
      })}
      actions={{ remove: deleteMedia }}
      deleteCopy={(item) => {
        const asset = assets.find((entry) => entry.id === item.id);
        const usedAs = asset?.usedAs ?? [];

        return {
          title: `Delete ${item.title}?`,
          body:
            usedAs.length > 0
              ? `The file is removed from storage and cannot be brought back. It is currently ${joinPhrases(usedAs)} — every one of those will be left with no image, and nothing will warn you where.`
              : "The file is removed from storage and cannot be brought back. Nothing is currently using it, so nothing on the site will change.",
          confirmLabel: "Delete file",
        };
      }}
    />
  );
}

/** "a team photo, the light logo and 2 × a portfolio thumbnail". */
function joinPhrases(phrases: string[]): string {
  if (phrases.length === 1) return phrases[0];
  return `${phrases.slice(0, -1).join(", ")} and ${phrases[phrases.length - 1]}`;
}
