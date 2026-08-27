"use client";

import { useActionState } from "react";
import { BrandSpinner } from "@/components/brand/brand-loader";
import { useBusyWhile } from "@/components/forms/use-busy-while";
import { useFormToast } from "@/components/forms/use-form-toast";
import { Button } from "@/components/ui/button";
import { Field, FIELD } from "@/components/ui/field";
import { savePageMeta } from "@/lib/actions/pages";
import { initialPageActionState, PAGE_STATUSES } from "@/lib/validation/pages";
import { cn } from "@/lib/utils";

export interface PageMetaValues {
  id: string;
  title: string;
  slug: string;
  status: string;
  is_system: boolean;
  seo_title: string;
  seo_description: string;
  canonical_url: string;
  schema_type: string;
  noindex: boolean;
}

/**
 * The page's own fields — everything that is not a section.
 *
 * The slug of a system page is shown but locked. A code route reads that row
 * by slug, so renaming one would leave a live URL with nothing behind it; the
 * database blocks deleting these pages for the same reason, and this is the
 * other half of that rule. Everything else about them is freely editable.
 */
export function PageMetaForm({ values }: { values: PageMetaValues }) {
  const [state, formAction, pending] = useActionState(savePageMeta, initialPageActionState);

  useBusyWhile(pending, "Saving the page");
  useFormToast(state, { successTitle: "Page saved", errorTitle: "Could not save" });

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="page_id" value={values.id} />

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Title" required error={state.fieldErrors?.title}>
          {(id, describedBy) => (
            <input
              id={id}
              name="title"
              defaultValue={values.title}
              required
              aria-describedby={describedBy}
              className={FIELD}
            />
          )}
        </Field>

        <Field
          label="Slug"
          required
          hint={
            values.is_system
              ? "Locked: a route in the code reads this page by its slug."
              : "Lowercase, hyphenated, one segment."
          }
          error={state.fieldErrors?.slug}
        >
          {(id, describedBy) => (
            <input
              id={id}
              name="slug"
              defaultValue={values.slug}
              required
              readOnly={values.is_system}
              aria-describedby={describedBy}
              className={cn(FIELD, values.is_system && "cursor-not-allowed opacity-70")}
            />
          )}
        </Field>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Status" required error={state.fieldErrors?.status}>
          {(id, describedBy) => (
            <select
              id={id}
              name="status"
              defaultValue={values.status}
              aria-describedby={describedBy}
              className={FIELD}
            >
              {PAGE_STATUSES.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          )}
        </Field>

        <Field
          label="Schema type"
          hint="The schema.org type emitted for this page, e.g. AboutPage."
          error={state.fieldErrors?.schema_type}
        >
          {(id, describedBy) => (
            <input
              id={id}
              name="schema_type"
              defaultValue={values.schema_type}
              aria-describedby={describedBy}
              className={FIELD}
            />
          )}
        </Field>
      </div>

      <Field
        label="SEO title"
        hint="Goes through the title template from the SEO defaults. Around 60 characters."
        error={state.fieldErrors?.seo_title}
      >
        {(id, describedBy) => (
          <input
            id={id}
            name="seo_title"
            defaultValue={values.seo_title}
            aria-describedby={describedBy}
            className={FIELD}
          />
        )}
      </Field>

      <Field
        label="Meta description"
        hint="Around 155 characters. Written when one is missing, usually out of the first sentence found."
        error={state.fieldErrors?.seo_description}
      >
        {(id, describedBy) => (
          <textarea
            id={id}
            name="seo_description"
            rows={3}
            defaultValue={values.seo_description}
            aria-describedby={describedBy}
            className={cn(FIELD, "resize-y")}
          />
        )}
      </Field>

      <Field
        label="Canonical URL"
        hint="Only when this page duplicates another. Blank is almost always right."
        error={state.fieldErrors?.canonical_url}
      >
        {(id, describedBy) => (
          <input
            id={id}
            name="canonical_url"
            defaultValue={values.canonical_url}
            aria-describedby={describedBy}
            className={FIELD}
          />
        )}
      </Field>

      <label className="flex items-start gap-3 text-sm">
        <input
          type="checkbox"
          name="noindex"
          defaultChecked={values.noindex}
          className="mt-0.5 size-4 shrink-0 rounded-sm border-border-strong text-accent focus:ring-2 focus:ring-accent/20"
        />
        <span>
          <span className="font-medium">Keep this page out of search results</span>
          <span className="mt-1 block text-xs text-text-subtle">
            The site-wide switch can add this but never remove it.
          </span>
        </span>
      </label>

      <div className="flex items-center gap-4 border-t border-border pt-5">
        <Button type="submit" disabled={pending}>
          {pending ? (
            <>
              <BrandSpinner />
              Saving
            </>
          ) : (
            "Save page"
          )}
        </Button>

        {state.status === "error" && !state.fieldErrors ? (
          <p role="alert" className="text-sm text-danger">
            {state.message}
          </p>
        ) : null}
      </div>
    </form>
  );
}
