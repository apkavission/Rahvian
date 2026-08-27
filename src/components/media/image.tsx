import { cn } from "@/lib/utils";

/**
 * Every stored image on the public site is drawn by one of these two.
 *
 * They exist to keep one promise that is easy to state and easy to break by
 * accident: **an image is never enlarged past its own size.** Enlarging is what
 * makes a picture look soft, and a soft picture on a services website reads as
 * a cheap website. `docs/image-rules.md` forbids it, and this is where the
 * forbidding actually happens.
 *
 * The trap is that the obvious markup does the opposite. `object-contain` on a
 * `size-full` image inside a box does not mean "draw it at its own size" — it
 * means "scale it, up or down, until it fits". A 400px logo in a 1200px frame
 * is blown up to 1200 and blurs, and nothing about the code looks wrong. The
 * fix is the inline `maxWidth`/`maxHeight` below: the natural size is a ceiling,
 * so the browser may only ever scale *down*.
 *
 * What that gives, for the three cases that actually occur:
 *
 *   **Larger than the space** — scaled down. Sharp, and the usual case.
 *   **Exactly right** — fills the space precisely. The intended case.
 *   **Smaller** — drawn at its own size with space around it. It looks small,
 *   which is honest, rather than looking blurry, which is not. The admin has
 *   already warned about this file before it got here.
 *
 * Vectors are exempt, and have to be: an SVG's intrinsic size comes from its
 * `viewBox` and is often a couple of dozen units, so capping a logo at 24px
 * would destroy the one format that scales perfectly. They are recognised by
 * the `.svg` on the end of the address, which is reliable here because the
 * upload derives a file's extension from its own bytes rather than from what it
 * was called.
 */

export interface StoredImage {
  url: string;
  alt: string;
  width: number | null;
  height: number | null;
}

function isVector(url: string): boolean {
  return /\.svg(\?|#|$)/i.test(url);
}

/** The natural size as a ceiling — the whole point of this file. */
function ceiling(image: StoredImage): React.CSSProperties | undefined {
  if (isVector(image.url)) return undefined;

  return {
    maxWidth: image.width ? `${image.width}px` : undefined,
    maxHeight: image.height ? `${image.height}px` : undefined,
  };
}

/**
 * An image inside a box of a fixed shape — every card on the site.
 *
 * The frame keeps its ratio whatever the file is, so a grid of cards stays even
 * and nothing reflows as pictures load. `contain` rather than `cover`, so a
 * file of the wrong shape shows visible space rather than being silently cut:
 * a crop nobody can see is worse than a gap everybody can, because only one of
 * them gets fixed.
 */
export function FramedImage({
  image,
  className,
  eager,
}: {
  image: StoredImage;
  /**
   * Classes for the frame, not the image — and this is where the shape is set,
   * with `aspect-[16/10]` or similar.
   *
   * A class rather than an inline `aspectRatio`, so a frame can change shape at
   * a breakpoint: the featured post fills its grid cell from `lg` up, and an
   * inline style would win over the responsive class and stop it.
   */
  className?: string;
  /** Above the fold. Everything else loads lazily. */
  eager?: boolean;
}) {
  return (
    <div
      className={cn("flex items-center justify-center overflow-hidden bg-surface-2", className)}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- served from this
          application's own media route at a known intrinsic size. The optimiser
          has nothing to add, and resampling is exactly what must not happen. */}
      <img
        src={image.url}
        alt={image.alt}
        width={image.width ?? undefined}
        height={image.height ?? undefined}
        loading={eager ? "eager" : "lazy"}
        style={ceiling(image)}
        className="max-h-full max-w-full object-contain"
      />
    </div>
  );
}

/**
 * An image that flows at its own size — a post's header, a screenshot.
 *
 * No frame and no fixed shape: it takes the width it is given, up to its own,
 * and its height follows. A picture narrower than the column is centred rather
 * than stretched across it.
 */
export function NaturalImage({
  image,
  className,
  eager,
}: {
  image: StoredImage;
  className?: string;
  eager?: boolean;
}) {
  return (
    /* eslint-disable-next-line @next/next/no-img-element -- see above. */
    <img
      src={image.url}
      alt={image.alt}
      width={image.width ?? undefined}
      height={image.height ?? undefined}
      loading={eager ? "eager" : "lazy"}
      style={ceiling(image)}
      className={cn("mx-auto h-auto w-full", className)}
    />
  );
}
