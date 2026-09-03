/**
 * The decisions behind a logo, separated from the drawing of one.
 *
 * ---------------------------------------------------------------------------
 * **Why this file has no markup in it.**
 *
 * The preview on screen and the file that gets downloaded have to be the same
 * logo. The reliable way to guarantee that is not to draw it twice: the studio
 * renders one `<svg>` element, and the download serialises that same element.
 * So there is no "export version" here — only the choices a person makes and
 * the arithmetic those choices imply, which is the part worth testing.
 *
 * ---------------------------------------------------------------------------
 * **Everything is worked out from the text.** Somebody types "dental" and gets
 * five finished designs. Nothing below asks them for a letter height, a
 * baseline or a viewBox, because those are the questions that make a design
 * tool feel like a chore rather than a result.
 */

/** The five arrangements. Five, because the brief said five. */
export const LAYOUTS = [
  {
    key: "beside",
    label: "Mark beside the name",
    /** What it is good for, said plainly on the screen. */
    note: "The usual one. Reads well in a website header and on a letterhead.",
  },
  {
    key: "stacked",
    label: "Mark above the name",
    note: "For a square space — a profile picture, an app icon, a stamp.",
  },
  {
    key: "monogram",
    label: "Initials in a block",
    note: "Works at any size, including a browser tab. Often the whole identity.",
  },
  {
    key: "badge",
    label: "Initials in a circle",
    note: "Softer. Common for clinics, schools and anything long-established.",
  },
  {
    key: "underline",
    label: "Name with a rule",
    note: "No mark at all. Typographic, and the hardest to get wrong.",
  },
] as const;

export type LayoutKey = (typeof LAYOUTS)[number]["key"];

/** The three voices. Deliberately three, not a font menu. */
export const FONTS = [
  {
    key: "display",
    label: "Confident",
    stack: "'Poppins', 'Segoe UI', system-ui, sans-serif",
    weight: 700,
    /** Extra letter spacing, in ems, for this face at logo sizes. */
    tracking: -0.02,
  },
  {
    key: "sans",
    label: "Plain",
    stack: "'Inter', 'Segoe UI', system-ui, sans-serif",
    weight: 600,
    tracking: -0.01,
  },
  {
    key: "serif",
    label: "Established",
    stack: "Georgia, 'Times New Roman', serif",
    weight: 700,
    tracking: 0,
  },
] as const;

export type FontKey = (typeof FONTS)[number]["key"];

export function fontFor(key: FontKey) {
  return FONTS.find((font) => font.key === key) ?? FONTS[0];
}

/**
 * The letters that go in the mark.
 *
 * One word gives one letter; two or more give two. Not three — three initials
 * in a 32-pixel favicon is a grey smudge, and the favicon is the size that
 * decides whether a monogram works at all.
 *
 * Words that are not names are skipped: "The Smile Care Clinic" is SC, not TS.
 * A logo built from "the" is the kind of small wrongness somebody notices
 * immediately and cannot explain, which is worse than a plainly wrong one.
 */
const SKIPPED = new Set([
  "the", "a", "an", "and", "of", "for", "&", "by", "at", "on", "in",
  "pvt", "ltd", "llp", "inc", "co", "company", "limited", "private",
]);

export function initials(text: string): string {
  /*
    A hyphen joins, it does not separate.

    "north-field school" is Northfield School — two words, NS. Splitting on the
    hyphen made it three and answered NF, which is the initials of a company
    that does not exist. Spaces, slashes and punctuation still separate.
  */
  const words = text
    .split(/[\s_/,.]+/)
    .map((word) => word.replace(/[^\p{L}\p{N}]/gu, ""))
    .filter(Boolean);

  const meaningful = words.filter((word) => !SKIPPED.has(word.toLowerCase()));

  /* Everything was a skipped word — "The Co." — so fall back to what was
     actually typed rather than returning nothing. A blank mark reads as a bug. */
  const source = meaningful.length > 0 ? meaningful : words;

  if (source.length === 0) return "";
  if (source.length === 1) {
    return source[0].slice(0, 1).toUpperCase();
  }

  return (source[0].slice(0, 1) + source[1].slice(0, 1)).toUpperCase();
}

