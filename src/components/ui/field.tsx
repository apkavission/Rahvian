"use client";

import { useId } from "react";
import { cn } from "@/lib/utils";

/**
 * Shared form primitives.
 *
 * The control classes are exported rather than wrapped in `<Input>` and
 * `<Select>` components on purpose: a wrapper has to re-declare every native
 * attribute it wants to pass through, and the ones it forgets are the ones an
 * accessible form needs — `inputMode`, `autoComplete`, `aria-invalid`. A class
 * name applied to a real `<input>` forgets nothing.
 */

export const FIELD = cn(
  "w-full rounded-md border border-border bg-surface",
  "px-3.5 py-2.5 text-sm text-text transition-colors",
  "placeholder:text-text-subtle",
  "focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20",
  "disabled:cursor-not-allowed disabled:opacity-60",
);

export const LABEL = "block text-sm font-medium text-text";

/**
 * Label, control and message as one unit.
 *
 * Takes the control as a render prop so the generated id and the
 * `aria-describedby` chain are wired up in one place. Doing that per field by
 * hand is where accessible forms usually go wrong: the label points at one id,
 * the error message is never referenced, and a screen reader announces a
 * field as invalid without saying why.
 */
export function Field({
  label,
  required,
  hint,
  error,
  className,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  error?: string;
  className?: string;
  children: (id: string, describedBy: string | undefined) => React.ReactNode;
}) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div className={cn("min-w-0", className)}>
      <label htmlFor={id} className={LABEL}>
        {label}
        {required ? (
          <span className="ml-0.5 text-accent" aria-hidden>
            *
          </span>
        ) : null}
      </label>

      <div className="mt-2">{children(id, describedBy)}</div>

      {hint ? (
        <p id={hintId} className="mt-1.5 text-xs text-text-subtle">
          {hint}
        </p>
      ) : null}

      {error ? (
        <p id={errorId} className="mt-1.5 text-sm text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
