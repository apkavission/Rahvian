"use client";

import { useActionState, useEffect, useId, useRef, useState } from "react";
import { BrandSpinner } from "@/components/brand/brand-loader";
import { FieldInput } from "@/components/admin/field-input";
import { requestPreviewRefresh } from "@/components/admin/preview-pane";
import { useBusyWhile } from "@/components/forms/use-busy-while";
import { useFormToast } from "@/components/forms/use-form-toast";
import { Button } from "@/components/ui/button";
import { FIELD, LABEL } from "@/components/ui/field";
import { saveSection } from "@/lib/actions/pages";
import { getDefinition } from "@/lib/sections/definitions";
import { BACKGROUND_OPTIONS } from "@/lib/sections/fields";
import { initialPageActionState } from "@/lib/validation/pages";
import { cn } from "@/lib/utils";

/**
 * The form for one section, built from its field descriptors.
 *
 * The whole content object is one piece of state, and every control writes
 * into it by path. That is what makes a repeater inside a group inside an
 * array work without a component per shape — and it is why the payload can be
 * submitted as a single JSON field rather than as a hundred named inputs whose
 * nesting would have to be parsed back out on the server.
 *
 * It is validated on the way in regardless: the Server Action parses that JSON
 * against a schema derived from these same descriptors, so a hand-crafted post
 * is refused exactly as a mistyped form would be.
 */
export function SectionEditor({
  pageId,
  section,
}: {
  pageId: string;
  section: {
    id: string;
    type: string;
    background_variant: string;
    content: unknown;
  };
}) {
  const definition = getDefinition(section.type);
  const backgroundId = useId();

  const [content, setContent] = useState<Record<string, unknown>>(
    section.content && typeof section.content === "object" && !Array.isArray(section.content)
      ? (section.content as Record<string, unknown>)
      : {},
  );
  const [background, setBackground] = useState(section.background_variant);

  const [state, formAction, pending] = useActionState(saveSection, initialPageActionState);

  useBusyWhile(pending, "Saving the section");
  useFormToast(state, { successTitle: "Section saved", errorTitle: "Could not save" });

  // Tell the preview beside this form to re-render, once per save rather than
  // once per render — `useActionState` hands back the same object on unrelated
  // re-renders, and a preview that reloads on every keystroke is a flicker.
  const announced = useRef<typeof state | null>(null);
  useEffect(() => {
    if (state.status !== "success" || announced.current === state) return;
    announced.current = state;
    requestPreviewRefresh();
  }, [state]);

  if (!definition) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-surface-2/40 p-8">
        <h2 className="font-display text-base font-semibold">
          No editor for &ldquo;{section.type}&rdquo;
        </h2>
        <p className="measure mt-3 text-sm leading-relaxed text-text-muted">
          The section renders on the site but has no field definition here, so
          there is nothing safe to edit. Adding one is a few lines in
          <code className="mx-1 rounded bg-surface-3 px-1.5 py-0.5 font-mono text-xs">
            lib/sections/definitions.ts
          </code>
          — and no migration, because the type is a text column.
        </p>
      </div>
    );
  }

  /**
   * Write a value at a dotted path, without mutating what is already there.
   *
   * Numeric segments address array indices. The path is the same string Zod
   * reports an error at — `features.1.title` — which is what lets a server-side
   * message be shown against the input that produced it.
   *
   * Copying at each level rather than writing in place is what lets React see
   * the change, and what would let an undo stack keep the previous object.
   */
  function setAt(path: string, value: unknown) {
    const segments = path.split(".");

    setContent((previous) => {
      const clone = structuredClone(previous);
      let node: Record<string, unknown> | unknown[] = clone;

      for (let i = 0; i < segments.length - 1; i += 1) {
        const key = segments[i];
        const nextKey = segments[i + 1];
        const container = node as Record<string, unknown>;

        if (container[key] === undefined || container[key] === null) {
          container[key] = /^\d+$/.test(nextKey) ? [] : {};
        }
        node = container[key] as Record<string, unknown> | unknown[];
      }

      (node as Record<string, unknown>)[segments[segments.length - 1]] = value;
      return clone;
    });
  }

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="page_id" value={pageId} />
      <input type="hidden" name="section_id" value={section.id} />
      <input type="hidden" name="type" value={section.type} />
      <input type="hidden" name="content" value={JSON.stringify(content)} />

      <div>
        <h2 className="font-display text-lg font-semibold">{definition.label}</h2>
        <p className="mt-1.5 text-sm text-text-muted">{definition.description}</p>
      </div>

      <div>
        <label htmlFor={backgroundId} className={LABEL}>
          Background
        </label>
        <select
          id={backgroundId}
          name="background_variant"
          value={background}
          onChange={(event) => setBackground(event.target.value)}
          className={cn(FIELD, "mt-2")}
        >
          {BACKGROUND_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-5 border-t border-border pt-6">
        {definition.fields.map((field) => (
          <FieldInput
            key={field.name}
            field={field}
            value={content[field.name]}
            path={field.name}
            errors={state.fieldErrors}
            onChange={setAt}
          />
        ))}
      </div>

      <div className="sticky bottom-0 -mx-6 border-t border-border bg-surface/90 px-6 py-4 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <Button type="submit" disabled={pending}>
            {pending ? (
              <>
                <BrandSpinner />
                Saving
              </>
            ) : (
              "Save section"
            )}
          </Button>

          {state.status === "error" && !state.fieldErrors ? (
            <p role="alert" className="text-sm text-danger">
              {state.message}
            </p>
          ) : null}
        </div>
      </div>
    </form>
  );
}