/**
 * The name as it should be set.
 *
 * Collapsed whitespace and trimmed, because a trailing space in a logo is
 * invisible on screen and shifts everything when it is centred.
 */
export function wordmark(text: string): string {
  return text.trim().replace(/\s+/g, " ");
}

/**
 * How wide the name will be, at a font size of 100.
 *
 * ---------------------------------------------------------------------------
 * **An estimate, and it has to be.** Text in an SVG is laid out by whoever
 * opens the file, so the real width is not knowable here — and the alternative,
 * measuring in a canvas, cannot run while the server renders the first frame.
 *
 * What this is for is the viewBox. Too wide is a slightly generous margin; too
 * narrow **clips the name in the downloaded file**, where nobody sees it until
 * a client does. So it errs generous, deliberately, and the drawn text is
 * centred inside whatever it returns.
 *
 * ---------------------------------------------------------------------------
 * **The numbers below were measured, not guessed.**
 *
 * The first version used one ratio per face and a rough narrow/wide split. It
 * under-estimated Georgia bold by sixteen per cent, and "Smile Care Dental"
 * came out of the studio as "Smile Care Dent". The ratios here are fitted
 * against real `getComputedTextLength` measurements of six sample names in all
 * three faces — see `logo.test.ts`, which pins those measurements so a change
 * to the type stack cannot quietly reintroduce the clipping.
 *
 * Capitals are counted separately because a short name is mostly capitals, and
 * treating them as average letters is what made "Kora" too narrow while longer
 * names were fine.
 */

/** Fitted from measured text, per face, at weight 600–700. */
const PER_CHARACTER = { display: 0.58, sans: 0.6, serif: 0.66 } as const;

/** How each kind of character compares with an average one. */
const NARROW = 0.55;

/*
  1.6, not 1.45.

  An `m` is wider than a rough "half again" in all three faces — measured at
  0.90em in Inter, 0.92em in Poppins and 1.02em in Georgia. The lower figure
  under-estimated a name full of them, which is a clipped file rather than a
  slightly tight one.
*/
const WIDE = 1.6;
const SPACE = 0.42;
const CAPITAL = 1.15;

/**
 * A margin on top of the fit.
 *
 * Six per cent. The fit is close on long names and closest to short on names
 * that are almost all capitals, so this is the difference between "usually
 * right" and "never clips" — and only one of those is acceptable in a file
 * somebody sends to a printer.
 */
const GENEROUS = 1.06;

export function estimateWidth(text: string, font: FontKey): number {
  let units = 0;

  for (const character of text) {
    if (character === " ") units += SPACE;
    else if ("ijltIfr!.,;:'".includes(character)) units += NARROW;
    else if ("mwMW".includes(character)) units += WIDE;
    else if (character >= "A" && character <= "Z") units += CAPITAL;
    else units += 1;
  }

  return units * PER_CHARACTER[font] * 100 * GENEROUS;
}

/**
 * The sizes a logo is actually asked for.
 *
 * Not a free number box. Somebody who needs a favicon needs 32 pixels, and a
 * tool that makes them find that out elsewhere has left the job half done.
 */
export const LOGO_SIZES = [
  { key: "favicon", label: "Browser tab", width: 32, height: 32, square: true,
    note: "favicon.ico and icon.png" },
  { key: "apple", label: "Phone home screen", width: 180, height: 180, square: true,
    note: "apple-touch-icon" },
  { key: "app-192", label: "App icon", width: 192, height: 192, square: true,
    note: "Android and PWA" },
  { key: "app-512", label: "App icon, large", width: 512, height: 512, square: true,
    note: "Play Store and splash screens" },
  { key: "profile", label: "Profile picture", width: 1024, height: 1024, square: true,
    note: "WhatsApp, Instagram, Google Business" },
  { key: "header", label: "Website header", width: 600, height: 200, square: false,
    note: "Two hundred tall is plenty; it is scaled down in the page" },
  { key: "header-2x", label: "Website header, sharp", width: 1200, height: 400, square: false,
    note: "For a retina screen — the same logo at twice the pixels" },
  { key: "letterhead", label: "Letterhead and invoices", width: 1600, height: 400, square: false,
    note: "Prints cleanly at A4 width" },
] as const;

