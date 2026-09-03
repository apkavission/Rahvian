import { buildMark, type GeneratedMark, type MarkKind } from "@/lib/studio/mark-shapes";
import { LAYOUTS, readableOn, type FontKey, type LayoutKey } from "@/lib/studio/logo";
import { nearbySeed, rng, type Rng } from "@/lib/studio/seed";

/**
 * A whole logo, grown from one number.
 *
 * ---------------------------------------------------------------------------
 * **What the owner asked for, and what each part of it needs.**
 *
 *   > mujhe jo h unquie logo design chaiye … har baar refresh ka dena me
 *   > refresh karu to new logo aaye … jo logo mujhe pasand aa gaya h usko
 *   > select kar saku … aur bolu ki esse aur aacha bano to same usi jaisa aur
 *   > aacha banana h … bina AI ka
 *
 * Three separate things, and they are only possible together:
 *
 * **Unique** means the design cannot come from a list. It is described by
 * numbers — which family of mark, how many arms, how thick, what hue, how far
 * apart — and the numbers come from a seed.
 *
 * **Refresh** is a new seed. Five of them is five designs nobody has seen.
 *
 * **"More like this, better"** is the one that makes it a tool rather than a
 * slot machine, and it is why everything below is a *decision* with a name.
 * Keeping a design means keeping its decisions; asking for more like it means
 * holding the ones that give it its character — the family of mark, the
 * arrangement, the hue — and re-rolling only the rest. Move everything and you
 * get five strangers. Move nothing and you get the same logo five times.
 *
 * No model, no service, nothing sent anywhere. It is arithmetic.
 */

export interface LogoRecipe {
  /** The design's name. The same seed always draws the same logo. */
  seed: number;
  layout: LayoutKey;
  font: FontKey;
  mark: GeneratedMark;
  accent: string;
  ink: string;
  /** How large the mark is against the name. */
  markScale: number;
  /** Space between the mark and the name, in cap heights. */
  gap: number;
  /** How round the monogram tile is, as a fraction of its size. */
  tileRadius: number;
  /** Letter-spacing for the name, in ems. */
  tracking: number;
  /**
   * The hue the palette was built from, in degrees.
   *
   * Kept rather than recovered from the accent afterwards. Converting a hex
   * back to a hue is lossy at low saturation — a near-grey ink has no
   * meaningful hue at all — and "which colour family is this" is the single
   * thing a variation must hold steady.
   */
  hue: number;
}

/**
 * What a variation holds still.
 *
 * Named rather than a set of booleans in the studio, because "keep the family
 * and the hue, move everything else" is a sentence somebody can check against
 * what they see on screen.
 */
export interface Hold {
  layout?: LayoutKey;
  markKind?: MarkKind;
  /** The hue in degrees, so a variation stays recognisably the same colour. */
  hue?: number;
  font?: FontKey;
}

/* -------------------------------------------------------------------------- */
/* Colour                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Hues that are usable for a business, rather than the whole wheel.
 *
 * The gaps are deliberate. Yellow-greens around 70–90° and the muddy oranges
 * near 40° are very hard to make work as a brand colour at the saturations that
 * survive on a screen — they read as either highlighter or illness. Leaving
 * them out means every refresh gives five colours somebody could actually use,
 * which matters far more than covering the spectrum.
 */
const HUE_BANDS: ReadonlyArray<readonly [number, number]> = [
  [188, 205], // teal
  [206, 232], // blue
  [233, 262], // indigo
  [263, 290], // violet
  [291, 330], // magenta
  [331, 358], // red
  [12, 32], // orange, warm side only
  [96, 150], // green
  [151, 187], // sea green
];

/** A colour from a hue, in a saturation and lightness that behave. */
function colour(hue: number, saturation: number, lightness: number): string {
  return hslToHex(hue, saturation, lightness);
}

function hslToHex(hue: number, saturation: number, lightness: number): string {
  const s = saturation / 100;
  const l = lightness / 100;

  const k = (n: number) => (n + hue / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));

  const channel = (n: number) =>
    Math.round(255 * f(n))
      .toString(16)
      .padStart(2, "0");

  return `#${channel(0)}${channel(8)}${channel(4)}`;
}

/**
 * An accent and an ink that belong together and can be read.
 *
 * The ink is the same hue at very low lightness rather than black. Pure black
 * beside a coloured mark reads as two unrelated decisions; a near-black carrying
 * a trace of the accent reads as one.
 *
 * Lightness is capped so the accent always takes readable letters — the
 * monogram sets its own letter colour from `readableOn`, and an accent that
 * sits on the boundary makes that choice flicker between designs that look the
 * same.
 */
function palette(random: Rng, forcedHue?: number): { accent: string; ink: string; hue: number } {
  const hue = forcedHue ?? pickHue(random);

  /* Deep enough to take white text, or light enough to take black — never the
     ambiguous middle. */
  const deep = random.chance(0.78);

  const saturation = deep ? random.int(58, 82) : random.int(62, 88);
  const lightness = deep ? random.int(28, 42) : random.int(62, 72);

  const accent = colour(hue, saturation, lightness);

  return {
    accent,
    ink: colour(hue, random.int(14, 26), random.int(11, 17)),
    hue,
  };
}

function pickHue(random: Rng): number {
  const [from, to] = random.pick(HUE_BANDS);
  return random.int(from, to);
}

