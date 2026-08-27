"use client";

import { useActionState, useEffect, useId, useRef } from "react";
import { BrandSpinner } from "@/components/brand/brand-loader";
import { useBusyWhile } from "@/components/forms/use-busy-while";
import { useFormToast } from "@/components/forms/use-form-toast";
import { Button } from "@/components/ui/button";
import { FIELD, LABEL } from "@/components/ui/field";
import { addLeadNote } from "@/lib/actions/leads";
import { initialLeadActionState } from "@/lib/validation/leads";
import { cn } from "@/lib/utils";

/**
 * Add a note.
 *
 * The textarea clears itself only on success. A note that failed to save and
 * vanished from the box at the same time is a note the author has to write
 * again from memory, which is exactly when they write a shorter one.
 */
export function NoteForm({ leadId }: { leadId: string }) {
  const id = useId();
  const [state, formAction, pending] = useActionState(addLeadNote, initialLeadActionState);
  const form = useRef<HTMLFormElement>(null);
  const cleared = useRef<typeof state | null>(null);

  useBusyWhile(pending, "Saving the note");
  useFormToast(state, { successTitle: "Note added", errorTitle: "Could not save it" });

  useEffect(() => {
    if (state.status !== "success" || cleared.current === state) return;
    cleared.current = state;
    form.current?.reset();
  }, [state]);

  return (
    <form action={formAction} ref={form}>
      <input type="hidden" name="lead_id" value={leadId} />

      <label htmlFor={id} className={LABEL}>
        Add a note
      </label>
      <textarea
        id={id}
        name="body"
        rows={3}
        required
        placeholder="What was said, what was agreed, what happens next."
        aria-describedby={state.fieldErrors?.body ? `${id}-error` : undefined}
        aria-invalid={state.fieldErrors?.body ? true : undefined}
        className={cn(FIELD, "mt-2 resize-y")}
      />

      {state.fieldErrors?.body && (
        <p id={`${id}-error`} className="mt-1.5 text-sm text-danger">
          {state.fieldErrors.body}
        </p>
      )}

      <div className="mt-3">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? (
            <>
              <BrandSpinner />
              Saving
            </>
          ) : (
            "Save note"
          )}
        </Button>
      </div>
    </form>
  );
}
