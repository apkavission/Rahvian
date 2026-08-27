"use client";

import { useActionState, useState } from "react";
import { Plus } from "lucide-react";
import { BrandSpinner } from "@/components/brand/brand-loader";
import { useBusyWhile } from "@/components/forms/use-busy-while";
import { useFormToast } from "@/components/forms/use-form-toast";
import { Button } from "@/components/ui/button";
import { Field, FIELD } from "@/components/ui/field";
import { createPost } from "@/lib/actions/blog";
import { initialRecordState } from "@/lib/validation/records";
import { slugify } from "@/lib/utils";

/**
 * Start a post.
 *
 * A title and an address, and then straight into the article. Everything else —
 * the excerpt, the category, the tags — is written alongside the body, and
 * asking for it first would be asking before the piece exists.
 *
 * It is created as a draft, so starting one never puts an empty article on the
 * site.
 */
export function NewPostForm() {
  const [state, formAction, pending] = useActionState(createPost, initialRecordState);
  const [open, setOpen] = useState(false);
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);

  useBusyWhile(pending, "Creating the post");
  useFormToast(state, { successTitle: "Post created", errorTitle: "Could not create it" });

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-border px-3.5 py-2.5 text-sm text-text-muted transition-colors hover:border-border-strong hover:text-text"
      >
        <Plus className="size-4" aria-hidden />
        New post
      </button>
    );
  }

  return (
    <form action={formAction} className="surface-raised mt-4 rounded-xl border border-border p-4">
      <h2 className="font-display text-base font-semibold">New post</h2>
      <p className="mt-1.5 text-sm text-text-muted">
        It starts as a draft with an empty body, so nothing appears on the site
        until you publish it.
      </p>

      <div className="mt-4 space-y-4">
        <Field
          label="Title"
          required
          hint="What the reader gets out of it."
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
          hint="This becomes /blog/your-slug."
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
            "Create post"
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
