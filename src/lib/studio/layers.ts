import { safeBox, type BannerSize } from "@/lib/studio/banner";
import { toRgb } from "@/lib/studio/logo";

/**
 * What a banner is made of, and what is wrong with it.
 *
 * ---------------------------------------------------------------------------
 * **The owner's objection, and what it actually asked for.**
 *
 *   > esme banner banana ka feel hi nhi aa raha h … proper banner bana sake …
 *   > usme ander jo bhi chej daalta h usko move karne ka do … jaise ki image
 *   > and video daalte h and unko jo h set kar sake … bss tumhara kaam hoga ki
 *   > guide karna ki ye yaha pe aacha lagega ya ye frame se bahar ja raha h ye
 *   > image sahi nhi h ya color pe text nhi show ho raha h … bina AI ka
 *
 * Two things, and the second is the harder one.
 *
 * **Pieces you can move.** The old tool took a headline and drew it in a fixed
 * place — which is a form, not a banner maker. A banner is things placed on a
 * rectangle, and placing them is the work.
 *
 * **Being told when something is wrong.** Not "make it pretty" — that needs a
 * designer. The failures that actually ruin a banner are all *measurable*: a
 * word past the edge, a headline in the part YouTube crops, grey text on a
 * mid-grey photograph, a 400-pixel logo stretched across 1500 pixels. Every one
 * of those is arithmetic, and every one is checked below.
 *
 * ---------------------------------------------------------------------------
 * **No model, no service, nothing sent anywhere.** The rules are contrast
 * ratios, rectangle intersections and pixel counts.
 *
 * ---------------------------------------------------------------------------
 * **Coordinates are in the banner's own units**, not pixels on screen. A layer
 * at x=100 is at x=100 whether the preview is drawn at a third of the size or
 * exported at 2560 across — so nothing moves when the size changes.
 */

export type LayerKind = "text" | "image" | "shape";

interface Base {
  id: string;
  kind: LayerKind;
  /** Top-left, in banner units. */
  x: number;
  y: number;
  width: number;
  height: number;
  /** Higher is nearer the front. */
  z: number;
  /** A locked layer cannot be dragged. For a background nobody meant to move. */
  locked?: boolean;
}

export interface TextLayer extends Base {
  kind: "text";
  text: string;
  /** Type size in banner units. */
  size: number;
  weight: number;
  colour: string;
  font: "display" | "sans" | "serif";
  align: "left" | "center" | "right";
  lineHeight: number;
}

export interface ImageLayer extends Base {
  kind: "image";
  /** A data URL. The file never leaves the browser. */
  src: string;
  /** What the file really is, so upscaling can be spotted. */
  naturalWidth: number;
  naturalHeight: number;
  /**
   * How it sits in its box.
   *
   * `contain` fits the whole picture and is the default, because the standing
   * rule in this estate is that an uploaded image is never cut. `cover` fills
   * the box and crops, and anything set to it is called out.
   */
  fit: "contain" | "cover";
  radius: number;
  /** The average colour, measured on load — what text over it has to survive. */
  averageColour: string;
  /** Where it came from, for the layer list. */
  label: string;
}

export interface ShapeLayer extends Base {
  kind: "shape";
  shape: "rect" | "circle";
  fill: string;
  radius: number;
  opacity: number;
}

export type Layer = TextLayer | ImageLayer | ShapeLayer;

/* -------------------------------------------------------------------------- */
/* Guidance                                                                   */
/* -------------------------------------------------------------------------- */

export type NoteLevel = "problem" | "warning" | "hint";

export interface Note {
  /** The layer it is about, or null for the banner as a whole. */
  layerId: string | null;
  level: NoteLevel;
  /** What is wrong, in the words somebody would use about it. */
  message: string;
  /** What to do. Every note has one; a warning with no remedy is a nag. */
  fix: string;
}

/** The contrast ratio between two colours, by the WCAG formula. */
export function contrastRatio(a: string, b: string): number {
  const luminance = (hex: string) => {
    const { r, g, b: blue } = toRgb(hex);

    const channel = (value: number) => {
      const v = value / 255;
      return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
    };

    return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(blue);
  };

  const first = luminance(a);
  const second = luminance(b);

  const lighter = Math.max(first, second);
  const darker = Math.min(first, second);

  return (lighter + 0.05) / (darker + 0.05);
}

