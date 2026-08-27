"use client";

import { useActionState, useState } from "react";
import { Plus } from "lucide-react";
import { BrandSpinner } from "@/components/brand/brand-loader";
import { useBusyWhile } from "@/components/forms/use-busy-while";
import { useFormToast } from "@/components/forms/use-form-toast";
import { Button } from "@/components/ui/button";
import { Field, FIELD } from "@/components/ui/field";
import { createPage } from "@/lib/actions/pages";
import { initialPageActionState } from "@/lib/validation/pages";
import { slugify } from "@/lib/utils";

/**
 * Create a page.
 *
 * Two fields, because a page needs two things to exist and everything else is
 * written in the builder it lands in. It is created as a draft, so naming one
 * never puts an empty page on the live site.
 *
 * The slug is suggested from the title as it is typed and stops suggesting the
 * moment it is edited by hand — a suggestion that keeps overwriting what
 * someone deliberately typed is worse than no suggestion.
 */
export function NewPageForm() {
  const [state, formAction, pending] = useActionState(createPage, initialPageActionState);
  const [open, setOpen] = useState(false);
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);

  useBusyWhile(pending, "Creating the page");
  useFormToast(state, { successTitle: "Page created", errorTitle: "Could not create it" });

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-accent-fg transition-colors hover:bg-accent-hover"
      >
        <Plus className="size-4" aria-hidden />
        New page
      </button>
    );
  }

  return (
    <form
      action={formAction}
      className="surface-raised w-full rounded-2xl border border-border p-5 sm:w-auto sm:min-w-[28rem]"
    >
      <h2 className="font-display text-base font-semibold">New page</h2>
      <p className="mt-1.5 text-sm text-text-muted">
        It starts as a draft with no sections, so nothing appears on the site
        until you publish it.
      </p>

      <div className="mt-5 space-y-4">
        <Field label="Title" required error={state.fieldErrors?.title}>
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
          hint="Lowercase, hyphenated, one segment. This becomes /your-slug."
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

      {/*
        A page created here has no route in the code yet, and saying so once is
        cheaper than someone wondering why /whatever is a 404.
      */}
      <p className="mt-4 rounded-lg bg-surface-2 p-3 text-xs leading-relaxed text-text-subtle">
        A new page needs a route in the code before visitors can reach it. The
        built-in pages already have theirs; tell your developer the slug you
        chose.
      </p>

      <div className="mt-5 flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? (
            <>
              <BrandSpinner />
              Creating
            </>
          ) : (
            "Create page"
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
