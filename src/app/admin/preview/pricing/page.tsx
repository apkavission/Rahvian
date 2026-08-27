import type { Metadata } from "next";
import { PlanCard } from "@/components/pricing/plan-card";
import { requireStaff } from "@/lib/auth/session";
import { getAdminPricingCards } from "@/lib/queries/pricing-admin";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Pricing preview",
  robots: { index: false, follow: false, nocache: true },
};

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/**
 * The row of price cards as it will look, including what is not published yet.
 *
 * The whole row rather than one card, because a price is only ever read in
 * comparison: which plan sits in the middle, which one carries the badge, and
 * how the figures line up against each other is most of the argument the page
 * is making. A single card in isolation hides all of it.
 *
 * The same `PlanCard` the public section renders, so this is the row rather
 * than a drawing of it. Read uncached as the signed-in user, which is what
 * makes a draft visible at all — the public query would hand back only the
 * published ones and the preview would be useless for the thing it is for.
 *
 * It sits outside the `(dashboard)` group so the admin chrome does not wrap it.
 */
export default async function PricingPreview({ searchParams }: Props) {
  await requireStaff();

  const query = await searchParams;
  const selectedId = typeof query.plan === "string" ? query.plan : null;

  const plans = await getAdminPricingCards();
  const live = plans.filter((plan) => plan.status === "published").length;

  return (
    <div className="min-h-dvh bg-bg">
      <div className="border-b border-border bg-surface-2 px-4 py-2">
        <p className="font-mono text-[0.65rem] uppercase tracking-[0.14em] text-text-subtle">
          Preview · {plans.length} {plans.length === 1 ? "plan" : "plans"} · {live} on the
          site
        </p>
      </div>

      {plans.length > 0 ? (
        <div className="px-4 py-10 sm:px-6 lg:px-8">
          <ul className="mx-auto grid max-w-6xl auto-rows-fr gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {plans.map((plan) => {
              const unpublished = plan.status !== "published";

              return (
                <li
                  key={plan.id}
                  className={cn(
                    "relative h-full rounded-2xl",
                    // The card being edited, outlined. Offset so the ring sits
                    // outside the card's own border rather than replacing it —
                    // the highlighted plan's accent border has to stay legible
                    // underneath, since that is one of the things being checked.
                    plan.id === selectedId && "ring-2 ring-ring ring-offset-4 ring-offset-bg",
                    unpublished && "opacity-60",
                  )}
                >
                  {unpublished && (
                    <span className="absolute -top-2.5 right-4 z-10 inline-flex items-center rounded-full border border-border-strong bg-surface px-2.5 py-0.5 font-mono text-[0.6rem] uppercase tracking-[0.14em] text-text-subtle">
                      {plan.status} · not on the site
                    </span>
                  )}
                  <PlanCard plan={plan} />
                </li>
              );
            })}
          </ul>
        </div>
      ) : (
        <div className="px-6 py-16">
          <p className="mx-auto max-w-md text-center text-sm leading-relaxed text-text-muted">
            No plans yet. The pricing page is showing its empty state — the
            heading, and whatever the section is set to say in place of the
            cards.
          </p>
        </div>
      )}
    </div>
  );
}
