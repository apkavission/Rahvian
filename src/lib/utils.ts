import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merge class names, resolving Tailwind conflicts so the last one wins.
 * Use this anywhere a component accepts a `className` prop.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * A date as a reader in India would write it.
 *
 * The timezone is pinned rather than left to the runtime: these strings are
 * baked into prerendered HTML on a build machine that is almost certainly on
 * UTC, and an unpinned formatter would print the previous day for anything
 * published after half past five in the evening.
 */
export function formatDate(value: string | null | undefined): string | null {
  if (!value) return null;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  }).format(date);
}

/**
 * A title, as an address.
 *
 * The same shape the database check constraint accepts on every sluggable
 * table, so a suggested slug is never one the save then refuses. Shared rather
 * than written per form: two slugifiers eventually disagree, and the one that
 * is wrong is whichever was not looked at.
 */
export function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
