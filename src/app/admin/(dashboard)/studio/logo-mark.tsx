"use client";

import {
  estimateWidth,
  fontFor,
  initials,
  readableOn,
  soften,
  wordmark,
} from "@/lib/studio/logo";
import type { LogoRecipe } from "@/lib/studio/generate";

/**
 * One logo, drawn once.
 *
 * ---------------------------------------------------------------------------
 * **This component is the preview and the export.** The thumbnails, the large
 * preview and every downloaded file are this same function; the download
 * serialises the DOM node it produced. There is deliberately no second drawing
 * path, because a preview that disagrees with the file is the failure this tool
 * would be blamed for and the hardest one to notice.
 *
 * ---------------------------------------------------------------------------
 * **It draws a recipe, not a set of choices from a menu.**
 *
 * Everything about the mark — which family, how many arms, how thick, how
 * rotated — arrives already decided in `recipe.mark`, generated from a seed.
 * This file knows how to *place* a mark beside a name; it has no opinion about
 * what the mark is, which is what lets there be millions of them.
 *
 * ---------------------------------------------------------------------------
 * **The viewBox is computed, never fixed.** A logo for "Kora" and a logo for
 * "Meridian Institute of Commerce" are different shapes, and a fixed box either
 * clips the second or leaves the first floating in white space. Both are
 * failures that only appear in the downloaded file, where they are somebody
 * else's problem.
 */

export interface LogoSpec {
  /** The business name. */
  text: string;
  /** Everything the generator decided. */
  recipe: LogoRecipe;
  /** `null` draws nothing behind the logo — a transparent PNG. */
  paper: string | null;
}

/** Everything is laid out against a cap height of 100. */
const CAP = 100;

export function LogoArt({
  spec,
  className,
  role = "img",
}: {
  spec: LogoSpec;
  className?: string;
  role?: "img" | "presentation";
}) {
  const { recipe } = spec;

  const name = wordmark(spec.text) || "Your name";
  const font = fontFor(recipe.font);
  const letters = initials(name) || "A";

  const box = geometry(spec, name, letters);

  return (
    <svg
      data-studio="logo"
      viewBox={`0 0 ${round(box.width)} ${round(box.height)}`}
      className={className}
      role={role}
      aria-label={role === "img" ? `Logo for ${name}` : undefined}
      xmlns="http://www.w3.org/2000/svg"
    >
      {spec.paper && <rect x="0" y="0" width={box.width} height={box.height} fill={spec.paper} />}

      {box.draw.map((part, index) => (
        <Part
          key={index}
          part={part}
          spec={spec}
          font={font}
          letters={letters}
          name={name}
        />
      ))}
    </svg>
  );
}

/* ========================================================================== */
/* What goes where                                                            */
/* ========================================================================== */

type Part =
  | { kind: "mark"; x: number; y: number; size: number }
  | { kind: "tile"; x: number; y: number; size: number; radius: number }
  | { kind: "circle"; x: number; y: number; size: number }
  | { kind: "letters"; x: number; y: number; size: number; fill: string; anchor: "start" | "middle" }
  | { kind: "name"; x: number; y: number; size: number; anchor: "start" | "middle" }
  | { kind: "rule"; x: number; y: number; width: number; height: number };

/**
 * The five arrangements, as coordinates.
 *
 * Each returns the box it needs and what to draw inside it. Nothing here reads
 * a stylesheet or measures anything — the width of the name is estimated in
 * `logo.ts`, and every layout centres the text inside whatever that returned,
 * so an estimate that is slightly generous shows as a slightly wide margin
 * rather than as a clipped letter.
 */
