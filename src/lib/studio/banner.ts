/**
 * The sizes a banner is actually asked for, and the arithmetic behind one.
 *
 * ---------------------------------------------------------------------------
 * **The whole value of this file is that the numbers are right.**
 *
 * A banner maker with a free width and height box has not saved anybody
 * anything — the hard part was never the drawing, it was knowing that LinkedIn
 * wants 1584 by 396 and that a Facebook cover is cropped differently on a phone
 * than on a laptop. Every size below is the platform's current one, and the
 * ones with a safe area carry it, because a headline centred in a Facebook
 * cover is a headline half-hidden behind a profile picture on a phone.
 */

export interface BannerSize {
  key: string;
  label: string;
  width: number;
  height: number;
  /** Where it goes, in the words the person uses for it. */
  note: string;
  /**
   * The part that is never cropped, as fractions of the whole.
   *
   * Undefined where the image is shown whole. Where it is present, the studio
   * keeps every word inside it — which is the difference between a banner that
   * works on a phone and one that was only ever checked on a laptop.
   */
  safe?: { top: number; right: number; bottom: number; left: number };
}

export const BANNER_SIZES: BannerSize[] = [
  {
    key: "hero",
    label: "Website hero",
    width: 1920,
    height: 640,
    note: "The strip across the top of a page.",
    /* Sides only. A hero is cropped horizontally on a narrow screen and almost
       never vertically. */
    safe: { top: 0.06, right: 0.14, bottom: 0.06, left: 0.14 },
  },
  {
    key: "hero-tall",
    label: "Website hero, phone",
    width: 1080,
    height: 1350,
    note: "For a page whose hero is a tall image on a phone.",
  },
  {
    key: "facebook",
    label: "Facebook cover",
    width: 820,
    height: 312,
    note: "Cropped hard on a phone — the safe area is why.",
    /*
      Facebook shows 640×360 of this on a phone, cropped from the centre, and
      puts the profile picture over the lower left. Both are inside these
      margins.
    */
    safe: { top: 0.08, right: 0.12, bottom: 0.22, left: 0.24 },
  },
  {
    key: "linkedin",
    label: "LinkedIn banner",
    width: 1584,
    height: 396,
    note: "The company page header.",
    /* The logo tile sits over the lower left on the company page. */
    safe: { top: 0.08, right: 0.06, bottom: 0.3, left: 0.2 },
  },
  {
    key: "x",
    label: "X header",
    width: 1500,
    height: 500,
    note: "Formerly Twitter.",
    safe: { top: 0.1, right: 0.08, bottom: 0.28, left: 0.18 },
  },
  {
    key: "youtube",
    label: "YouTube channel art",
    width: 2560,
    height: 1440,
    note: "The one with the smallest safe area of all — a TV shows everything, a phone shows a strip.",
    /*
      YouTube's own guidance: 1546×423 in the centre is all that is guaranteed
      to be seen. As fractions of 2560×1440 that is these margins, and getting
      this wrong is why so many channel banners have half a word in them.
    */
    safe: { top: 0.353, right: 0.198, bottom: 0.353, left: 0.198 },
  },
  {
    key: "instagram-post",
    label: "Instagram post",
    width: 1080,
    height: 1080,
    note: "Square. Also fine for a WhatsApp status.",
  },
  {
    key: "instagram-story",
    label: "Instagram story",
    width: 1080,
    height: 1920,
    note: "Full screen on a phone.",
    /* The top and bottom carry the app's own controls. */
    safe: { top: 0.14, right: 0.06, bottom: 0.16, left: 0.06 },
  },
  {
    key: "whatsapp",
    label: "WhatsApp forward",
    width: 1080,
    height: 1350,
    note: "The shape that fills most of a phone screen in a chat.",
  },
  {
    key: "email",
    label: "Email header",
    width: 600,
    height: 200,
    note: "Six hundred wide is the width every email client agrees on.",
  },
  {
    key: "print",
    label: "A4, landscape",
    width: 3508,
    height: 2480,
    note: "300 dots per inch — a flyer or a certificate.",
  },
];

export function bannerSize(key: string): BannerSize {
  return BANNER_SIZES.find((size) => size.key === key) ?? BANNER_SIZES[0];
}

/** The four background treatments. Deliberately few, and all of them legible. */
export const BACKDROPS = [
  { key: "solid", label: "One colour" },
  { key: "gradient", label: "Gradient" },
  { key: "diagonal", label: "Diagonal split" },
  { key: "dots", label: "Soft dots" },
] as const;

export type BackdropKey = (typeof BACKDROPS)[number]["key"];

export const ALIGNMENTS = [
  { key: "left", label: "Left" },
  { key: "center", label: "Centred" },
] as const;

export type AlignmentKey = (typeof ALIGNMENTS)[number]["key"];

/**
 * The box the words must stay inside, in the banner's own units.
 *
 * A size with no safe area gets a modest margin instead of the whole canvas —
 * text touching the edge of an image reads as a mistake even where nothing
 * crops it.
 */
export function safeBox(size: BannerSize): {
  x: number;
  y: number;
  width: number;
  height: number;
} {
  const margins = size.safe ?? { top: 0.09, right: 0.09, bottom: 0.09, left: 0.09 };

  const x = size.width * margins.left;
  const y = size.height * margins.top;

  return {
    x,
    y,
    width: size.width - x - size.width * margins.right,
    height: size.height - y - size.height * margins.bottom,
  };
}

/**
 * How large the headline can be set.
 *
 * ---------------------------------------------------------------------------
 * **This is the calculation that makes the tool worth using.** The same words
 * go onto a 600×200 email header and a 2560×1440 channel banner, and a fixed
 * size is unreadable on one and comical on the other. So the type is sized from
 * the space it has and the number of characters in it — and then clamped,
 * because past a point a headline that grows is just a headline that wraps
 * badly.
 *
 * `perLine` is how many characters the longest line has.
 */
export function headlineSize(box: { width: number; height: number }, perLine: number, lines: number): number {
  /* Width first: the average character is about 0.55 of the type size across
     the faces offered, so this is the size at which the longest line just fits. */
  const byWidth = box.width / Math.max(perLine, 1) / 0.55;

  /* Then height: every line, plus the leading between them, has to fit in the
     safe box with room for a subline underneath. */
  const byHeight = (box.height * 0.62) / Math.max(lines, 1) / 1.2;

  return Math.max(12, Math.min(byWidth, byHeight));
}

/** The words, split the way they will actually be drawn. */
export function lines(text: string): string[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

/** The longest line, which is the one that decides the type size. */
export function longestLine(rows: string[]): number {
  return rows.reduce((longest, row) => Math.max(longest, row.length), 0);
}

export function bannerFileName(text: string, sizeKey: string, width: number, height: number, extension: string): string {
  const slug =
    text
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "banner";

  return `${slug}-${sizeKey}@${width}x${height}.${extension}`;
}
