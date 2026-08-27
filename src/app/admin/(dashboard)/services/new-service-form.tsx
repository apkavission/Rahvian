"use client";

import { useActionState, useState } from "react";
import { Plus } from "lucide-react";
import { BrandSpinner } from "@/components/brand/brand-loader";
import { useBusyWhile } from "@/components/forms/use-busy-while";
import { useFormToast } from "@/components/forms/use-form-toast";
import { Button } from "@/components/ui/button";
import { Field, FIELD } from "@/components/ui/field";
import { createService } from "@/lib/actions/services";
import { initialRecordState } from "@/lib/validation/records";
import { slugify } from "@/lib/utils";

/**
 * Create a service.
 *
 * Two fields, because a service needs two things to exist and everything else
 * is written in the form it lands in. It is created as a draft at the end of
 * the order, so naming one never puts an empty page on the live site, into the
 * navigation and into the sitemap at the same moment.
 *
 * The address is suggested from the name as it is typed and stops suggesting
 * the moment it is edited by hand — a suggestion that keeps overwriting what
 * someone deliberately typed is worse than no suggestion.
 */
export function NewServiceForm() {
  const [state, formAction, pending] = useActionState(createService, initialRecordState);
  const [open, setOpen] = useState(false);
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);

  useBusyWhile(pending, "Creating the service");
  useFormToast(state, { successTitle: "Service created", errorTitle: "Could not create it" });

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-border px-3.5 py-2.5 text-sm text-text-muted transition-colors hover:border-border-strong hover:text-text"
      >
        <Plus className="size-4" aria-hidden />
        New service
      </button>
    );
  }

  return (
    <form action={formAction} className="surface-raised mt-4 rounded-xl border border-border p-4">
      <h2 className="font-display text-base font-semibold">New service</h2>
      <p className="mt-1.5 text-sm text-text-muted">
        It starts as a draft, so nothing appears on the site until you publish
        it.
      </p>

      <div className="mt-4 space-y-4">
        <Field label="Name" required error={state.fieldErrors?.name}>
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
          label="Address"
          required
          hint="This becomes /services/your-slug."
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
            "Create service"
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
