"use client";

import { useActionState, useState } from "react";
import { Plus } from "lucide-react";
import { BrandSpinner } from "@/components/brand/brand-loader";
import { useBusyWhile } from "@/components/forms/use-busy-while";
import { useFormToast } from "@/components/forms/use-form-toast";
import { Button } from "@/components/ui/button";
import { Field, FIELD } from "@/components/ui/field";
import { createNavItem } from "@/lib/actions/navigation";
import { initialRecordState } from "@/lib/validation/records";
import { cn } from "@/lib/utils";

/**
 * Add a link.
 *
 * Both fields, not just the label: the table refuses an empty address, so a
 * form that offered to start a link without one would be offering a row that
 * cannot be written.
 *
 * It arrives hidden, at the end of whichever menu the list is showing, and at
 * the top level. Hidden because the menu is the one piece of content every
 * visitor meets on every page — a half-typed address should not be one save
 * away from being in it. Nesting, if it is wanted, is one field down in the
 * editor that opens straight afterwards.
 */
export function NewNavItemForm({
  location,
  locationLabel,
}: {
  location: string;
  locationLabel: string;
}) {
  const [state, formAction, pending] = useActionState(createNavItem, initialRecordState);
  const [open, setOpen] = useState(false);

  useBusyWhile(pending, "Adding the link");
  useFormToast(state, { successTitle: "Link added", errorTitle: "Could not add it" });

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-border px-3.5 py-2.5 text-sm text-text-muted transition-colors hover:border-border-strong hover:text-text"
      >
        <Plus className="size-4" aria-hidden />
        New link
      </button>
    );
  }

  return (
    <form action={formAction} className="surface-raised mt-4 rounded-xl border border-border p-4">
      <input type="hidden" name="location" value={location} />

      <h2 className="font-display text-base font-semibold">New link</h2>
      <p className="mt-1.5 text-sm text-text-muted">
        It starts hidden, at the end of the {locationLabel.toLowerCase()} menu.
        Tick it into the menu once the address is right.
      </p>

      <div className="mt-4 space-y-4">
        <Field
          label="Label"
          required
          hint="The words on the menu."
          error={state.fieldErrors?.label}
        >
          {(id, describedBy) => (
            <input
              id={id}
              name="label"
              type="text"
              required
              autoFocus
              maxLength={60}
              aria-describedby={describedBy}
              className={FIELD}
            />
          )}
        </Field>

        <Field
          label="Address"
          required
          hint="A page on this site starts with a slash — /pricing."
          error={state.fieldErrors?.href}
        >
          {(id, describedBy) => (
            <input
              id={id}
              name="href"
              type="text"
              required
              maxLength={300}
              placeholder="/services"
              aria-describedby={describedBy}
              className={cn(FIELD, "font-mono text-[0.8rem]")}
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
            "Add link"
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
