"use client";

import { useActionState, useState } from "react";
import { Plus } from "lucide-react";
import { BrandSpinner } from "@/components/brand/brand-loader";
import { useBusyWhile } from "@/components/forms/use-busy-while";
import { useFormToast } from "@/components/forms/use-form-toast";
import { Button } from "@/components/ui/button";
import { Field, FIELD } from "@/components/ui/field";
import type { RoleDefinition } from "@/lib/auth/roles";
import { createAccount } from "@/lib/actions/users";
import { initialAccountState } from "@/lib/validation/users";
import { CredentialsNote } from "./credentials-note";

/**
 * Open an account for somebody.
 *
 * Three fields, and no password among them. The system generates one, Supabase
 * keeps only its hash, and the address receives it — so an owner never types a
 * colleague's password and therefore never knows it. That is the whole point,
 * and it is why this form looks shorter than people expect.
 *
 * Sign-up is disabled at the Supabase project, so this is the only way an
 * account comes into existence.
 */
export function NewAccountForm({ assignable }: { assignable: RoleDefinition[] }) {
  const [state, formAction, pending] = useActionState(createAccount, initialAccountState);
  const [open, setOpen] = useState(false);

  useBusyWhile(pending, "Creating the account");
  useFormToast(state, {
    successTitle: "Account created",
    errorTitle: "Could not create it",
  });

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-border px-3.5 py-2.5 text-sm text-text-muted transition-colors hover:border-border-strong hover:text-text"
      >
        <Plus className="size-4" aria-hidden />
        New account
      </button>
    );
  }

  return (
    <div className="mt-4 space-y-4">
      <form action={formAction} className="surface-raised rounded-xl border border-border p-4">
        <h2 className="font-display text-base font-semibold">New account</h2>
        <p className="mt-1.5 text-sm leading-relaxed text-text-muted">
          A password is generated and emailed to the address. Nobody, including
          you, can read it back afterwards.
        </p>

        <div className="mt-4 space-y-4">
          <Field
            label="Name"
            required
            hint="As they would introduce themselves."
            error={state.fieldErrors?.full_name}
          >
            {(id, describedBy) => (
              <input
                id={id}
                name="full_name"
                required
                autoFocus
                autoComplete="off"
                aria-describedby={describedBy}
                className={FIELD}
              />
            )}
          </Field>

          <Field
            label="Email address"
            required
            hint="Where the password goes, and what they sign in with."
            error={state.fieldErrors?.email}
          >
            {(id, describedBy) => (
              <input
                id={id}
                name="email"
                type="email"
                inputMode="email"
                required
                autoComplete="off"
                aria-describedby={describedBy}
                className={FIELD}
              />
            )}
          </Field>

          <Field
            label="Role"
            required
            hint="What they can do. It can be changed afterwards, and their menu adjusted per person."
            error={state.fieldErrors?.role}
          >
            {(id, describedBy) => (
              <select
                id={id}
                name="role"
                defaultValue={assignable.at(-1)?.key ?? ""}
                aria-describedby={describedBy}
                className={FIELD}
              >
                {assignable.map((role) => (
                  <option key={role.key} value={role.key}>
                    {role.label}
                  </option>
                ))}
              </select>
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
              "Create account"
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

      {state.credentials && (
        <CredentialsNote
          email={state.credentials.email}
          password={state.credentials.password}
          reason={state.credentials.reason}
        />
      )}
    </div>
  );
}
