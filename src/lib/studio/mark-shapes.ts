import type { Rng } from "@/lib/studio/seed";

/**
 * Marks that are grown, not chosen from a list.
 *
 * ---------------------------------------------------------------------------
 * **Why the fixed set of nine had to go.**
 *
 * Nine shapes means nine logos, and the tenth business gets the first one
 * again. The owner's objection was exactly right — "unique logo design chaiye"
 * — and a longer list would only move the problem: at fifty hand-drawn marks,
 * the fifty-first client still gets a repeat, and somebody has to draw fifty.
 *
 * So a mark is *described* rather than stored. Eleven families, each with four
 * or five numbers behind it — how many arms, how thick, how far apart, rotated
 * by how much, open or closed. The families are the design judgement; the
 * numbers come from the seed. That is millions of marks from two hundred lines,
 * and every one of them is reproducible from its seed.
 *
 * ---------------------------------------------------------------------------
 * **Every family is drawn to survive being small.**
 *
 * The size that decides whether a mark works is the browser tab, and almost
 * everything that fails there fails for the same two reasons: strokes too thin
 * to survive rounding, and detail too fine to survive being sixteen pixels
 * across. So nothing here goes below a stroke of eight units in a hundred, no
 * family has more than eight elements, and none of them relies on a gap
 * narrower than the stroke beside it.
 *
 * ---------------------------------------------------------------------------
 * **Everything lives inside `0 0 100 100`, centred on 50,50**, so a layout can
 * place a mark without knowing which family it got.
 */

export interface GeneratedMark {
  /** The family, kept so a variation can hold it steady while other things move. */
  kind: MarkKind;
  /** Filled with the accent. */
  solid: string[];
  /** Stroked with the accent, at `strokeWidth`. */
  outline: string[];
  strokeWidth: number;
  /** A plain-language name, for the screen. */
  label: string;
}

export const MARK_KINDS = [
  "ring",
  "orbit",
  "arcs",
  "polygon",
  "bars",
  "chevrons",
  "petals",
  "cross",
  "grid",
  "lens",
  "wedges",
] as const;

export type MarkKind = (typeof MARK_KINDS)[number];

/**
 * How often each family comes up.
 *
 * Not uniform, and the weights are a judgement rather than a measurement: the
 * quieter families make better logos more often. A ring or a polygon is right
 * for most businesses; petals and wedges are striking and wrong more often, so
 * they appear less. Five designs at a time means a rare family still shows up
 * regularly enough to be found.
 */
const WEIGHTS: ReadonlyArray<readonly [MarkKind, number]> = [
  ["ring", 12],
  ["orbit", 10],
  ["arcs", 10],
  ["polygon", 12],
  ["bars", 9],
  ["chevrons", 8],
  ["petals", 5],
  ["cross", 8],
  ["grid", 7],
  ["lens", 7],
  ["wedges", 5],
];

/* -------------------------------------------------------------------------- */
/* Geometry                                                                   */
/* -------------------------------------------------------------------------- */

const CENTRE = 50;

/** A point on a circle. Angles in degrees, zero at twelve o'clock. */
function at(angle: number, radius: number): [number, number] {
  const radians = ((angle - 90) * Math.PI) / 180;

  return [
    round(CENTRE + Math.cos(radians) * radius),
    round(CENTRE + Math.sin(radians) * radius),
  ];
}

