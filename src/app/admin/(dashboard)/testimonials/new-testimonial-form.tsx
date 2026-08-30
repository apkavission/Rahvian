"use client";

import { useActionState, useState } from "react";
import { Plus } from "lucide-react";
import { BrandSpinner } from "@/components/brand/brand-loader";
import { useBusyWhile } from "@/components/forms/use-busy-while";
import { useFormToast } from "@/components/forms/use-form-toast";
import { Button } from "@/components/ui/button";
import { Field, FIELD } from "@/components/ui/field";
import { cn } from "@/lib/utils";
import { createTestimonial } from "@/lib/actions/testimonials";
import { initialRecordState } from "@/lib/validation/records";

/**
 * Record a quote.
 *
 * The name and the words, both of which the table requires. Everything else —
 * their role, the company, the consent — is filled in on the form that opens
 * next. It starts as a draft with no consent recorded, which is the only state
 * a brand new quote can honestly be in.
 */
export function NewTestimonialForm() {
  const [state, formAction, pending] = useActionState(createTestimonial, initialRecordState);
  const [open, setOpen] = useState(false);

  useBusyWhile(pending, "Recording the quote");
  useFormToast(state, {
    successTitle: "Quote recorded",
    errorTitle: "Could not record it",
  });

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-border px-3.5 py-2.5 text-sm text-text-muted transition-colors hover:border-border-strong hover:text-text"
      >
        <Plus className="size-4" aria-hidden />
        New quote
      </button>
    );
  }

  return (
    <form action={formAction} className="surface-raised mt-4 rounded-xl border border-border p-4">
      <h2 className="font-display text-base font-semibold">New quote</h2>
      <p className="mt-1.5 text-sm text-text-muted">
        It starts as a draft. Nothing reaches the site until you have recorded
        that they agreed to it.
      </p>

      <div className="mt-4 space-y-4">
        <Field
          label="Name"
          required
          hint="The person who said it."
          error={state.fieldErrors?.author_name}
        >
          {(id, describedBy) => (
            <input
              id={id}
              name="author_name"
              required
              autoFocus
              aria-describedby={describedBy}
              className={FIELD}
            />
          )}
        </Field>

        <Field
          label="What they said"
          required
          hint="Their words. You can tidy the length later, but not the wording."
          error={state.fieldErrors?.quote}
        >
          {(id, describedBy) => (
            <textarea
              id={id}
              name="quote"
              required
              rows={4}
              aria-describedby={describedBy}
              className={cn(FIELD, "resize-y")}
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
              Recording
            </>
          ) : (
            "Record quote"
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