/* -------------------------------------------------------------------------- */
/* The recipe                                                                 */
/* -------------------------------------------------------------------------- */

const LAYOUT_KEYS = LAYOUTS.map((layout) => layout.key);

const FONT_WEIGHTS: ReadonlyArray<readonly [FontKey, number]> = [
  ["display", 10],
  ["sans", 8],
  ["serif", 5],
];

export function generate(seed: number, hold: Hold = {}): LogoRecipe {
  const random = rng(seed);

  const { accent, ink, hue } = palette(random, hold.hue);

  const layout = hold.layout ?? random.pick(LAYOUT_KEYS);
  const font = hold.font ?? random.weighted(FONT_WEIGHTS);

  /*
    The "no mark" case is gone, and deliberately.

    It was one of nine options, so a ninth of the designs were a wordmark with
    nothing to distinguish them — five refreshes and somebody would see the same
    plain name twice. The `underline` layout is the typographic answer and it is
    a *choice*, which is different from a mark that failed to appear.
  */
  const mark = buildMark(random, hold.markKind);

  return {
    seed,
    layout,
    font,
    mark,
    accent,
    ink,

    /* Sized against the cap height. The monogram ignores this — it is all mark
       — but everything else reads as badly proportioned if it drifts. */
    markScale: random.float(1.15, 1.45),
    gap: random.float(0.28, 0.42),
    tileRadius: random.float(0.14, 0.32),
    tracking: random.float(-0.03, -0.005),
    hue,
  };
}

/**
 * Five designs, from one press of the button.
 *
 * Deliberately spread rather than five neighbours: the first look should show
 * how wide the range is, so somebody knows there is something to choose
 * *between*. Narrowing happens afterwards, with "more like this".
 */
export function generateSet(seed: number, count = 5, hold: Hold = {}): LogoRecipe[] {
  const out: LogoRecipe[] = [];
  const spread = rng(seed);

  const seen = new Set<string>();

  while (out.length < count) {
    const candidate = generate(Math.floor(spread.next() * 2_147_483_647) + 1, hold);

    /*
      Two designs that differ only in a number nobody can see are one design
      shown twice. Family, arrangement and hue together are what a person
      actually distinguishes, so that triple is what has to be unique.
    */
    const signature = `${candidate.layout}:${candidate.mark.kind}:${Math.round(candidate.hue / 24)}`;

    if (seen.has(signature)) continue;

    seen.add(signature);
    out.push(candidate);
  }

  return out;
}

/**
 * More like this one, and better.
 *
 * ---------------------------------------------------------------------------
 * **What is held, and why those three.**
 *
 * The family of mark, the arrangement, and the hue. Those are what somebody
 * means when they point at a design and say "like that": they are not asking
 * for that exact ring at that exact thickness, they are asking for another ring
 * logo in that blue. Everything else — the thickness, the gap, the rotation,
 * the number of arms, the exact shade, the lettering — moves.
 *
 * Holding more than three gives five copies of the same thing. Holding fewer
 * gives five strangers, which is what "refresh" is for.
 *
 * The child seeds come from the parent, so the same design always produces the
 * same variations. Somebody who liked the third one and comes back tomorrow
 * finds the third one.
 */
export function vary(parent: LogoRecipe, count = 5): LogoRecipe[] {
  /*
    The mark family is held only when the mark is actually drawn.

    Three of the five arrangements never show it: a monogram and a badge are
    initials inside a shape, and a wordmark with a rule has no mark at all. On
    those, holding the family spends the one thing that would have made the five
    variations look different — the result was five brown tiles differing in
    corner radius, which reads as a button that does nothing.

    So on those layouts everything visible moves: the shade, the corner, the
    lettering. On the two that do draw a mark, the family is exactly what
    "like this one" means.
  */
  const drawsMark = parent.layout === "beside" || parent.layout === "stacked";

  const hold: Hold = {
    layout: parent.layout,
    hue: parent.hue,
    ...(drawsMark ? { markKind: parent.mark.kind } : {}),
  };

  const out: LogoRecipe[] = [];

  for (let step = 1; out.length < count; step += 1) {
    const child = generate(nearbySeed(parent.seed, step), hold);

    /* A variation identical to its parent is not a variation. */
    if (sameDrawing(child, parent, drawsMark)) continue;

    out.push(child);

    /* A guard against a family with very few degrees of freedom — a filled
       triangle, say — looping for ever looking for a difference. */
    if (step > count * 8) break;
  }

  return out;
}

/**
 * Would these two draw the same picture?
 *
 * `drawsMark` matters: on a monogram the mark is not on screen, so two recipes
 * with different marks and the same colour and corner are the same picture, and
 * offering both is offering one design twice.
 */
function sameDrawing(a: LogoRecipe, b: LogoRecipe, drawsMark: boolean): boolean {
  if (a.accent !== b.accent || a.font !== b.font) return false;

  if (!drawsMark) {
    /* What is visible on an initials layout: the shade, the corner, the face. */
    return Math.abs(a.tileRadius - b.tileRadius) < 0.02;
  }

  return (
    a.mark.strokeWidth === b.mark.strokeWidth &&
    a.mark.solid.join("|") === b.mark.solid.join("|") &&
    a.mark.outline.join("|") === b.mark.outline.join("|")
  );
}

/** Whether the letters inside this accent will be white or black. */
export function letterColour(recipe: LogoRecipe): string {
  return readableOn(recipe.accent);
}
