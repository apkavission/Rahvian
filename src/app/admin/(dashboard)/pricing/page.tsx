import type { Metadata } from "next";
import { ExternalLink } from "lucide-react";
import { PreviewPane } from "@/components/admin/preview-pane";
import { requireMenu } from "@/lib/auth/session";
import { getAdminPricingPlan, getAdminPricingPlans } from "@/lib/queries/pricing-admin";
import { planToValues } from "@/lib/records/pricing";
import { NewPlanForm } from "./new-plan-form";
import { PlanEditor } from "./plan-editor";
import { PlanList } from "./plan-list";

export const metadata: Metadata = {
  title: "Pricing",
  robots: { index: false, follow: false, nocache: true },
};

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/**
 * The pricing screen.
 *
 * The same three columns as every other content list, from the same
 * components. What is written here is the queries and the words.
 *
 * One thing is genuinely different, and it is why the preview beside the form
 * shows the whole row of cards rather than the one being edited: a price is
 * only ever read in comparison. A plan that looks generous alone looks thin
 * beside the one next to it, and the arrangement — which card sits in the
 * middle, which one carries the badge — is most of the argument. Previewing a
 * single card would hide the only thing worth checking.
 */
export default async function PricingScreen({ searchParams }: Props) {
  await requireMenu("pricing");

  const query = await searchParams;
  const requested = typeof query.plan === "string" ? query.plan : null;

  const plans = await getAdminPricingPlans();

  const selectedId = plans.find((plan) => plan.id === requested)?.id ?? plans[0]?.id ?? null;

  // Read in full only once one is selected — the list carries the columns it
  // needs, and the form needs all of them for exactly one row.
  const selected = selectedId ? await getAdminPricingPlan(selectedId) : null;

  return (
    <div className="mx-auto w-full max-w-7xl">
      <header className="flex flex-wrap items-start justify-between gap-6">
        <div>
          <h1 className="font-display text-2xl font-semibold">Pricing</h1>
          <p className="measure mt-2 text-sm leading-relaxed text-text-muted">
            The cards on the pricing page. A published plan has to carry either
            a starting figure or the switch that says the price depends on the
            brief — the database refuses anything in between, so no card can go
            out with a blank where the number should be.
          </p>
        </div>

        <a
          href="/pricing"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-lg border border-border-strong bg-surface px-4 py-2.5 text-sm font-medium transition-colors hover:bg-surface-2"
        >
          View on the site
          <ExternalLink className="size-4" aria-hidden />
        </a>
      </header>

      <div className="mt-10 grid gap-8 xl:grid-cols-[17rem_minmax(0,1fr)_minmax(0,1fr)]">
        <div className="xl:sticky xl:top-24 xl:self-start">
          <h2 className="font-mono text-[0.65rem] uppercase tracking-[0.16em] text-text-subtle">
            Left to right, as shown
          </h2>
          <div className="mt-3">
            <PlanList
              plans={plans.map((plan) => ({
                id: plan.id,
                name: plan.name,
                price_from: plan.price_from,
                currency: plan.currency,
                is_custom_quote: plan.is_custom_quote,
                is_highlighted: plan.is_highlighted,
                status: plan.status,
              }))}
              selectedId={selectedId}
            />
            <NewPlanForm />
          </div>
        </div>

        <div className="min-w-0">
          {selected ? (
            <div className="surface-raised rounded-2xl border border-border p-6">
              {/*
                Keyed on the plan, so selecting another one remounts the form.
                Without it React would reuse the component and keep the first
                plan's figures in state — the editor would show one price under
                another's name, which on this screen is the worst thing it
                could do.
              */}
              <PlanEditor
                key={selected.id}
                id={selected.id}
                values={planToValues(selected)}
              />
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-border bg-surface-2/40 p-8">
              <h2 className="font-display text-lg font-semibold">No plans yet</h2>
              <p className="measure mt-3 text-sm leading-relaxed text-text-muted">
                Add one on the left and it will open here. New plans start as
                drafts, so the pricing page keeps showing its empty state until
                you publish the first one.
              </p>
            </div>
          )}
        </div>

        {/*
          The preview, beside the form rather than behind a link.

          Three columns from `xl` up and stacked below it: at 1280 the form and
          a readable row of cards do not both fit, and cards squeezed into
          300px tell you nothing about how the row reads.
        */}
        <div className="min-w-0 xl:sticky xl:top-24 xl:self-start">
          <PreviewPane
            path={`/admin/preview/pricing${selectedId ? `?plan=${selectedId}` : ""}`}
            note="The whole row, drafts included. Unpublished cards are marked; a visitor sees only the published ones."
          />
        </div>
      </div>
    </div>
  );
}
