import type { ZodIssue } from "zod";

/**
 * What the letterhead's form actions give back.
 *
 * ---------------------------------------------------------------------------
 * **In its own file because of a rule, not for tidiness.** A module marked
 * `"use server"` may export nothing but async functions — every export becomes
 * an HTTP endpoint, and an object cannot be one. Declaring this shape and its
 * idle value beside the actions produces:
 *
 *     Failed to collect configuration for /admin/letterhead
 *
 * from `next build`, while `next dev`, `tsc --noEmit` and `eslint` all stay
 * silent. The demos' `lib/form-state.ts` carries the same note, having been
 * caught by the same thing — twice in this estate now, which is why this one
 * says so at the top rather than in a line comment.
 */
export interface LetterState {
  status: "idle" | "success" | "error";
  message?: string;
  /** Keyed by field name, so a message lands under the input it belongs to. */
  fieldErrors?: Record<string, string>;
}

export const idleLetterState: LetterState = { status: "idle" };

/**
 * Zod issues, flattened to one message per field.
 *
 * The first wins. Three sentences under one input is a way of saying nothing
 * three times — only the first gets read.
 */
export function letterFieldErrors(issues: ZodIssue[]): Record<string, string> {
  const errors: Record<string, string> = {};

  for (const issue of issues) {
    const key = issue.path.join(".") || "form";
    if (!errors[key]) errors[key] = issue.message;
  }

  return errors;
}