function geometry(spec: LogoSpec, name: string, letters: string) {
  const { recipe } = spec;
  const textWidth = estimateWidth(name, recipe.font);

  switch (recipe.layout) {
    /* ------------------------------------------------------------ beside */
    case "beside": {
      const markSize = CAP * recipe.markScale;
      const gap = CAP * recipe.gap;
      const padding = CAP * 0.3;

      const width = padding * 2 + markSize + gap + textWidth;
      const height = markSize + padding * 2;

      return {
        width,
        height,
        draw: [
          { kind: "mark", x: padding, y: padding, size: markSize },
          {
            kind: "name",
            x: padding + markSize + gap,
            y: height / 2,
            size: CAP,
            anchor: "start",
          },
        ] as Part[],
      };
    }

    /* ----------------------------------------------------------- stacked */
    case "stacked": {
      const markSize = CAP * (recipe.markScale + 0.35);
      const gap = CAP * (recipe.gap + 0.1);
      const padding = CAP * 0.34;

      const width = Math.max(textWidth, markSize) + padding * 2;
      const height = padding * 2 + markSize + gap + CAP;

      return {
        width,
        height,
        draw: [
          { kind: "mark", x: (width - markSize) / 2, y: padding, size: markSize },
          {
            kind: "name",
            x: width / 2,
            y: padding + markSize + gap + CAP * 0.5,
            size: CAP,
            anchor: "middle",
          },
        ] as Part[],
      };
    }

    /* ---------------------------------------------------------- monogram */
    case "monogram": {
      /*
        The initials alone, in a block. No name beside them.

        This is the layout that has to work at 32 pixels, so it is deliberately
        the simplest thing on the screen: one square, one or two letters, and
        nothing that disappears when it is scaled down.
      */
      const size = CAP * 2.4;

      return {
        width: size,
        height: size,
        draw: [
          { kind: "tile", x: 0, y: 0, size, radius: size * recipe.tileRadius },
          {
            kind: "letters",
            x: size / 2,
            y: size / 2,
            size: letters.length > 1 ? size * 0.42 : size * 0.56,
            fill: readableOn(recipe.accent),
            anchor: "middle",
          },
        ] as Part[],
      };
    }

    /* ------------------------------------------------------------- badge */
    case "badge": {
      const badge = CAP * (recipe.markScale + 0.2);
      const gap = CAP * recipe.gap;
      const padding = CAP * 0.3;

      const width = padding * 2 + badge + gap + textWidth;
      const height = badge + padding * 2;

      return {
        width,
        height,
        draw: [
          { kind: "circle", x: padding, y: padding, size: badge },
          {
            kind: "letters",
            x: padding + badge / 2,
            y: padding + badge / 2,
            size: letters.length > 1 ? badge * 0.42 : badge * 0.56,
            fill: readableOn(recipe.accent),
            anchor: "middle",
          },
          {
            kind: "name",
            x: padding + badge + gap,
            y: height / 2,
            size: CAP,
            anchor: "start",
          },
        ] as Part[],
      };
    }

    /* --------------------------------------------------------- underline */
    default: {
      const padding = CAP * 0.3;
      const rule = CAP * 0.16;
      const gap = CAP * recipe.gap;

      const width = textWidth + padding * 2;
      const height = padding * 2 + CAP + gap + rule;

      return {
        width,
        height,
        draw: [
          { kind: "name", x: width / 2, y: padding + CAP * 0.5, size: CAP, anchor: "middle" },
          {
            kind: "rule",
            /* A third of the width, centred. A full-width rule under a long
               name reads as a table border rather than as part of a logo. */
            x: (width - textWidth / 3) / 2,
            y: padding + CAP + gap,
            width: textWidth / 3,
            height: rule,
          },
        ] as Part[],
      };
    }
  }
}

/* ========================================================================== */
/* Drawing one part                                                           */
/* ========================================================================== */

function Part({
  part,
  spec,
  font,
  letters,
  name,
}: {
  part: Part;
  spec: LogoSpec;
  font: ReturnType<typeof fontFor>;
  letters: string;
  name: string;
}) {
  const { recipe } = spec;

  switch (part.kind) {
    case "tile":
      return (
        <rect
          x={round(part.x)}
          y={round(part.y)}
          width={round(part.size)}
          height={round(part.size)}
          rx={round(part.radius)}
          fill={recipe.accent}
        />
      );

    case "circle":
      return (
        <circle
          cx={round(part.x + part.size / 2)}
          cy={round(part.y + part.size / 2)}
          r={round(part.size / 2)}
          fill={recipe.accent}
        />
      );

    case "mark": {
      const scale = part.size / 100;
      const { mark } = recipe;

      return (
        <g transform={`translate(${round(part.x)} ${round(part.y)}) scale(${round(scale, 4)})`}>
          {/*
            A soft disc behind the mark.

            It is what stops a thin stroke disappearing beside heavy type at
            small sizes, and it gives every family the same silhouette so a
            layout does not need to know which one it got.
          */}
          <circle cx="50" cy="50" r="50" fill={soften(recipe.accent)} />

          {mark.solid.map((d, index) => (
            <path key={`s${index}`} d={d} fill={recipe.accent} />
          ))}

          {mark.outline.map((d, index) => (
            <path
              key={`o${index}`}
              d={d}
              fill="none"
              stroke={recipe.accent}
              strokeWidth={mark.strokeWidth}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}
        </g>
      );
    }

    case "letters":
      return (
        <text
          x={round(part.x)}
          y={round(part.y)}
          fill={part.fill}
          fontFamily={font.stack}
          fontWeight={font.weight}
          fontSize={round(part.size)}
          letterSpacing={round(part.size * recipe.tracking, 3)}
          textAnchor={part.anchor}
          dominantBaseline="central"
        >
          {letters}
        </text>
      );

    case "name":
      return (
        <text
          x={round(part.x)}
          y={round(part.y)}
          fill={recipe.ink}
          fontFamily={font.stack}
          fontWeight={font.weight}
          fontSize={round(part.size)}
          letterSpacing={round(part.size * recipe.tracking, 3)}
          textAnchor={part.anchor}
          dominantBaseline="central"
        >
          {name}
        </text>
      );

    case "rule":
      return (
        <rect
          x={round(part.x)}
          y={round(part.y)}
          width={round(part.width)}
          height={round(part.height)}
          rx={round(part.height / 2)}
          fill={recipe.accent}
        />
      );
  }
}

/** Coordinates to two places. A serialised SVG full of 17-digit floats is
    three times the size for no visible difference. */
function round(value: number, places = 2): number {
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
}
