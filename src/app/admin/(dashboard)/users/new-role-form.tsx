"use client";

import { useActionState, useState } from "react";
import { Plus } from "lucide-react";
import { BrandSpinner } from "@/components/brand/brand-loader";
import { useBusyWhile } from "@/components/forms/use-busy-while";
import { useFormToast } from "@/components/forms/use-form-toast";
import { Button } from "@/components/ui/button";
import { Field, FIELD } from "@/components/ui/field";
import { createRole } from "@/lib/actions/roles";
import { initialRecordState } from "@/lib/validation/records";

/** A name typed by a person, as the key the database will hold. */
function toKey(label: string): string {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 64);
}

/**
 * Add a role.
 *
 * A name and a key, and nothing else: it arrives with no capabilities and an
 * empty menu, and what it can do is decided on the editor beside it. A new role
 * that started as a copy of an existing one would be a set of permissions
 * nobody read before granting.
 *
 * The key is suggested from the name and can be corrected, because it is the
 * one thing that never changes afterwards — every account holding the role
 * stores it.
 */
export function NewRoleForm() {
  const [state, formAction, pending] = useActionState(createRole, initialRecordState);
  const [open, setOpen] = useState(false);
  const [key, setKey] = useState("");
  const [touched, setTouched] = useState(false);

  useBusyWhile(pending, "Adding the role");
  useFormToast(state, { successTitle: "Role added", errorTitle: "Could not add it" });

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-border px-3.5 py-2.5 text-sm text-text-muted transition-colors hover:border-border-strong hover:text-text"
      >
        <Plus className="size-4" aria-hidden />
        New role
      </button>
    );
  }

  return (
    <form action={formAction} className="surface-raised mt-4 rounded-xl border border-border p-4">
      <h2 className="font-display text-base font-semibold">New role</h2>
      <p className="mt-1.5 text-sm leading-relaxed text-text-muted">
        It starts able to do nothing at all. Give it a name here, then decide
        what it can reach.
      </p>

      <div className="mt-4 space-y-4">
        <Field label="Name" required error={state.fieldErrors?.label}>
          {(id, describedBy) => (
            <input
              id={id}
              name="label"
              required
              autoFocus
              aria-describedby={describedBy}
              onChange={(event) => {
                if (!touched) setKey(toKey(event.target.value));
              }}
              className={FIELD}
            />
          )}
        </Field>

        <Field
          label="Key"
          required
          hint="Stored on every account with this role, and never changed afterwards."
          error={state.fieldErrors?.key}
        >
          {(id, describedBy) => (
            <input
              id={id}
              name="key"
              required
              value={key}
              onChange={(event) => {
                setTouched(true);
                setKey(event.target.value);
              }}
              aria-describedby={describedBy}
              className={`${FIELD} font-mono`}
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
            "Add role"
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