/** Do these two rectangles overlap at all? */
function overlaps(a: Base, b: { x: number; y: number; width: number; height: number }): boolean {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

/**
 * A layer that covers the whole banner is a background, not a mistake.
 *
 * The safe-area rule exists to catch a *headline* placed where a phone crops
 * it. A full-bleed colour panel or photograph is meant to run past that edge —
 * running past it is the entire point — so warning about one would put a
 * warning on every properly built banner, and a tool that warns about correct
 * work is a tool people stop reading.
 */
function isBackdrop(layer: Base, size: BannerSize): boolean {
  return layer.width >= size.width * 0.9 && layer.height >= size.height * 0.9;
}

/** Is `a` wholly inside `b`? */
function inside(a: Base, b: { x: number; y: number; width: number; height: number }): boolean {
  /* Half a unit of tolerance: a layer dragged flush to the edge lands on
     coordinates like 0.4999 and is not "outside" in any sense a person means. */
  return (
    a.x >= b.x - 0.5 &&
    a.y >= b.y - 0.5 &&
    a.x + a.width <= b.x + b.width + 0.5 &&
    a.y + a.height <= b.y + b.height + 0.5
  );
}

/**
 * What is behind this layer.
 *
 * The nearest thing underneath it that has a colour: a shape, an image's
 * average, or failing both, the banner's own background. Text contrast is
 * judged against that, because it is what the reader's eye actually has to
 * separate the letters from.
 *
 * An average is a simplification and an honest one — a photograph with a light
 * corner and a dark corner will defeat any single number, and the note says so
 * rather than pretending to have measured every pixel.
 */
export function behind(layer: Layer, layers: Layer[], background: string): string {
  const underneath = layers
    .filter((other) => other.id !== layer.id && other.z < layer.z && overlaps(layer, other))
    .sort((a, b) => b.z - a.z);

  for (const other of underneath) {
    if (other.kind === "image") return other.averageColour;
    if (other.kind === "shape" && other.opacity > 0.7) return other.fill;
  }

  return background;
}

/**
 * Everything wrong with this banner, in the order worth fixing it.
 *
 * ---------------------------------------------------------------------------
 * **Only things that are measurably wrong.** Nothing here has an opinion about
 * whether a layout is attractive; every note is a fact with a number behind it,
 * which is what makes it worth reading. A tool that says "consider more
 * whitespace" is a tool people stop looking at.
 */
export function review(
  layers: Layer[],
  size: BannerSize,
  background: string,
): Note[] {
  const notes: Note[] = [];
  const frame = { x: 0, y: 0, width: size.width, height: size.height };
  const safe = safeBox(size);

  for (const layer of layers) {
    const name = describe(layer);

    /* ------------------------------------------------------- off the edge */
    if (!overlaps(layer, frame)) {
      notes.push({
        layerId: layer.id,
        level: "problem",
        message: `${name} is completely outside the banner.`,
        fix: "Drag it back in, or delete it — it will not appear in the file at all.",
      });
      continue;
    }

    if (!inside(layer, frame)) {
      notes.push({
        layerId: layer.id,
        level: "problem",
        message: `${name} runs off the edge of the banner.`,
        fix: "Part of it will be cut off in the downloaded file. Move it in or make it smaller.",
      });
    } else if (!inside(layer, safe) && size.safe && !isBackdrop(layer, size)) {
      notes.push({
        layerId: layer.id,
        level: "warning",
        message: `${name} is outside the part that is never cropped.`,
        fix: `${size.label} crops differently on a phone. Keep it inside the dotted box.`,
      });
    }

    /* ----------------------------------------------------------- text */
    if (layer.kind === "text") {
      if (!layer.text.trim()) {
        notes.push({
          layerId: layer.id,
          level: "warning",
          message: "An empty piece of text.",
          fix: "Type something into it, or delete it.",
        });
      }

      const backdrop = behind(layer, layers, background);
      const ratio = contrastRatio(layer.colour, backdrop);

      if (ratio < 3) {
        notes.push({
          layerId: layer.id,
          level: "problem",
          message: `${name} will not be readable on what is behind it.`,
          fix: "Use white or a near-black for the text, or put a shape behind it.",
        });
      } else if (ratio < 4.5) {
        notes.push({
          layerId: layer.id,
          level: "warning",
          message: `${name} is hard to read on what is behind it.`,
          fix: "It passes at large sizes and fails at small ones. A darker or lighter text colour fixes it.",
        });
      }

      /*
        Readable at the size it will be *seen*, not the size it is stored at.

        A banner is almost always shown smaller than its file: a 2560-wide
        channel banner appears about 1000 wide on a laptop. Sixteen pixels at
        that scale is the floor.
      */
      const shownAt = 1000 / size.width;
      if (layer.size * shownAt < 14) {
        notes.push({
          layerId: layer.id,
          level: "warning",
          message: `${name} will be about ${Math.round(layer.size * shownAt)} pixels tall on screen.`,
          fix: "Under fourteen is hard to read. Make the text larger.",
        });
      }

      const longest = layer.text
        .split("\n")
        .reduce((most, line) => Math.max(most, line.length), 0);

      if (longest * layer.size * 0.55 > layer.width * 1.02) {
        notes.push({
          layerId: layer.id,
          level: "problem",
          message: `${name} is wider than the box you have given it.`,
          fix: "Widen the box, shorten the line, or reduce the type size.",
        });
      }
    }

    /* ---------------------------------------------------------- image */
    if (layer.kind === "image") {
      if (layer.fit === "cover") {
        notes.push({
          layerId: layer.id,
          level: "warning",
          message: `${name} is set to fill its box, so part of it is cut off.`,
          fix: "Switch it to “fit the whole picture” unless the cropping is deliberate.",
        });
      }

      /*
        Upscaling, which is what makes an otherwise good banner look cheap.

        Compared against the *exported* size, not the preview — a picture that
        looks sharp at a third scale is the usual way this is missed.
      */
      if (layer.naturalWidth > 0) {
        const needed = layer.width;
        const ratio = layer.naturalWidth / needed;

        if (ratio < 0.75) {
          notes.push({
            layerId: layer.id,
            level: "problem",
            message: `${name} is only ${layer.naturalWidth} pixels wide and is being drawn ${Math.round(needed)} across.`,
            fix: "It will look soft and blocky. Use a larger file, or make it smaller here.",
          });
        } else if (ratio < 1) {
          notes.push({
            layerId: layer.id,
            level: "warning",
            message: `${name} is being stretched slightly beyond its real size.`,
            fix: "A little soft. A larger file would be sharper.",
          });
        }
      }

      const boxRatio = layer.width / Math.max(layer.height, 1);
      const realRatio = layer.naturalWidth / Math.max(layer.naturalHeight, 1);

      if (layer.fit === "contain" && Math.abs(boxRatio - realRatio) / realRatio > 0.25) {
        notes.push({
          layerId: layer.id,
          level: "hint",
          message: `${name} is a different shape from the box it is in.`,
          fix: "It is not distorted — there is space around it. Match the box to the picture for a tighter fit.",
        });
      }
    }
  }

  /* ------------------------------------------------------ the whole thing */

  const text = layers.filter((layer): layer is TextLayer => layer.kind === "text");

  if (text.length === 0) {
    notes.push({
      layerId: null,
      level: "hint",
      message: "There are no words on this banner.",
      fix: "Most banners need at least a name. Add a piece of text.",
    });
  }

  if (text.length > 4) {
    notes.push({
      layerId: null,
      level: "hint",
      message: `${text.length} separate pieces of text.`,
      fix: "A banner is read in about two seconds. Two or three lines is usually the limit.",
    });
  }

  /*
    Nothing at all in the safe area.

    A banner whose every element sits outside the part that is guaranteed to be
    seen is a banner that looks empty on a phone — and it is easy to do by
    accident on the sizes with a small safe area.
  */
  if (size.safe && layers.length > 0 && !layers.some((layer) => overlaps(layer, safe))) {
    notes.push({
      layerId: null,
      level: "problem",
      message: "Nothing is inside the part that is never cropped.",
      fix: `On ${size.label} this will look empty on a phone. Move things into the dotted box.`,
    });
  }

  /* Problems first: somebody fixing three things should fix the one that
     breaks the file before the one that is merely tight. */
  const order: Record<NoteLevel, number> = { problem: 0, warning: 1, hint: 2 };
  return notes.sort((a, b) => order[a.level] - order[b.level]);
}

/** What to call a layer in a sentence. */
export function describe(layer: Layer): string {
  if (layer.kind === "text") {
    const words = layer.text.trim().split(/\s+/).slice(0, 3).join(" ");
    return words ? `“${words}${layer.text.trim().split(/\s+/).length > 3 ? "…" : ""}”` : "A piece of text";
  }

  if (layer.kind === "image") return layer.label || "An image";

  return layer.shape === "circle" ? "A circle" : "A panel";
}

/**
 * A layer moved, and kept somewhere it can be found again.
 *
 * A layer dragged entirely off the canvas is invisible and un-draggable — it
 * cannot be brought back without the layer list. So a quarter of it is always
 * kept on the banner, which is the smallest amount somebody can still grab.
 */
export function moved(layer: Layer, x: number, y: number, size: BannerSize): Layer {
  const keep = 0.25;

  return {
    ...layer,
    x: clamp(x, -layer.width * (1 - keep), size.width - layer.width * keep),
    y: clamp(y, -layer.height * (1 - keep), size.height - layer.height * keep),
  };
}

/** A layer resized, never to nothing. */
export function resized(layer: Layer, width: number, height: number): Layer {
  /* Twelve units is about a finger's width at the size these are edited. Below
     that a layer cannot be grabbed to make it bigger again. */
  return { ...layer, width: Math.max(12, width), height: Math.max(12, height) };
}

function clamp(value: number, low: number, high: number): number {
  return Math.min(Math.max(value, low), high);
}

/** An id that will not collide, without a dependency. */
export function layerId(): string {
  return `l${Date.now().toString(36)}${Math.floor(Math.random() * 1e6).toString(36)}`;
}
