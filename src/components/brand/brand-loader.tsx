import { SceneMount } from "@/components/three/scene-mount";
import { cn } from "@/lib/utils";

/**
 * The brand loader.
 *
 * Every wait in the estate looks like this one: the symbol resolves in the
 * centre while the two halves of the name close in on it — "Rahvian" from the
 * left, "Technologies" from the right — and a thin sweep underneath keeps a long
 * wait from looking frozen. Route transitions, error and not-found screens,
 * and the admin and the demos when they exist all use it, because a wait is
 * one of the few moments a visitor is definitely looking at the screen.
 *
 * Three things it deliberately does not do:
 *
 *   **It does not read the database.** A loading screen that awaits a query is
 *   a loading screen for a loading screen. The mark comes from the committed
 *   files in `public/brand/`, which is the compiled fallback every dynamic
 *   thing here is required to have. Callers that already hold the configured
 *   logo can pass it in through `mark`.
 *
 *   **It does not ship JavaScript.** Pure CSS on a Server Component, so it
 *   paints in the same frame the HTML arrives. The global reduced-motion rule
 *   collapses the animations to their end state — the finished lockup — so
 *   nothing is ever hidden behind motion.
 *
 *   **It does not take the page away.** `overlay` lays the lockup over
 *   whatever is already on screen, dimmed and blurred behind it, so a wait
 *   reads as "this is working" rather than as "your page is gone". The
 *   header, the form being submitted and everything else stay exactly where
 *   they were. The default block form sits inside whatever container it is
 *   given, for a panel or a table that is still loading.
 *
 * For a wait that happens in place — a button mid-submit, a row being saved —
 * use `BrandSpinner` below. A full lockup on a 32px button is not a loader,
 * it is a mistake.
 */

export type BrandLoaderSize = "sm" | "md" | "lg";

const MARK_SIZE: Record<BrandLoaderSize, string> = {
  sm: "h-8 sm:h-9",
  md: "h-11 sm:h-14",
  lg: "h-14 sm:h-20",
};

/*
  The name grows with the viewport rather than with the size prop alone. A
  320px phone still has to fit "Rahvian", the mark and "Technologies" on one
  wrapping the lockup would break the very gesture it exists for.
*/
const WORD_SIZE: Record<BrandLoaderSize, string> = {
  sm: "text-base sm:text-xl",
  md: "text-xl sm:text-3xl",
  lg: "text-2xl sm:text-5xl",
};

const GAP: Record<BrandLoaderSize, string> = {
  sm: "gap-2 sm:gap-3",
  md: "gap-3 sm:gap-4",
  lg: "gap-3 sm:gap-6",
};

export interface BrandLoaderProps {
  /**
   * Lays the loader over the current page rather than replacing it. Used by
   * every `loading.tsx`, and by anything waiting on a write.
   */
  overlay?: boolean;
  size?: BrandLoaderSize;
  /** Announced to screen readers and shown under the lockup when `showLabel`. */
  label?: string;
  showLabel?: boolean;
  /** The configured logo, where the caller already holds it without a wait. */
  mark?: React.ReactNode;
  /** The name, split at the centre. Both halves are editable content. */
  words?: [string, string];
  /**
   * The WebGL field behind the lockup. On by default for the overlay, off for
   * the inline block — a panel-sized loader has no room for atmosphere.
   */
  scene?: boolean;
  /**
   * Rendered under the lockup, inside the same panel. This is how the
   * not-found and error screens reuse the loader rather than inventing a
   * second treatment: same overlay, same lockup, same scene, with the message
   * and the way out sitting beneath it.
   */
  children?: React.ReactNode;
  className?: string;
}

