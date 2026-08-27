"use client";

import { useId } from "react";
import { Plus, Trash2 } from "lucide-react";
import { MediaPicker } from "@/components/admin/media-picker";
import { FIELD, LABEL } from "@/components/ui/field";
import { emptyContent, type Field } from "@/lib/sections/fields";
import { cn } from "@/lib/utils";

/**
 * One field of a section's content, rendered from its descriptor.
 *
 * Recursive: a group renders its own fields, a repeater renders a group per
 * row. The value and the change handler are threaded through rather than held
 * here, so the whole editor has exactly one piece of state — the content
 * object — and undo, dirty-checking and the eventual preview all have one
 * thing to read.
 *
 * `path` is the dotted route to this value inside the content object. It is
 * what lets a validation error the server reports at `features.1.title` be
 * shown against the right input.
 */
export function FieldInput({
  field,
  value,
  path,
  errors,
  onChange,
}: {
  field: Field;
  value: unknown;
  path: string;
  errors?: Record<string, string>;
  onChange: (path: string, value: unknown) => void;
}) {
  const id = useId();
  const error = errors?.[path];
  const describedBy = [field.hint ? `${id}-hint` : null, error ? `${id}-error` : null]
    .filter(Boolean)
    .join(" ") || undefined;

  const label = (
    <label htmlFor={id} className={LABEL}>
      {field.label}
      {field.required ? (
        <span className="ml-0.5 text-accent" aria-hidden>
          *
        </span>
      ) : null}
    </label>
  );

  const messages = (
    <>
      {field.hint && (
        <p id={`${id}-hint`} className="mt-1.5 text-xs text-text-subtle">
          {field.hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="mt-1.5 text-sm text-danger">
          {error}
        </p>
      )}
    </>
  );

  switch (field.kind) {
    case "text":
      return (
        <div>
          {label}
          <input
            id={id}
            type="text"
            value={typeof value === "string" ? value : ""}
            placeholder={field.placeholder}
            aria-describedby={describedBy}
            aria-invalid={error ? true : undefined}
            onChange={(event) => onChange(path, event.target.value)}
            className={cn(FIELD, "mt-2")}
          />
          {messages}
        </div>
      );

    case "textarea":
      return (
        <div>
          {label}
          <textarea
            id={id}
            rows={field.rows ?? 4}
            value={typeof value === "string" ? value : ""}
            placeholder={field.placeholder}
            aria-describedby={describedBy}
            aria-invalid={error ? true : undefined}
            onChange={(event) => onChange(path, event.target.value)}
            className={cn(FIELD, "mt-2 resize-y")}
          />
          {messages}
        </div>
      );

    case "number":
      return (
        <div>
          {label}
          <input
            id={id}
            type="number"
            inputMode="numeric"
            min={field.min}
            max={field.max}
            value={typeof value === "number" ? value : ""}
            aria-describedby={describedBy}
            aria-invalid={error ? true : undefined}
            onChange={(event) => {
              // An empty box means "no limit", not zero.
              const next = event.target.value;
              onChange(path, next === "" ? undefined : Number(next));
            }}
            className={cn(FIELD, "mt-2")}
          />
          {messages}
        </div>
      );

    case "image":
      return (
        <div>
          {label}
          <MediaPicker
            id={id}
            spec={field.spec}
            assets={field.assets}
            value={typeof value === "string" ? value : ""}
            invalid={Boolean(error)}
            describedBy={describedBy}
            onChange={(next) => onChange(path, next)}
          />
          {messages}
        </div>
      );

    case "boolean":
      return (
        <div>
          <label className="flex items-start gap-3 text-sm">
            <input
              type="checkbox"
              checked={value === true}
              onChange={(event) => onChange(path, event.target.checked)}
              className="mt-0.5 size-4 shrink-0 rounded-sm border-border-strong text-accent focus:ring-2 focus:ring-accent/20"
            />
            <span>
              <span className="font-medium">{field.label}</span>
              {field.hint && (
                <span className="mt-1 block text-xs text-text-subtle">{field.hint}</span>
              )}
            </span>
          </label>
          {error && <p className="mt-1.5 text-sm text-danger">{error}</p>}
        </div>
      );

    case "select":
      return (
        <div>
          {label}
          <select
            id={id}
            value={typeof value === "string" ? value : ""}
            aria-describedby={describedBy}
            onChange={(event) => onChange(path, event.target.value)}
            className={cn(FIELD, "mt-2")}
          >
            {!field.required && <option value="">Not set</option>}
            {field.options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {messages}
        </div>
      );

    /*
      A string array as one textarea, one entry per line.

      Deliberately not a repeater of single inputs. These are short phrases —
      bullet points, capability words, paragraphs of a policy — and a list of
      eight of them is faster to write, reorder and paste into a text block
      than into eight boxes with add and remove buttons between them.
    */
    case "list":
      return (
        <div>
          {label}
          <textarea
            id={id}
            rows={5}
            value={Array.isArray(value) ? value.join("\n") : ""}
            aria-describedby={describedBy}
            aria-invalid={error ? true : undefined}
            onChange={(event) =>
              onChange(
                path,
                event.target.value
                  .split("\n")
                  .map((line) => line.trim())
                  .filter(Boolean),
              )
            }
            className={cn(FIELD, "mt-2 resize-y font-mono text-xs leading-relaxed")}
          />
          <p className="mt-1.5 text-xs text-text-subtle">
            {field.hint ? `${field.hint} ` : ""}One per line.
          </p>
          {error && <p className="mt-1.5 text-sm text-danger">{error}</p>}
        </div>
      );

    case "checkboxes": {
      const selected = Array.isArray(value) ? (value as string[]) : [];
      return (
        <fieldset>
          <legend className={LABEL}>{field.label}</legend>
          <div className="mt-2 space-y-2">
            {field.options.map((option) => (
              <label key={option.value} className="flex items-center gap-3 text-sm">
                <input
                  type="checkbox"
                  checked={selected.includes(option.value)}
                  onChange={(event) =>
                    onChange(
                      path,
                      event.target.checked
                        ? [...selected, option.value]
                        : selected.filter((entry) => entry !== option.value),
                    )
                  }
                  className="size-4 shrink-0 rounded-sm border-border-strong text-accent focus:ring-2 focus:ring-accent/20"
                />
                {option.label}
              </label>
            ))}
          </div>
          {field.hint && <p className="mt-1.5 text-xs text-text-subtle">{field.hint}</p>}
          {error && <p className="mt-1.5 text-sm text-danger">{error}</p>}
        </fieldset>
      );
    }

    case "group": {
      const group = (value && typeof value === "object" ? value : {}) as Record<string, unknown>;
      return (
        <fieldset className="rounded-xl border border-border p-4">
          <legend className="px-1.5 text-sm font-medium">{field.label}</legend>
          {field.hint && <p className="text-xs text-text-subtle">{field.hint}</p>}
          <div className={cn("space-y-4", field.hint && "mt-3")}>
            {field.fields.map((child) => (
              <FieldInput
                key={child.name}
                field={child}
                value={group[child.name]}
                path={`${path}.${child.name}`}
                errors={errors}
                onChange={onChange}
              />
            ))}
          </div>
        </fieldset>
      );
    }

    case "repeater": {
      const rows = Array.isArray(value) ? (value as Record<string, unknown>[]) : [];
      const atMax = field.max !== undefined && rows.length >= field.max;

      return (
        <fieldset>
          <legend className={LABEL}>
            {field.label}
            {field.required ? (
              <span className="ml-0.5 text-accent" aria-hidden>
                *
              </span>
            ) : null}
          </legend>
          {field.hint && <p className="mt-1 text-xs text-text-subtle">{field.hint}</p>}

          <div className="mt-3 space-y-3">
            {rows.map((row, index) => (
              <div key={index} className="rounded-xl border border-border bg-surface-2/40 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-mono text-[0.65rem] uppercase tracking-[0.14em] text-text-subtle">
                    {field.itemLabel} {index + 1}
                  </p>
                  <div className="flex gap-1">
                    <RowButton
                      label={`Move ${field.itemLabel} ${index + 1} up`}
                      disabled={index === 0}
                      onClick={() => onChange(path, swap(rows, index, index - 1))}
                    >
                      ↑
                    </RowButton>
                    <RowButton
                      label={`Move ${field.itemLabel} ${index + 1} down`}
                      disabled={index === rows.length - 1}
                      onClick={() => onChange(path, swap(rows, index, index + 1))}
                    >
                      ↓
                    </RowButton>
                    <RowButton
                      label={`Remove ${field.itemLabel} ${index + 1}`}
                      onClick={() => onChange(path, rows.filter((_, i) => i !== index))}
                    >
                      <Trash2 className="size-3.5" aria-hidden />
                    </RowButton>
                  </div>
                </div>

                <div className="mt-4 space-y-4">
                  {field.fields.map((child) => (
                    <FieldInput
                      key={child.name}
                      field={child}
                      value={row[child.name]}
                      path={`${path}.${index}.${child.name}`}
                      errors={errors}
                      onChange={onChange}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>

          <button
            type="button"
            disabled={atMax}
            onClick={() => onChange(path, [...rows, emptyContent(field.fields)])}
            className="mt-3 inline-flex items-center gap-2 rounded-lg border border-dashed border-border px-3.5 py-2 text-sm text-text-muted transition-colors hover:border-border-strong hover:text-text disabled:pointer-events-none disabled:opacity-50"
          >
            <Plus className="size-4" aria-hidden />
            Add {field.itemLabel}
          </button>

          {error && <p className="mt-1.5 text-sm text-danger">{error}</p>}
        </fieldset>
      );
    }
  }
}

function RowButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className="grid size-7 place-items-center rounded-md text-text-subtle transition-colors hover:bg-surface-3 hover:text-text disabled:pointer-events-none disabled:opacity-40"
    >
      {children}
    </button>
  );
}

function swap<T>(rows: T[], a: number, b: number): T[] {
  const next = [...rows];
  [next[a], next[b]] = [next[b], next[a]];
  return next;
}
