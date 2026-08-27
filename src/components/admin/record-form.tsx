"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { BrandSpinner } from "@/components/brand/brand-loader";
import { FieldInput } from "@/components/admin/field-input";
import { requestPreviewRefresh } from "@/components/admin/preview-pane";
import { useBusyWhile } from "@/components/forms/use-busy-while";
import { useFormToast } from "@/components/forms/use-form-toast";
import { Button } from "@/components/ui/button";
import type { Fieldset } from "@/lib/records/definition";
import { initialRecordState, type RecordActionState } from "@/lib/validation/records";

/**
 * The editor column, for any content record.
 *
 * The same machinery the section editor uses, applied to a row rather than to a
 * JSONB column: the whole record is one piece of state, every control writes
 * into it by dotted path, and the lot is submitted as a single JSON field. The
 * Server Action parses that JSON against the schema built from these same
 * descriptors, so a hand-crafted post is refused exactly as a mistyped form is.
 *
 * Written once and shared, because services, portfolio, case studies, blog,
 * pricing, FAQs and team are this form seven more times. Seven copies would
 * drift, and the copy that drifted would be the screen nobody had opened
 * recently.
 *
 * The fieldsets are built by the caller rather than passed down from a server
 * component — they carry regular expressions, which do not survive the trip
 * across the server/client boundary.
 */
export function RecordForm({
  id,
  fieldsets,
  values: initialValues,
  action,
  copy,
}: {
  id: string;
  fieldsets: Fieldset[];
  values: Record<string, unknown>;
  action: (
    previous: RecordActionState,
    formData: FormData,
  ) => Promise<RecordActionState>;
  copy: {
    /** The save button, at rest. */
    save: string;
    /** The overlay's line while it saves. */
    busy: string;
    /** The toast's heading on success. */
    saved: string;
  };
}) {
  const [values, setValues] = useState<Record<string, unknown>>(initialValues);
  const [state, formAction, pending] = useActionState(action, initialRecordState);

  useBusyWhile(pending, copy.busy);
  useFormToast(state, { successTitle: copy.saved, errorTitle: "Could not save" });

  // Tell the preview beside this form to re-render, once per save rather than
  // once per render — `useActionState` hands back the same object on unrelated
  // re-renders, and a preview that reloads on every keystroke is a flicker.
  const announced = useRef<RecordActionState | null>(null);
  useEffect(() => {
    if (state.status !== "success" || announced.current === state) return;
    announced.current = state;
    requestPreviewRefresh();
  }, [state]);

  /**
   * Write a value at a dotted path, without mutating what is already there.
   *
   * Numeric segments address array indices. The path is the same string Zod
   * reports an error at — `included_items.1` — which is what lets a server-side
   * message be shown against the input that produced it.
   */
  function setAt(path: string, value: unknown) {
    const segments = path.split(".");

    setValues((previous) => {
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
    <form action={formAction} className="space-y-8">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="values" value={JSON.stringify(values)} />

      {fieldsets.map((fieldset) => (
        <fieldset key={fieldset.legend} className="border-t border-border pt-6 first:border-0 first:pt-0">
          <legend className="sr-only">{fieldset.legend}</legend>

          <h3 className="font-mono text-[0.65rem] uppercase tracking-[0.16em] text-text-subtle">
            {fieldset.legend}
          </h3>
          {fieldset.hint ? (
            <p className="measure mt-2 text-sm leading-relaxed text-text-muted">{fieldset.hint}</p>
          ) : null}

          <div className="mt-5 space-y-5">
            {fieldset.fields.map((field) => (
              <FieldInput
                key={field.name}
                field={field}
                value={values[field.name]}
                path={field.name}
                errors={state.fieldErrors}
                onChange={setAt}
              />
            ))}
          </div>
        </fieldset>
      ))}

      <div className="sticky bottom-0 -mx-6 border-t border-border bg-surface/90 px-6 py-4 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <Button type="submit" disabled={pending}>
            {pending ? (
              <>
                <BrandSpinner />
                Saving
              </>
            ) : (
              copy.save
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