export function BrandLoader({
  overlay = false,
  size = "md",
  label = "Loading",
  showLabel = false,
  mark,
  words = ["Rahvian", "Technologies"],
  scene,
  children,
  className,
}: BrandLoaderProps) {
  const showScene = scene ?? overlay;
  const [left, right] = words;

  return (
    <div
      role="status"
      aria-live="polite"
      // A screen that has finished failing is not busy. `children` is what
      // separates the two: a wait has none, a not-found or an error carries
      // its message and its way out.
      aria-busy={children ? undefined : true}
      className={cn(
        "relative flex flex-col items-center justify-center overflow-hidden",
        overlay
          ? cn(
              // `min-h-dvh` rather than `h-screen`: on a phone the browser
              // chrome changes the viewport height mid-wait, and `dvh` follows.
              "fixed inset-0 z-[70] min-h-dvh overflow-y-auto px-6 py-16",
              // Translucent, not opaque. The page stays readable underneath —
              // the visitor can see what they were doing, which is what makes
              // a wait feel like a pause rather than a reset. The blur keeps
              // the lockup legible over whatever happens to be behind it.
              "bg-bg/75 backdrop-blur-sm supports-[backdrop-filter]:bg-bg/60",
            )
          : "w-full px-6 py-16",
        className,
      )}
    >
      {/*
        The lockup and the field behind it, in their own box.

        The scene is scoped to this wrapper rather than to the whole overlay:
        centred on the container it would drift down over the message on the
        not-found and error screens and fight the copy for the same pixels.
        Behind the name it is what it should be — atmosphere, bounded.

        The scene is `vision`: an iris that drifts, blinks, and then draws the
        mark's arrow through itself. The hero's `assemble` was tried here
        first and was wrong — it renders the words itself, so a second, half-
        formed "Rahvian" sat behind the real one and read as a rendering
        fault rather than as depth.

        It costs nothing before it appears. `SceneMount` loads three.js after
        hydration, refuses to run on reduced motion, low-core devices,
        save-data connections or anything without WebGL2, and paints a static
        glow in those cases — so the lockup is always what carries the wait,
        and this is always only atmosphere.
      */}
      <div className="relative flex items-center justify-center">
        {showScene && (
          <SceneMount
            scene="vision"
            fallback="glow"
            className={cn(
              "pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2",
              "size-56 opacity-45 mask-[radial-gradient(56%_56%_at_50%_50%,#000,transparent_72%)]",
              "sm:size-80",
            )}
          />
        )}

        <div className={cn("relative flex items-center", GAP[size])}>
          <span
            className={cn(
              "font-display font-semibold tracking-tight text-text",
              WORD_SIZE[size],
              "[animation:brand-word-left_var(--duration-slow)_var(--ease-out)_both]",
            )}
          >
            {left}
          </span>

          {/* Above the words in the stack, which is what lets them appear to
              come out from behind it rather than slide past it. */}
          <span
            className={cn(
              "relative z-10 [animation:brand-mark-in_var(--duration-base)_var(--ease-out)_both]",
              MARK_SIZE[size],
            )}
          >
            {/* The breathing loop is a child of the entrance, so the two do
                not fight over the same transform. */}
            <span className="block size-full [animation:brand-breathe_1.6s_var(--ease-in-out)_infinite] [animation-delay:var(--duration-slow)]">
              {mark ?? <DefaultMark className="h-full w-auto" />}
            </span>
          </span>

          <span
            className={cn(
              "font-display font-semibold tracking-tight text-text",
              WORD_SIZE[size],
              "[animation:brand-word-right_var(--duration-slow)_var(--ease-out)_both]",
            )}
          >
            {right}
          </span>
        </div>
      </div>

      {/* The mark's arrow, drawing itself for as long as the wait lasts.
          A sliding bar sat here first and was the one element on the screen
          that could have belonged to any product. */}
      <VisionArrow className="relative mt-7" />

      {showLabel && (
        <p className="relative mt-5 font-mono text-xs uppercase tracking-[0.18em] text-text-subtle">
          {label}
        </p>
      )}

      {children && <div className="relative mt-10 w-full max-w-2xl">{children}</div>}

      {/* Always announced, whether or not it is drawn. */}
      <span className="sr-only">{label}</span>
    </div>
  );
}

/**
 * The rising arrow from the mark, drawn as a stroke so it can animate.
 *
 * `pathLength=100` normalises the dash values, so the shaft and the two barbs
 * draw in proportion regardless of the coordinates — the shape can be tuned
 * later without recomputing the dash array by hand.
 */
function VisionArrow({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 120 44"
      aria-hidden
      className={cn("h-6 w-28 text-accent sm:w-36", className)}
      fill="none"
    >
      <path
        d="M6 38 L74 10 M74 10 L54 10 M74 10 L74 28"
        stroke="currentColor"
        strokeWidth={3}
        strokeLinecap="round"
        strokeLinejoin="round"
        pathLength={100}
        strokeDasharray={100}
        className="[animation:brand-arrow-draw_2.4s_var(--ease-in-out)_infinite]"
      />
    </svg>
  );
}

/**
 * The symbol, correct in both themes.
 *
 * Both files are emitted and CSS hides one, exactly as the header logo does.
 * Choosing in JavaScript would mean either a flash of the wrong mark or a
 * loader that stays blank until hydration — on the one screen that exists
 * precisely because hydration has not happened yet.
 */
function DefaultMark({ className }: { className?: string }) {
  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element -- a committed SVG
          of known size served from our own origin; there is nothing for the
          optimiser to do, and this must never be deferred. */}
      <img
        src="/brand/symbol-light.png"
        alt=""
        aria-hidden
        className={cn("theme-light-only", className)}
      />
      {/* eslint-disable-next-line @next/next/no-img-element -- see above */}
      <img
        src="/brand/symbol-dark.png"
        alt=""
        aria-hidden
        className={cn("theme-dark-only", className)}
      />
    </>
  );
}

/**
 * The compact form: a wait that happens in place.
 *
 * Buttons mid-submit, a row being saved, a panel refreshing after a delete.
 * Same accent, same easing, no lockup — at this size the name would be
 * illegible and the mark unreadable, so the arc carries the brand through
 * colour alone.
 */
export function BrandSpinner({
  className,
  label,
}: {
  className?: string;
  /** Set only where the spinner is the sole indication that work is running. */
  label?: string;
}) {
  return (
    <>
      <span
        aria-hidden
        className={cn(
          "inline-block size-4 shrink-0 animate-spin rounded-full",
          "border-2 border-current/25 border-t-current",
          className,
        )}
      />
      {label && <span className="sr-only">{label}</span>}
    </>
  );
}