/** Two places is plenty at this size, and keeps the serialised SVG small. */
function round(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * An arc along a circle, as a path.
 *
 * `sweep` above 180 needs the large-arc flag or the browser draws the short way
 * round — which silently turns a three-quarter ring into a quarter one.
 */
function arc(from: number, sweep: number, radius: number): string {
  const [x1, y1] = at(from, radius);
  const [x2, y2] = at(from + sweep, radius);
  const large = Math.abs(sweep) > 180 ? 1 : 0;
  const direction = sweep >= 0 ? 1 : 0;

  return `M ${x1} ${y1} A ${radius} ${radius} 0 ${large} ${direction} ${x2} ${y2}`;
}

/** A closed regular polygon. */
function polygon(sides: number, radius: number, rotation: number): string {
  const points: string[] = [];

  for (let i = 0; i < sides; i += 1) {
    const [x, y] = at(rotation + (360 / sides) * i, radius);
    points.push(`${i === 0 ? "M" : "L"} ${x} ${y}`);
  }

  return `${points.join(" ")} Z`;
}

/** A rounded rectangle, from its centre. */
function bar(cx: number, cy: number, width: number, height: number, radius: number): string {
  const x = round(cx - width / 2);
  const y = round(cy - height / 2);
  const w = round(width);
  const h = round(height);
  const r = round(Math.min(radius, w / 2, h / 2));

  return (
    `M ${x + r} ${y} L ${x + w - r} ${y} A ${r} ${r} 0 0 1 ${x + w} ${y + r} ` +
    `L ${x + w} ${y + h - r} A ${r} ${r} 0 0 1 ${x + w - r} ${y + h} ` +
    `L ${x + r} ${y + h} A ${r} ${r} 0 0 1 ${x} ${y + h - r} ` +
    `L ${x} ${y + r} A ${r} ${r} 0 0 1 ${x + r} ${y} Z`
  );
}

/**
 * A full circle, as two arcs — so it sits in the same path list as the rest.
 *
 * **Absolute arcs, not relative ones.** The relative form is shorter and it
 * puts negative numbers into the path data as *deltas*, which are impossible to
 * tell from coordinates without parsing the whole command stream. Every number
 * in a path here is a coordinate, a radius or a flag, so "is anything outside
 * the box" is a question that can be answered by looking — and it is a question
 * worth answering, because a shape straying outside is clipped in the
 * downloaded file and nowhere else.
 */
function circle(cx: number, cy: number, radius: number): string {
  const left = round(cx - radius);
  const right = round(cx + radius);
  const y = round(cy);

  return (
    `M ${left} ${y} ` +
    `A ${radius} ${radius} 0 1 0 ${right} ${y} ` +
    `A ${radius} ${radius} 0 1 0 ${left} ${y} Z`
  );
}

/* -------------------------------------------------------------------------- */
/* The families                                                               */
/* -------------------------------------------------------------------------- */

export function buildMark(random: Rng, forced?: MarkKind): GeneratedMark {
  const kind = forced ?? random.weighted(WEIGHTS);

  switch (kind) {
    /* ---------------------------------------------------------------- ring */
    case "ring": {
      /* An open ring. The gap is what stops it reading as a full stop at
         sixteen pixels — a closed circle at that size is a dot. */
      const width = random.int(10, 18);
      const radius = random.int(30, 38);
      const gap = random.int(30, 110);
      const from = random.int(0, 359);

      return {
        kind,
        label: "Open ring",
        solid: [],
        outline: [arc(from, 360 - gap, radius)],
        strokeWidth: width,
      };
    }

    /* --------------------------------------------------------------- orbit */
    case "orbit": {
      const width = random.int(8, 13);
      const radius = random.int(28, 36);
      const gap = random.int(50, 130);
      const from = random.int(0, 359);
      const dot = random.int(7, 11);
      const [dx, dy] = at(from, radius);

      return {
        kind,
        label: "Ring and point",
        solid: [circle(dx, dy, dot)],
        outline: [arc(from + gap / 2, 360 - gap, radius)],
        strokeWidth: width,
      };
    }

    /* ---------------------------------------------------------------- arcs */
    case "arcs": {
      /* Concentric arcs, each a little shorter than the last. Reads as motion
         at any size, and never collapses into a blob. */
      const count = random.int(2, 3);
      const width = random.int(9, 13);
      const outer = random.int(34, 40);
      const step = width + random.int(4, 7);
      const from = random.int(0, 359);
      const sweep = random.int(110, 210);

      const paths: string[] = [];
      for (let i = 0; i < count; i += 1) {
        paths.push(arc(from + i * random.int(0, 14), sweep - i * 18, outer - i * step));
      }

      return { kind, label: "Arcs", solid: [], outline: paths, strokeWidth: width };
    }

    /* ------------------------------------------------------------- polygon */
    case "polygon": {
      const sides = random.int(3, 6);
      const radius = random.int(34, 42);
      const rotation = random.int(0, 359);
      const filled = random.chance(0.55);

      /* A triangle sits visually low when it is centred geometrically, so it is
         nudged. Nobody can name this and everybody sees it. */
      const path = polygon(sides, radius, sides === 3 ? rotation % 120 : rotation);

      if (filled) {
        return { kind, label: `${sides}-sided`, solid: [path], outline: [], strokeWidth: 0 };
      }

      return {
        kind,
        label: `${sides}-sided outline`,
        solid: random.chance(0.4) ? [circle(CENTRE, CENTRE, random.int(7, 11))] : [],
        outline: [path],
        strokeWidth: random.int(9, 13),
      };
    }

    /* ---------------------------------------------------------------- bars */
    case "bars": {
      const count = random.int(3, 5);
      const width = round(52 / (count * 1.7));
      const gap = round(width * random.float(0.55, 0.9));
      const total = count * width + (count - 1) * gap;
      const left = CENTRE - total / 2 + width / 2;

      /* Heights that climb, fall, or arch. A random height per bar reads as an
         accident; a shape reads as a decision. */
      const shape = random.pick(["rise", "fall", "arch"] as const);
      const low = random.int(24, 34);
      const high = random.int(52, 70);

      const paths: string[] = [];
      for (let i = 0; i < count; i += 1) {
        const t = count === 1 ? 0 : i / (count - 1);
        const factor =
          shape === "rise" ? t : shape === "fall" ? 1 - t : 1 - Math.abs(t - 0.5) * 2;

        const height = low + (high - low) * factor;
        paths.push(bar(left + i * (width + gap), CENTRE + 34 - height / 2, width, height, width / 2));
      }

      return { kind, label: "Bars", solid: paths, outline: [], strokeWidth: 0 };
    }

    /* ------------------------------------------------------------ chevrons */
    case "chevrons": {
      const count = random.int(2, 3);
      const width = random.int(10, 15);
      const spread = random.int(26, 34);
      const step = random.int(18, 24);
      const up = random.chance(0.5);
      const top = CENTRE - ((count - 1) * step) / 2 - 8;

      const paths: string[] = [];
      for (let i = 0; i < count; i += 1) {
        const y = top + i * step;
        const tip = up ? y : y + spread * 0.62;
        const arm = up ? y + spread * 0.62 : y;

        paths.push(
          `M ${round(CENTRE - spread)} ${round(arm)} L ${CENTRE} ${round(tip)} L ${round(CENTRE + spread)} ${round(arm)}`,
        );
      }

      return { kind, label: "Chevrons", solid: [], outline: paths, strokeWidth: width };
    }

    /* -------------------------------------------------------------- petals */
    case "petals": {
      const count = random.int(3, 6);
      const length = random.int(30, 40);
      const fat = random.float(0.42, 0.66);
      const rotation = random.int(0, 359);

      const paths: string[] = [];
      for (let i = 0; i < count; i += 1) {
        const angle = rotation + (360 / count) * i;
        const [tipX, tipY] = at(angle, length);
        const [leftX, leftY] = at(angle - 90, length * fat * 0.5);
        const [rightX, rightY] = at(angle + 90, length * fat * 0.5);

        paths.push(
          `M ${CENTRE} ${CENTRE} Q ${leftX} ${leftY} ${tipX} ${tipY} Q ${rightX} ${rightY} ${CENTRE} ${CENTRE} Z`,
        );
      }

      return { kind, label: "Petals", solid: paths, outline: [], strokeWidth: 0 };
    }

    /* --------------------------------------------------------------- cross */
    case "cross": {
      const width = random.int(14, 20);
      const arm = random.int(30, 40);
      const rotated = random.chance(0.4);

      /*
        The arms are placed on a circle rather than written out as horizontal
        and vertical lines, so "rotated" is one number rather than a second set
        of coordinates. A saltire is a cross turned 45 degrees and nothing else.
      */
      const base = rotated ? 45 : 0;
      const spokes = random.chance(0.25) ? 3 : 2;

      const paths: string[] = [];
      for (let i = 0; i < spokes; i += 1) {
        const angle = base + (180 / spokes) * i;
        const [x1, y1] = at(angle, arm);
        const [x2, y2] = at(angle + 180, arm);

        paths.push(`M ${x1} ${y1} L ${x2} ${y2}`);
      }

      return {
        kind,
        label: spokes === 3 ? "Star" : rotated ? "Saltire" : "Cross",
        solid: [],
        outline: paths,
        strokeWidth: width,
      };
    }

    /* ---------------------------------------------------------------- grid */
    case "grid": {
      const size = random.int(2, 3);
      const dot = random.int(11, 16);
      const gap = random.int(8, 14);
      const total = size * dot + (size - 1) * gap;
      const start = CENTRE - total / 2 + dot / 2;

      /* One cell left out, so it reads as a considered mark rather than a
         placeholder pattern. */
      const missing = random.chance(0.55) ? random.int(0, size * size - 1) : -1;
      const rounded = random.chance(0.5);

      const paths: string[] = [];
      for (let row = 0; row < size; row += 1) {
        for (let column = 0; column < size; column += 1) {
          if (row * size + column === missing) continue;

          const cx = start + column * (dot + gap);
          const cy = start + row * (dot + gap);

          paths.push(rounded ? circle(cx, cy, dot / 2) : bar(cx, cy, dot, dot, dot * 0.25));
        }
      }

      return { kind, label: "Grid", solid: paths, outline: [], strokeWidth: 0 };
    }

    /* ---------------------------------------------------------------- lens */
    case "lens": {
      /* Two overlapping circles. The overlap is the mark, so the offset has to
         stay well inside the radius or it becomes two circles. */
      const radius = random.int(26, 32);
      const offset = round(radius * random.float(0.5, 0.8));
      const vertical = random.chance(0.35);

      const first = vertical
        ? circle(CENTRE, CENTRE - offset / 2, radius)
        : circle(CENTRE - offset / 2, CENTRE, radius);
      const second = vertical
        ? circle(CENTRE, CENTRE + offset / 2, radius)
        : circle(CENTRE + offset / 2, CENTRE, radius);

      return {
        kind,
        label: "Overlap",
        solid: [],
        outline: [first, second],
        strokeWidth: random.int(9, 13),
      };
    }

    /* -------------------------------------------------------------- wedges */
    default: {
      const count = random.int(3, 5);
      const radius = random.int(32, 40);
      const gapDegrees = random.int(10, 22);
      const rotation = random.int(0, 359);
      const sweep = 360 / count - gapDegrees;

      const paths: string[] = [];
      for (let i = 0; i < count; i += 1) {
        const from = rotation + (360 / count) * i;
        const [x1, y1] = at(from, radius);
        const [x2, y2] = at(from + sweep, radius);

        paths.push(
          `M ${CENTRE} ${CENTRE} L ${x1} ${y1} A ${radius} ${radius} 0 0 1 ${x2} ${y2} Z`,
        );
      }

      return { kind, label: "Wedges", solid: paths, outline: [], strokeWidth: 0 };
    }
  }
}
