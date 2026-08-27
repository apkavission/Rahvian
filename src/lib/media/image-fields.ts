/**
 * Every image field on this site, and the exact size each one wants.
 *
 * One table, as `docs/image-rules.md` requires. Not a sentence someone
 * remembered to type into a hint on nine separate forms — those drift, and the
 * one that drifts is the field nobody has opened recently. The picker reads
 * this, the hints are generated from it, and a field that is not in here cannot
 * be declared at all.
 *
 * **Where the numbers come from.** Each is the box the image is actually drawn
 * in, at twice its CSS size so it stays sharp on a dense screen, and at exactly
 * the box's aspect ratio. That last part is what makes the "never cropped"
 * promise keepable rather than aspirational: a file at the box's own ratio has
 * nothing to crop, so `object-contain` and `object-fit: cover` would produce
 * the same picture. The site uses `contain`, so a file at the wrong ratio
 * letterboxes — visible, and the owner's to fix — rather than cropping, which
 * is invisible and nobody's.
 */

export interface ImageFieldSpec {
  /** What the field is called on the form. */
  label: string;
  width: number;
  height: number;
  /** One line: where this image is seen. Shown under the control. */
  use: string;
  /**
   * Where a vector file is the better answer and the pixel size is only a
   * fallback for a raster one. Logos, above all.
   */
  vectorPreferred?: boolean;
}

export const IMAGE_FIELDS = {
  "service.social": {
    label: "Social image",
    width: 1200,
    height: 630,
    use: "The picture that appears when this service's page is shared — WhatsApp, LinkedIn, a link in a message.",
  },

  "project.thumbnail": {
    label: "Card image",
    width: 1600,
    height: 1000,
    use: "The picture on the portfolio grid and at the top of the project's own page.",
  },
  "project.social": {
    label: "Social image",
    width: 1200,
    height: 630,
    use: "Shown when this project is shared. Left empty, the card image is used instead.",
  },

  "caseStudy.header": {
    label: "Header image",
    width: 1600,
    height: 1000,
    use: "The picture on the case studies grid and at the top of the write-up. It doubles as the social preview, where the platform will show it wider than this — that crop is theirs, not ours.",
  },

  "post.featured": {
    label: "Featured image",
    width: 1600,
    height: 1000,
    use: "The picture on the blog list and across the top of the post.",
  },
  "post.social": {
    label: "Social image",
    width: 1200,
    height: 630,
    use: "Shown when this post is shared. Left empty, the featured image is used instead.",
  },

  "team.photo": {
    label: "Photo",
    width: 400,
    height: 400,
    use: "The portrait on the About page. Square — the frame is a circle, so anything else would have to be cut to fit it.",
  },

  "settings.logoLight": {
    label: "Logo — light theme",
    width: 512,
    height: 512,
    vectorPreferred: true,
    use: "The mark in the header and the footer when the site is light. An SVG is the right answer here; it stays sharp at every size and in every email client.",
  },
  "settings.logoDark": {
    label: "Logo — dark theme",
    width: 512,
    height: 512,
    vectorPreferred: true,
    use: "The same mark, drawn for a dark background. Both are emitted and CSS hides one, so the right mark is painted in the first frame.",
  },
} as const satisfies Record<string, ImageFieldSpec>;

export type ImageFieldKey = keyof typeof IMAGE_FIELDS;

/** One asset, as the picker needs to know it. */
export interface MediaOption {
  id: string;
  filename: string;
  url: string;
  alt: string;
  width: number | null;
  height: number | null;
  /** SVG. Scales without loss, so no size rule applies to it. */
  vector: boolean;
}

export type FitLevel = "ok" | "note" | "warn";

export interface Fit {
  level: FitLevel;
  message: string;
}

/**
 * How a chosen file measures up against what the field asked for.
 *
 * The four outcomes in `docs/image-rules.md`, in one pure function so that the
 * picker, the upload form and anything written later all say the same thing.
 *
 * Every message names **both** numbers. "Wrong size" is a warning nobody can
 * act on; "you gave 1600 × 900, this field wants 1200 × 800" is one they can.
 *
 * It warns, it does not block. A hard refusal at 1199 × 800 is a panel that
 * gets fought rather than used.
 */
export function describeFit(spec: ImageFieldSpec, asset: MediaOption): Fit {
  const wanted = `${spec.width} × ${spec.height}`;

  // A vector has no pixel size to be wrong. It scales to whatever box it is
  // given, losing nothing, so the entire rule is moot for it.
  if (asset.vector) {
    return {
      level: "ok",
      message: spec.vectorPreferred
        ? "A vector — exactly right here. It stays sharp at every size."
        : "A vector. It scales to any size without losing anything.",
    };
  }

  if (!asset.width || !asset.height) {
    return {
      level: "warn",
      message: `This file's size could not be read, so nothing can be checked against the ${wanted} this field wants.`,
    };
  }

  const given = `${asset.width} × ${asset.height}`;

  if (asset.width === spec.width && asset.height === spec.height) {
    return { level: "ok", message: `${given} — exactly what this field wants.` };
  }

  // Compared as a cross-product rather than as two divisions, so 1600 × 1000
  // and 1200 × 750 are recognised as the same shape without a rounding
  // tolerance to argue about.
  const sameShape = asset.width * spec.height === asset.height * spec.width;

  if (!sameShape) {
    return {
      level: "warn",
      message: `${given} is a different shape from the ${wanted} this field wants. It will be shown whole, with empty space along one edge — nothing is cut off, but it will not fill the space.`,
    };
  }

  if (asset.width < spec.width) {
    return {
      level: "warn",
      message: `${given} is the right shape but smaller than the ${wanted} this field wants. It would have to be enlarged, which is the one thing the rules do not allow — so it will be drawn at its own size and leave space around it.`,
    };
  }

  return {
    level: "note",
    message: `${given} — the right shape, larger than the ${wanted} needed. It will be shown at ${wanted} and stay sharp.`,
  };
}

