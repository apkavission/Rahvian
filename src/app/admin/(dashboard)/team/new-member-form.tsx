"use client";

import { useActionState, useState } from "react";
import { Plus } from "lucide-react";
import { BrandSpinner } from "@/components/brand/brand-loader";
import { useBusyWhile } from "@/components/forms/use-busy-while";
import { useFormToast } from "@/components/forms/use-form-toast";
import { Button } from "@/components/ui/button";
import { Field, FIELD } from "@/components/ui/field";
import { createMember } from "@/lib/actions/team";
import { initialRecordState } from "@/lib/validation/records";

/**
 * Add someone.
 *
 * Two fields, both of which the table requires. It starts as a draft, so
 * adding a name never puts a half-written card on the About page.
 */
export function NewMemberForm() {
  const [state, formAction, pending] = useActionState(createMember, initialRecordState);
  const [open, setOpen] = useState(false);

  useBusyWhile(pending, "Adding the profile");
  useFormToast(state, { successTitle: "Profile added", errorTitle: "Could not add them" });

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-border px-3.5 py-2.5 text-sm text-text-muted transition-colors hover:border-border-strong hover:text-text"
      >
        <Plus className="size-4" aria-hidden />
        New profile
      </button>
    );
  }

  return (
    <form action={formAction} className="surface-raised mt-4 rounded-xl border border-border p-4">
      <h2 className="font-display text-base font-semibold">New profile</h2>
      <p className="mt-1.5 text-sm text-text-muted">
        It starts as a draft, so nothing appears on the About page until you
        publish it.
      </p>

      <div className="mt-4 space-y-4">
        <Field
          label="Name"
          required
          hint="As they would introduce themselves."
          error={state.fieldErrors?.name}
        >
          {(id, describedBy) => (
            <input
              id={id}
              name="name"
              required
              autoFocus
              aria-describedby={describedBy}
              className={FIELD}
            />
          )}
        </Field>

        <Field
          label="Role"
          required
          hint="What they actually do here."
          error={state.fieldErrors?.role}
        >
          {(id, describedBy) => (
            <input
              id={id}
              name="role"
              required
              aria-describedby={describedBy}
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
              Adding
            </>
          ) : (
            "Add profile"
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
