"use client";

import { useActionState, useState } from "react";
import { Plus } from "lucide-react";
import { BrandSpinner } from "@/components/brand/brand-loader";
import { useBusyWhile } from "@/components/forms/use-busy-while";
import { useFormToast } from "@/components/forms/use-form-toast";
import { Button } from "@/components/ui/button";
import { Field, FIELD } from "@/components/ui/field";
import { createFaq } from "@/lib/actions/faqs";
import { initialRecordState } from "@/lib/validation/records";
import { cn } from "@/lib/utils";

/**
 * Add a question.
 *
 * Both fields, not just the question: the table refuses an empty answer, so a
 * form that offered to start one without it would be offering a row that
 * cannot be written.
 *
 * It arrives hidden, and attached to whichever page the list is filtered to —
 * which is almost always the page the person is thinking about, and is one
 * fewer box to tick before the question is where it belongs.
 */
export function NewFaqForm({
  scope,
  scopeLabel,
}: {
  scope: string;
  scopeLabel: string | null;
}) {
  const [state, formAction, pending] = useActionState(createFaq, initialRecordState);
  const [open, setOpen] = useState(false);

  useBusyWhile(pending, "Adding the question");
  useFormToast(state, { successTitle: "Question added", errorTitle: "Could not add it" });

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-border px-3.5 py-2.5 text-sm text-text-muted transition-colors hover:border-border-strong hover:text-text"
      >
        <Plus className="size-4" aria-hidden />
        New question
      </button>
    );
  }

  return (
    <form action={formAction} className="surface-raised mt-4 rounded-xl border border-border p-4">
      <input type="hidden" name="scope" value={scope} />

      <h2 className="font-display text-base font-semibold">New question</h2>
      <p className="mt-1.5 text-sm text-text-muted">
        {scopeLabel
          ? `It starts hidden and attached to the ${scopeLabel.toLowerCase()}. Tick it into more pages once the answer reads right.`
          : "It starts hidden and attached to no page. Choose its pages once the answer reads right."}
      </p>

      <div className="mt-4 space-y-4">
        <Field
          label="Question"
          required
          hint="In the words someone would actually use."
          error={state.fieldErrors?.question}
        >
          {(id, describedBy) => (
            <textarea
              id={id}
              name="question"
              required
              autoFocus
              rows={2}
              aria-describedby={describedBy}
              className={cn(FIELD, "resize-y")}
            />
          )}
        </Field>

        <Field
          label="Answer"
          required
          hint="Answer it honestly and then stop."
          error={state.fieldErrors?.answer}
        >
          {(id, describedBy) => (
            <textarea
              id={id}
              name="answer"
              required
              rows={5}
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
              Adding
            </>
          ) : (
            "Add question"
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