/** "1200 × 630 (40:21)" — what a field prints before anyone picks a file. */
export function specLabel(spec: ImageFieldSpec): string {
  return `${spec.width} × ${spec.height} px (${ratioLabel(spec.width, spec.height)})`;
}

/**
 * A width and height as the shape people name it by.
 *
 * Reduced by the greatest common divisor, and only kept if the result is small
 * enough to read: 1600 × 1000 is "16:10", and anything that reduces to
 * something unwieldy is given as a decimal instead, which is the honest way to
 * say "not one of the standard shapes".
 */
export function ratioLabel(width: number, height: number): string {
  const divisor = gcd(width, height);
  const w = width / divisor;
  const h = height / divisor;

  if (w <= 40 && h <= 40) return `${w}:${h}`;
  return `${(width / height).toFixed(2)}:1`;
}

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

// ---------------------------------------------------------------------------
// Quality

/**
 * The largest and smallest a declared field asks for.
 *
 * Derived from the table rather than typed twice, so adding a field with a
 * bigger picture in it automatically raises the bar a file has to clear to be
 * called usable everywhere.
 */
const SIZES = Object.values(IMAGE_FIELDS);
const LARGEST_WIDTH = Math.max(...SIZES.map((spec) => spec.width));
const SMALLEST_WIDTH = Math.min(...SIZES.map((spec) => spec.width));

/** Beyond this a file is slow to load, whatever it looks like. */
const HEAVY_BYTES = 1024 * 1024;

export type QualityLevel = "good" | "note" | "poor";

export interface Quality {
  level: QualityLevel;
  /** The headline: what is wrong, in one clause. */
  summary: string;
  /** What it means for the site, and what to do. */
  detail: string;
}

/**
 * Whether a file is good enough to put on the site at all.
 *
 * Separate from `describeFit`, and needed alongside it, because they answer
 * different questions. `describeFit` asks "does this suit *this field*"; this
 * asks "is this file any good", which has to be answerable at the moment of
 * upload, before anyone has decided where it will go.
 *
 * The rule it enforces is the owner's, stated plainly: a picture must never
 * reach the site looking broken, blurry or low quality. The site itself will
 * not enlarge anything — `components/media/image.tsx` caps every image at its
 * own size — so a small file cannot come out blurry. What it *will* look is
 * small, sitting in a space far bigger than itself. That is the thing worth
 * warning about, and it is the thing a size in pixels alone does not say.
 */
export function assessQuality(asset: {
  width: number | null;
  height: number | null;
  vector: boolean;
  sizeBytes?: number;
}): Quality {
  if (asset.vector) {
    return {
      level: "good",
      summary: "Vector — perfect at any size",
      detail:
        "It is drawn rather than photographed, so it stays sharp at every size on every screen. Nothing can make this one look soft.",
    };
  }

  if (!asset.width || !asset.height) {
    return {
      level: "poor",
      summary: "Size could not be read",
      detail:
        "The file's dimensions could not be read from it, so nothing about its quality can be checked. Re-export it from the original and upload it again.",
    };
  }

  const smaller = Math.min(asset.width, asset.height);

  if (asset.width < SMALLEST_WIDTH) {
    return {
      level: "poor",
      summary: `Too small — ${asset.width} × ${asset.height}`,
      detail: `Every image field on this site asks for at least ${SMALLEST_WIDTH}px across. The site will never stretch this one, so it will not look blurry — it will look small, sitting in a space several times its size. Use a larger version.`,
    };
  }

  if (asset.width < LARGEST_WIDTH) {
    return {
      level: "note",
      summary: `Usable in some places — ${asset.width} × ${asset.height}`,
      detail: `Large enough for the smaller fields, short of the ${LARGEST_WIDTH}px the card and header images ask for. Put it there and it will be drawn at its own size with space around it rather than filling the frame.`,
    };
  }

  if (smaller < 200) {
    return {
      level: "note",
      summary: `Very narrow on one side — ${asset.width} × ${asset.height}`,
      detail:
        "Wide enough overall, but only a couple of hundred pixels on its short side. In a frame of any normal shape most of the space will be empty.",
    };
  }

  if (asset.sizeBytes !== undefined && asset.sizeBytes > HEAVY_BYTES) {
    return {
      level: "note",
      summary: "Sharp, but heavy",
      detail:
        "Over a megabyte. It will look right and load slowly, which costs the page's speed score on a phone. Re-export it as WebP, or as a JPEG at around 80% quality.",
    };
  }

  return {
    level: "good",
    summary: `${asset.width} × ${asset.height} — good for anywhere`,
    detail: "Large enough for every field on the site, and it will stay sharp.",
  };
}
