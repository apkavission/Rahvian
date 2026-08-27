import { Skeleton, SkeletonRegion, SkeletonText } from "@/components/ui/skeleton";

/**
 * The content screen, before it arrives.
 *
 * Every admin content screen is the same three columns — the list, the record
 * as a form, the preview beside it — so its placeholder is the same three
 * columns too, at the same widths and with the same stacking below `xl`. That
 * is the whole point of a skeleton: when the real screen lands, nothing moves.
 * A generic panel here would put the columns in one place and the content in
 * another, and the jump between them is exactly what the skeleton exists to
 * prevent.
 *
 * Written once and shared for the same reason the list and the form are:
 * services, portfolio, case studies, blog, pricing, FAQs and team all arrive
 * in this shape, and seven copies of it would drift.
 */
export function ContentScreenSkeleton({
  /** How many rows to draw in the list. Roughly what the screen usually holds. */
  rows = 5,
  /** Fieldsets in the editor column. */
  groups = 3,
}: {
  rows?: number;
  groups?: number;
}) {
  return (
    <SkeletonRegion label="Loading the screen" className="mx-auto w-full max-w-7xl">
      <header>
        <Skeleton text className="h-8 w-56" />
        <SkeletonText lines={2} className="measure mt-4" />
      </header>

      <div className="mt-10 grid gap-8 xl:grid-cols-[17rem_minmax(0,1fr)_minmax(0,1fr)]">
        <div>
          <Skeleton text className="h-3 w-28" />
          <ul className="mt-3 space-y-2">
            {Array.from({ length: rows }, (_, index) => (
              <li
                key={index}
                aria-hidden
                className="rounded-xl border border-border bg-surface p-3"
              >
                <Skeleton text delay={index * 90} className="h-4 w-3/4" />
                <Skeleton text delay={index * 90 + 40} className="mt-2 h-2.5 w-1/2" />
                <div className="mt-3 border-t border-border pt-2">
                  <Skeleton text delay={index * 90 + 80} className="h-4 w-16" />
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="surface-raised min-w-0 space-y-8 rounded-2xl border border-border p-6">
          {Array.from({ length: groups }, (_, index) => (
            <div
              key={index}
              aria-hidden
              className="border-t border-border pt-6 first:border-0 first:pt-0"
            >
              <Skeleton text delay={index * 120} className="h-3 w-24" />
              <div className="mt-5 space-y-5">
                <FieldSkeleton delay={index * 120 + 40} />
                <FieldSkeleton delay={index * 120 + 80} />
              </div>
            </div>
          ))}
        </div>

        <div className="min-w-0">
          <Skeleton text className="h-3 w-20" />
          <Skeleton className="mt-3 h-[70vh] w-full rounded-2xl lg:h-[calc(100vh-14rem)]" />
        </div>
      </div>
    </SkeletonRegion>
  );
}

/** A label over an input — the shape every field in the record form takes. */
function FieldSkeleton({ delay }: { delay: number }) {
  return (
    <div aria-hidden>
      <Skeleton text delay={delay} className="h-3.5 w-32" />
      <Skeleton delay={delay + 30} className="mt-2 h-10 w-full rounded-lg" />
    </div>
  );
}

/**
 * A screen that is a single panel rather than three columns — the dashboard,
 * settings, an enquiry.
 */
export function PanelScreenSkeleton({
  panels = 3,
  title = true,
}: {
  panels?: number;
  title?: boolean;
}) {
  return (
    <SkeletonRegion label="Loading the screen" className="mx-auto w-full max-w-7xl">
      {title && (
        <header>
          <Skeleton text className="h-8 w-56" />
          <SkeletonText lines={2} className="measure mt-4" />
        </header>
      )}

      <div className="mt-10 space-y-6">
        {Array.from({ length: panels }, (_, index) => (
          <div
            key={index}
            aria-hidden
            className="surface-raised rounded-2xl border border-border p-6"
          >
            <Skeleton text delay={index * 90} className="h-4 w-40" />
            <SkeletonText lines={3} delay={index * 90 + 60} className="mt-5" />
          </div>
        ))}
      </div>
    </SkeletonRegion>
  );
}
