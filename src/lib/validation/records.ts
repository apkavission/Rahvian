import { z } from "zod";

/**
 * What every admin content screen shares.
 *
 * Services, portfolio, case studies, blog, pricing, FAQs and team are the same
 * screen seven times over — a list, a form built from descriptors, a preview —
 * so the pieces that would otherwise be written seven times live here. The
 * alternative is seven action-state types that are identical until one of them
 * quietly is not, and a toast that reads differently on one screen.
 */

export interface RecordActionState {
  status: "idle" | "success" | "error";
  message: string;
  /** Keyed by the dotted path Zod reported the problem at. */
  fieldErrors?: Record<string, string>;
}

export const initialRecordState: RecordActionState = {
  status: "idle",
  message: "",
};

/**
 * The slug rule, in one place.
 *
 * It is the same expression the database enforces with a check constraint on
 * every sluggable table. Stated here as well so a bad slug comes back as a
 * sentence beside the field rather than as a constraint violation nobody can
 * read — and stated *identically*, because a form that accepts what the
 * database refuses is worse than one that refuses too much.
 */
export const SLUG_PATTERN = {
  re: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
  message:
    "Lowercase letters, numbers and single hyphens only — and one segment, no slashes.",
} as const;

/**
 * The first problem reported against each field.
 *
 * First rather than all of them: two messages under one input is one message
 * too many, and Zod reports the more specific rule first.
 */
export function fieldErrors(issues: { path: PropertyKey[]; message: string }[]) {
  const errors: Record<string, string> = {};
  for (const issue of issues) {
    const key = issue.path.join(".");
    if (key && !errors[key]) errors[key] = issue.message;
  }
  return errors;
}

/** The three states every piece of content can be in. */
export const CONTENT_STATUS_OPTIONS = [
  { value: "draft", label: "Draft" },
  { value: "published", label: "Published" },
  { value: "archived", label: "Archived" },
] as const;

/** A record identified by its id, and nothing else. Used by row actions. */
export const recordIdSchema = z.object({ id: z.uuid() });

export const moveRecordSchema = recordIdSchema.extend({
  direction: z.enum(["up", "down"]),
});

/**
 * A whole record's values, submitted as one JSON field.
 *
 * The same decision the section editor made and for the same reason: the shape
 * nests, and encoding nesting into `FormData` names means writing a parser for
 * it on the way back out. The JSON is parsed against the schema built from the
 * record's own descriptors, so nothing about it is trusted.
 */
export const saveRecordSchema = recordIdSchema.extend({
  values: z.string(),
});
