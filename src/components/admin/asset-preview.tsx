import { QualityNote } from "@/components/admin/quality-note";
import { assessQuality } from "@/lib/media/image-fields";
import { cn } from "@/lib/utils";

export interface AssetFacts {
  id: string;
  url: string;
  filename: string;
  alt: string;
  mimeType: string;
  sizeBytes: number;
  width: number | null;
  height: number | null;
  folder: string;
}

/**
 * The third column of the media screen: the file itself, shown honestly.
 *
 * This panel is where `docs/image-rules.md` is enforced rather than described.
 * Every choice in it comes from one of the four promises:
 *
 *   **Never cropped.** `object-contain` inside a box that keeps the file's own
 *   aspect ratio. A media library that previews with `object-fit: cover` is a
 *   library that hides exactly the defect it exists to catch — you approve a
 *   picture, and the site then shows a different part of it.
 *
 *   **Never covered.** Nothing is laid over the image. The facts sit under it,
 *   not on it, and the selected-state ring is offset outside the frame.
 *
 *   **Never distorted.** The box takes its ratio from the stored width and
 *   height, so what is on screen is the file's own shape.
 *
 *   **Never upscaled.** `max-width` is the natural width. A 400px logo is drawn
 *   at 400px in a 700px column and the empty space to its right is the truth:
 *   that is as large as this file goes.
 *
 * It is shown twice, on white and on near-black. A transparent PNG and an SVG
 * with dark strokes both look perfect on one of those and invisible on the
 * other, and a logo is the asset most likely to be both — so a preview that
 * shows only the current theme is a preview that passes the file it should
 * have failed.
 */
export function AssetPreview({ asset }: { asset: AssetFacts }) {
  const ratio =
    asset.width && asset.height ? `${asset.width} / ${asset.height}` : undefined;

  return (
    <section aria-labelledby="asset-preview-heading" className="min-w-0">
      <h2
        id="asset-preview-heading"
        className="font-mono text-[0.65rem] uppercase tracking-[0.16em] text-text-subtle"
      >
        The file
      </h2>

      <div className="mt-3 space-y-3">
        <Stage label="On light" className="bg-white" asset={asset} ratio={ratio} />
        <Stage label="On dark" className="bg-[#07090c]" asset={asset} ratio={ratio} />
      </div>

      <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
        <Fact
          term="Size on screen"
          value={
            asset.width && asset.height
              ? `${asset.width} × ${asset.height} px`
              : "No fixed size — it scales"
          }
        />
        <Fact term="Shape" value={aspectLabel(asset.width, asset.height)} />
        <Fact term="Format" value={formatLabel(asset.mimeType)} />
        <Fact term="Weight" value={formatSize(asset.sizeBytes)} />
      </dl>

      <QualityNote
        quality={assessQuality({
          width: asset.width,
          height: asset.height,
          vector: asset.mimeType === "image/svg+xml",
          sizeBytes: asset.sizeBytes,
        })}
        className="mt-5"
      />

      <p className="mt-4 break-all font-mono text-[0.65rem] text-text-subtle">
        {asset.url}
      </p>
    </section>
  );
}

/**
 * One background the file is checked against.
 *
 * The frame keeps the file's aspect ratio and the image fills it with
 * `object-contain`, so a wrong-shaped box would show as letterboxing here
 * rather than as a crop on the site.
 */
function Stage({
  label,
  className,
  asset,
  ratio,
}: {
  label: string;
  className: string;
  asset: AssetFacts;
  ratio: string | undefined;
}) {
  return (
    <figure>
      <div
        className={cn(
          "flex items-center justify-center overflow-hidden rounded-xl border border-border p-4",
          className,
        )}
      >
        <div
          style={{
            aspectRatio: ratio,
            maxWidth: asset.width ? `${asset.width}px` : undefined,
          }}
          className="flex w-full items-center justify-center"
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- the asset is
              served from this application's own media route at a known
              intrinsic size, and the optimiser must not resample the very file
              being inspected. */}
          <img
            src={asset.url}
            alt={asset.alt}
            width={asset.width ?? undefined}
            height={asset.height ?? undefined}
            className="max-h-[40vh] w-full object-contain"
          />
        </div>
      </div>
      <figcaption className="mt-1.5 font-mono text-[0.6rem] uppercase tracking-[0.14em] text-text-subtle">
        {label}
      </figcaption>
    </figure>
  );
}

function Fact({ term, value }: { term: string; value: string }) {
  return (
    <div>
      <dt className="font-mono text-[0.6rem] uppercase tracking-[0.14em] text-text-subtle">
        {term}
      </dt>
      <dd className="mt-1 text-text">{value}</dd>
    </div>
  );
}

/**
 * The file's shape, as a ratio someone can compare against a field's.
 *
 * Reduced by the greatest common divisor, then only kept if the result is
 * small enough to read: 1200 × 800 is "3:2", and 1201 × 800 is "1.50:1", which
 * is the honest way to say "nearly, but not one of the standard shapes".
 */
export function aspectLabel(width: number | null, height: number | null): string {
  if (!width || !height) return "Scales to fit";

  const divisor = gcd(width, height);
  const w = width / divisor;
  const h = height / divisor;

  if (w <= 32 && h <= 32) return `${w}:${h}`;

  return `${(width / height).toFixed(2)}:1`;
}

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatLabel(mimeType: string): string {
  const names: Record<string, string> = {
    "image/png": "PNG",
    "image/jpeg": "JPEG",
    "image/gif": "GIF",
    "image/webp": "WebP",
    "image/svg+xml": "SVG (vector)",
  };
  return names[mimeType] ?? mimeType;
}
