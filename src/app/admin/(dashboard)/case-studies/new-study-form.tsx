"use client";

import { useActionState, useState } from "react";
import { Plus } from "lucide-react";
import { BrandSpinner } from "@/components/brand/brand-loader";
import { useBusyWhile } from "@/components/forms/use-busy-while";
import { useFormToast } from "@/components/forms/use-form-toast";
import { Button } from "@/components/ui/button";
import { Field, FIELD } from "@/components/ui/field";
import { createCaseStudy } from "@/lib/actions/case-studies";
import { initialRecordState } from "@/lib/validation/records";
import { slugify } from "@/lib/utils";

/**
 * Start a case study.
 *
 * Two fields, because everything else about a case study is optional at the
 * database level — deliberately, since a write-up is worth starting long before
 * every part of it can be filled in.
 *
 * It is created as a draft, so starting one never puts an unfinished page on
 * the site.
 */
export function NewStudyForm() {
  const [state, formAction, pending] = useActionState(createCaseStudy, initialRecordState);
  const [open, setOpen] = useState(false);
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);

  useBusyWhile(pending, "Creating the case study");
  useFormToast(state, { successTitle: "Case study created", errorTitle: "Could not create it" });

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-border px-3.5 py-2.5 text-sm text-text-muted transition-colors hover:border-border-strong hover:text-text"
      >
        <Plus className="size-4" aria-hidden />
        New case study
      </button>
    );
  }

  return (
    <form action={formAction} className="surface-raised mt-4 rounded-xl border border-border p-4">
      <h2 className="font-display text-base font-semibold">New case study</h2>
      <p className="mt-1.5 text-sm text-text-muted">
        It starts as a draft, so nothing appears on the site until you publish
        it.
      </p>

      <div className="mt-4 space-y-4">
        <Field
          label="Title"
          required
          hint="What the work achieved, not what it was called internally."
          error={state.fieldErrors?.title}
        >
          {(id, describedBy) => (
            <input
              id={id}
              name="title"
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
          hint="This becomes /case-studies/your-slug."
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
            "Create case study"
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
