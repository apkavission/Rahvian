"use client";

import { RecordList } from "@/components/admin/record-list";
import { deletePlan, duplicatePlan, movePlan } from "@/lib/actions/pricing";

export interface PlanListItem {
  id: string;
  name: string;
  price_from: number | null;
  currency: string;
  is_custom_quote: boolean;
  is_highlighted: boolean;
  status: string;
}

/**
 * The left column: every plan, in the order the cards appear.
 *
 * The subtitle carries the price rather than the reference, because the price
 * is what distinguishes two plans at a glance and it is the thing most likely
 * to have been changed by mistake. The order matters more here than on any
 * other content screen — the plan on the left is read as the entry point and
 * the one in the middle as the recommendation — which is why the arrows are on
 * these rows.
 */
export function PlanList({
  plans,
  selectedId,
}: {
  plans: PlanListItem[];
  selectedId: string | null;
}) {
  return (
    <RecordList
      basePath="/admin/pricing"
      queryKey="plan"
      selectedId={selectedId}
      emptyLabel="No plans yet. Add the first one below."
      items={plans.map((plan) => {
        const price = plan.is_custom_quote
          ? "Custom quote"
          : plan.price_from === null
            ? "No price set"
            : `From ${plan.currency} ${Number(plan.price_from).toLocaleString("en-IN", {
                maximumFractionDigits: 0,
              })}`;

        const marks = [
          plan.status === "published" ? null : plan.status,
          plan.is_highlighted ? "highlighted" : null,
        ].filter(Boolean);

        return {
          id: plan.id,
          title: plan.name,
          subtitle: [price, ...marks].join(" · "),
          dimmed: plan.status !== "published",
        };
      })}
      actions={{
        move: movePlan,
        duplicate: duplicatePlan,
        remove: deletePlan,
      }}
      deleteCopy={(item) => ({
        title: `Delete ${item.title}?`,
        body: "The plan and everything priced into it are removed and cannot be brought back. To take the card off the pricing page without losing the figures, set its status to Archived instead.",
        confirmLabel: "Delete plan",
      })}
    />
  );
}
