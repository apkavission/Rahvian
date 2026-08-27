"use client";

import { useActionState, useState } from "react";
import { Plus } from "lucide-react";
import { BrandSpinner } from "@/components/brand/brand-loader";
import { useBusyWhile } from "@/components/forms/use-busy-while";
import { useFormToast } from "@/components/forms/use-form-toast";
import { Button } from "@/components/ui/button";
import { Field, FIELD } from "@/components/ui/field";
import { createPlan } from "@/lib/actions/pricing";
import { initialRecordState } from "@/lib/validation/records";
import { slugify } from "@/lib/utils";

/**
 * Start a plan.
 *
 * Two fields. It is created as a draft priced by the brief, so a new plan is
 * never a card on the pricing page and never a card with a blank where the
 * figure should be.
 */
export function NewPlanForm() {
  const [state, formAction, pending] = useActionState(createPlan, initialRecordState);
  const [open, setOpen] = useState(false);
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);

  useBusyWhile(pending, "Creating the plan");
  useFormToast(state, { successTitle: "Plan created", errorTitle: "Could not create it" });

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-border px-3.5 py-2.5 text-sm text-text-muted transition-colors hover:border-border-strong hover:text-text"
      >
        <Plus className="size-4" aria-hidden />
        New plan
      </button>
    );
  }

  return (
    <form action={formAction} className="surface-raised mt-4 rounded-xl border border-border p-4">
      <h2 className="font-display text-base font-semibold">New plan</h2>
      <p className="mt-1.5 text-sm text-text-muted">
        It starts as a draft, priced by the brief, so nothing appears on the
        pricing page until you set a figure and publish it.
      </p>

      <div className="mt-4 space-y-4">
        <Field
          label="Plan name"
          required
          hint="What a client would call it."
          error={state.fieldErrors?.name}
        >
          {(id, describedBy) => (
            <input
              id={id}
              name="name"
              required
              autoFocus
              aria-describedby={describedBy}
              onChange={(event) => {
                if (!slugTouched) setSlug(slugify(event.target.value));
              }}
              className={FIELD}
            />
          )}
        </Field>

        <Field
          label="Reference"
          required
          hint="Not shown anywhere. It identifies the plan behind the scenes."
          error={state.fieldErrors?.slug}
        >
          {(id, describedBy) => (
            <input
              id={id}
              name="slug"
              required
              value={slug}
              aria-describedby={describedBy}
              onChange={(event) => {
                setSlugTouched(true);
                setSlug(event.target.value);
              }}
              className={FIELD}
            />
          )}
        </Field>
      </div>

      {state.status === "error" && !state.fieldErrors ? (
        <p role="alert" className="mt-4 text-sm text-danger">
          {state.message}
        </p>
      ) : null}

      <div className="mt-5 flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? (
            <>
              <BrandSpinner />
              Creating
            </>
          ) : (
            "Create plan"
          )}
        </Button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-lg px-3 py-2 text-sm text-text-muted transition-colors hover:bg-surface-2 hover:text-text"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
