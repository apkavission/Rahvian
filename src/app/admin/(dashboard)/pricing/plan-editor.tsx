"use client";

import { RecordForm } from "@/components/admin/record-form";
import { savePlan } from "@/lib/actions/pricing";
import { pricingFieldsets } from "@/lib/records/pricing";

/**
 * The middle column: one plan, as a form.
 *
 * A thin wrapper over the shared record form, and a client component for one
 * specific reason — the field descriptors carry regular expressions, which do
 * not survive being serialised from a server component. Building them here
 * keeps the descriptors on one side of the boundary.
 */
export function PlanEditor({
  id,
  values,
}: {
  id: string;
  values: Record<string, unknown>;
}) {
  return (
    <RecordForm
      id={id}
      fieldsets={pricingFieldsets()}
      values={values}
      action={savePlan}
      copy={{
        save: "Save plan",
        busy: "Saving the plan",
        saved: "Plan saved",
      }}
    />
  );
}
