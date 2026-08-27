"use client";

import { useActionState, useState } from "react";
import { Plus } from "lucide-react";
import { BrandSpinner } from "@/components/brand/brand-loader";
import { useBusyWhile } from "@/components/forms/use-busy-while";
import { useFormToast } from "@/components/forms/use-form-toast";
import { Button } from "@/components/ui/button";
import { Field, FIELD } from "@/components/ui/field";
import { createProject } from "@/lib/actions/projects";
import { PROJECT_TYPE_OPTIONS } from "@/lib/records/projects";
import { initialRecordState } from "@/lib/validation/records";
import { slugify } from "@/lib/utils";

/**
 * Add a portfolio item.
 *
 * More than the usual two fields, and each extra one is here because the
 * database will not accept the row without it.
 *
 * The kind of work is NOT NULL and three check constraints hang off it. The
 * client name appears the moment "Client project" is chosen, because
 * `projects_client_named` is checked on **insert** rather than on publication —
 * a client project with no client cannot exist even as a draft. Leaving it to
 * the main form would mean the first thing anyone did on this screen was
 * refused.
 *
 * It is created as a draft at the end of the order, so adding one never puts an
 * empty page on the live site.
 */
export function NewProjectForm() {
  const [state, formAction, pending] = useActionState(createProject, initialRecordState);
  const [open, setOpen] = useState(false);
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [type, setType] = useState("client");

  useBusyWhile(pending, "Adding the portfolio item");
  useFormToast(state, { successTitle: "Added", errorTitle: "Could not add it" });

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-border px-3.5 py-2.5 text-sm text-text-muted transition-colors hover:border-border-strong hover:text-text"
      >
        <Plus className="size-4" aria-hidden />
        New item
      </button>
    );
  }

  return (
    <form action={formAction} className="surface-raised mt-4 rounded-xl border border-border p-4">
      <h2 className="font-display text-base font-semibold">New portfolio item</h2>
      <p className="mt-1.5 text-sm text-text-muted">
        It starts as a draft, so nothing appears on the site until you publish
        it.
      </p>

      <div className="mt-4 space-y-4">
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
          hint="This becomes /portfolio/your-slug."
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

        <Field
          label="Kind of work"
          required
          hint="Changeable later, but choose honestly now — a demo can never name a client, and client work must name one."
          error={state.fieldErrors?.type}
        >
          {(id, describedBy) => (
            <select
              id={id}
              name="type"
              required
              value={type}
              onChange={(event) => setType(event.target.value)}
              aria-describedby={describedBy}
              className={FIELD}
            >
              {PROJECT_TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          )}
        </Field>

        {/*
          Only for client work, and not rendered at all otherwise — an input
          that is present but must stay empty is an invitation to fill it in.
          Earlier work may name a client too, but is not required to, so it is
          left to the main form where it sits beside everything else.
        */}
        {type === "client" && (
          <Field
            label="Client"
            required
            hint="Who the work was for. An unnamed client project is indistinguishable from an invented one, so the database refuses it."
            error={state.fieldErrors?.client_name}
          >
            {(id, describedBy) => (
              <input
                id={id}
                name="client_name"
                required
                aria-describedby={describedBy}
                className={FIELD}
              />
            )}
          </Field>
        )}
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
            "Add item"
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
