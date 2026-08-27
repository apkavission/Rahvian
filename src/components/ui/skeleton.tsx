import { cn } from "@/lib/utils";

/**
 * The placeholder a piece of content leaves while it is on its way.
 *
 * This is the second half of the loading story, and the two halves are not
 * interchangeable — worth stating plainly, because "we already have a loader"
 * is how a codebase ends up using neither correctly:
 *
 *   **The brand loader** is for a *wait the person caused*. They pressed Save,
 *   they followed a link, they confirmed a delete. Something is happening
 *   because of them, and the overlay says so without taking the page away.
 *
 *   **A skeleton** is for *content that is not here yet*. Nobody pressed
 *   anything; the screen is simply arriving. It draws the shape the content
 *   will take, so the layout does not jump when it lands and the reader can
 *   start parsing the page before it exists.
 *
 * Both are used, often on the same screen. Full reasoning and the seven rules
 * this file enforces: `docs/loading-rules.md`.
 *
 * Never build a second one of either. One loader, one skeleton primitive,
 * shapes composed from them.
 */

/** Milliseconds between one card's sweep and the next in a grid. */
const STAGGER_STEP = 90;

export function Skeleton({
  className,
  /** Rounded like a line of text rather than like a panel. */
  text,
  /** Milliseconds to offset the sweep by, so a grid reads as a wave. */
  delay = 0,
}: {
  className?: string;
  text?: boolean;
  delay?: number;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "relative block overflow-hidden bg-skeleton",
        text ? "rounded-md" : "rounded-xl",
        className,
      )}
    >
      {/*
        The sweep. A single translated band rather than an animated gradient
        position: only transform and opacity are allowed to animate here, and a
        gradient whose `background-position` moves repaints the whole box on
        every frame.

        The colours are `--skeleton` and `--skeleton-sheen` rather than two
        steps of the surface scale, because that scale inverts between the
        themes — a higher number is darker in light and lighter in dark. Built
        from `surface-2` and `surface-3` this would sweep a highlight in one
        theme and a shadow in the other.
      */}
      <span
        style={delay ? { animationDelay: `${delay}ms` } : undefined}
        className={cn(
          "absolute inset-y-0 -left-full w-full",
          "bg-linear-to-r from-transparent via-skeleton-sheen to-transparent",
          "[animation:skeleton-sweep_1.6s_var(--ease-in-out)_infinite]",
        )}
      />
    </span>
  );
}

/**
 * A paragraph's worth of lines.
 *
 * The last line is short, because real paragraphs end mid-measure and a block
 * of equal-length bars reads as a table rather than as prose.
 */
export function SkeletonText({
  lines = 3,
  delay = 0,
  className,
}: {
  lines?: number;
  delay?: number;
  className?: string;
}) {
  return (
    <span aria-hidden className={cn("block space-y-2.5", className)}>
      {Array.from({ length: lines }, (_, index) => (
        <Skeleton
          key={index}
          text
          delay={delay + index * 40}
          className={cn("h-3.5", index === lines - 1 ? "w-2/5" : "w-full")}
        />
      ))}
    </span>
  );
}

/**
 * The wrapper that makes a group of skeletons legible, and stops it flashing.
 *
 * Two jobs, both of which are easy to forget and impossible to notice missing:
 *
 *   **One announcement for the whole region.** Every placeholder inside is
 *   `aria-hidden`; a screen reader hears "loading" once rather than counting
 *   nine unlabelled boxes.
 *
 *   **A 120ms delay before it appears.** A skeleton that flashes for 80ms on a
 *   fast connection is worse than no skeleton — it reads as a glitch. `both`
 *   fill holds it at zero opacity until the wait is long enough to be worth
 *   acknowledging.
 *
 * Every `loading.tsx` and every Suspense fallback in the estate goes through
 * this, so both are a rule rather than a habit.
 */
export function SkeletonRegion({
  label = "Loading",
  className,
  children,
}: {
  label?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      role="status"
      aria-busy
      aria-live="polite"
      className={cn(
        "[animation:fade-in_var(--duration-base)_var(--ease-out)_both] [animation-delay:120ms]",
        className,
      )}
    >
      {children}
      <span className="sr-only">{label}</span>
    </div>
  );
}

/**
 * A card-shaped placeholder — the unit most grids on this site are made of.
 *
 * It takes the rounding, the border and the raised surface of the real card,
 * so the grid it sits in is already the right grid before anything arrives.
 */
export function SkeletonCard({
  lines = 3,
  index = 0,
  className,
}: {
  lines?: number;
  /** Position in the grid. Offsets the sweep so the row reads as a wave. */
  index?: number;
  className?: string;
}) {
  const delay = index * STAGGER_STEP;

  return (
    <div
      aria-hidden
      className={cn(
        "surface-raised flex h-full flex-col rounded-2xl border border-border p-6",
        className,
      )}
    >
      <Skeleton text delay={delay} className="h-5 w-2/3" />
      <Skeleton text delay={delay + 40} className="mt-3 h-3 w-1/3" />
      <SkeletonText lines={lines} delay={delay + 80} className="mt-6" />
    </div>
  );
}

/** A grid of card placeholders, staggered. The shape most lists arrive in. */
export function SkeletonCardGrid({
  count = 6,
  lines = 3,
  className,
}: {
  count?: number;
  lines?: number;
  className?: string;
}) {
  return (
    <div
      aria-hidden
      className={cn(
        "grid auto-rows-fr gap-4 sm:grid-cols-2 lg:grid-cols-3",
        className,
      )}
    >
      {Array.from({ length: count }, (_, index) => (
        <SkeletonCard key={index} index={index} lines={lines} />
      ))}
    </div>
  );
}