export type SizeKey = (typeof LOGO_SIZES)[number]["key"];

/**
 * Palettes that already work, offered before the colour picker.
 *
 * The picker is there — the brief asked for it — but a blank picker is a
 * question most people cannot answer, and the answer they give is usually a
 * colour that fails against white text. These are starting points that do not.
 */
export const PALETTES = [
  { key: "teal", label: "Teal", accent: "#0f766e", ink: "#0b2b28", paper: "#ffffff" },
  { key: "indigo", label: "Indigo", accent: "#4338ca", ink: "#1e1b4b", paper: "#ffffff" },
  { key: "crimson", label: "Crimson", accent: "#be123c", ink: "#3f0716", paper: "#ffffff" },
  { key: "forest", label: "Forest", accent: "#15803d", ink: "#052e16", paper: "#ffffff" },
  { key: "amber", label: "Amber", accent: "#b45309", ink: "#3b1e05", paper: "#ffffff" },
  { key: "slate", label: "Slate", accent: "#334155", ink: "#0f172a", paper: "#ffffff" },
  { key: "midnight", label: "On dark", accent: "#2dd4bf", ink: "#f8fafc", paper: "#0b1120" },
] as const;

/**
 * Black or white, whichever can be read on this colour.
 *
 * The relative-luminance formula from WCAG, not a lightness eyeball. A mid
 * green and a mid blue look equally dark and are not: white text is legible on
 * one and marginal on the other, and this is the difference between a logo that
 * passes an accessibility check and one that gets rebuilt.
 */
export function readableOn(hex: string): "#ffffff" | "#111111" {
  const { r, g, b } = toRgb(hex);

  const channel = (value: number) => {
    const v = value / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };

  const luminance = 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);

  /* 0.179 is where the contrast ratio against white and against black are
     equal. Above it, black wins; below it, white. */
  return luminance > 0.179 ? "#111111" : "#ffffff";
}

/** `#abc`, `#aabbcc`, or anything else — which answers mid grey rather than throwing. */
export function toRgb(hex: string): { r: number; g: number; b: number } {
  const clean = hex.trim().replace(/^#/, "");

  if (/^[0-9a-f]{3}$/i.test(clean)) {
    return {
      r: Number.parseInt(clean[0] + clean[0], 16),
      g: Number.parseInt(clean[1] + clean[1], 16),
      b: Number.parseInt(clean[2] + clean[2], 16),
    };
  }

  if (/^[0-9a-f]{6}$/i.test(clean)) {
    return {
      r: Number.parseInt(clean.slice(0, 2), 16),
      g: Number.parseInt(clean.slice(2, 4), 16),
      b: Number.parseInt(clean.slice(4, 6), 16),
    };
  }

  /* A half-typed colour, mid-edit. The preview must keep drawing rather than
     blanking on every keystroke that is not yet a valid hex. */
  return { r: 128, g: 128, b: 128 };
}

/** The same colour, lightened towards white. For soft backdrops behind a mark. */
export function soften(hex: string, amount = 0.88): string {
  const { r, g, b } = toRgb(hex);
  const mix = (value: number) => Math.round(value + (255 - value) * amount);

  return `#${[mix(r), mix(g), mix(b)].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

/**
 * A file name somebody can find again.
 *
 * `smile-care-dental-header@1200x400.png` says what it is in a downloads folder
 * six weeks later, which `logo (3).png` does not.
 */
export function fileName(text: string, sizeKey: string, width: number, height: number, extension: string): string {
  const slug =
    wordmark(text)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "logo";

  return `${slug}-${sizeKey}@${width}x${height}.${extension}`;
}
