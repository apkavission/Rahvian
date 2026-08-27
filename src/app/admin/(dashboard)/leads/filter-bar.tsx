"use client";

import { useEffect, useId, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";
import { FIELD } from "@/components/ui/field";
import { LEAD_STATUSES } from "@/lib/validation/leads";
import type { StaffOption } from "@/lib/queries/leads";
import { cn } from "@/lib/utils";

/**
 * Search and filters, held in the URL.
 *
 * The query string is the state. That is not a stylistic choice: a filtered
 * list someone wants to keep looking at is a link they can bookmark, send to a
 * colleague, or reach again with the back button. State held in a component
 * survives none of that.
 *
 * Changing any control resets to page one. Staying on page four of a result
 * set that no longer has four pages is how a filter appears to return nothing.
 */
export function LeadFilterBar({
  staff,
  className,
}: {
  staff: StaffOption[];
  className?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const searchId = useId();

  const [term, setTerm] = useState(params.get("q") ?? "");

  // The URL is the source of truth, so a back button or a cleared filter has
  // to be reflected in the box rather than fought by it.
  const applied = params.get("q") ?? "";
  const lastApplied = useRef(applied);
  useEffect(() => {
    if (lastApplied.current !== applied) {
      lastApplied.current = applied;
      setTerm(applied);
    }
  }, [applied]);

  function push(changes: Record<string, string | null>) {
    const next = new URLSearchParams(params.toString());

    for (const [key, value] of Object.entries(changes)) {
      if (value === null || value === "") next.delete(key);
      else next.set(key, value);
    }

    next.delete("page");
    const query = next.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  }

  const status = params.get("status") ?? "";
  const assigned = params.get("assigned") ?? "";
  const hasFilters = Boolean(status || assigned || applied);

  return (
    <div className={cn("flex flex-wrap items-end gap-3", className)}>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          push({ q: term.trim() || null });
        }}
        className="min-w-0 flex-1 sm:max-w-xs"
        role="search"
      >
        <label htmlFor={searchId} className="sr-only">
          Search enquiries
        </label>
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-text-subtle"
            aria-hidden
          />
          <input
            id={searchId}
            type="search"
            value={term}
            onChange={(event) => setTerm(event.target.value)}
            placeholder="Name, company, email or phone"
            className={cn(FIELD, "pl-9")}
          />
        </div>
      </form>

      <div>
        <label className="sr-only" htmlFor={`${searchId}-status`}>
          Status
        </label>
        <select
          id={`${searchId}-status`}
          value={status}
          onChange={(event) => push({ status: event.target.value || null })}
          className={cn(FIELD, "w-auto")}
        >
          <option value="">Any status</option>
          {LEAD_STATUSES.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="sr-only" htmlFor={`${searchId}-assigned`}>
          Assignee
        </label>
        <select
          id={`${searchId}-assigned`}
          value={assigned}
          onChange={(event) => push({ assigned: event.target.value || null })}
          className={cn(FIELD, "w-auto")}
        >
          <option value="">Anyone</option>
          <option value="unassigned">Unassigned</option>
          {staff.map((person) => (
            <option key={person.id} value={person.id}>
              {person.name}
            </option>
          ))}
        </select>
      </div>

      {hasFilters && (
        <button
          type="button"
          onClick={() => push({ q: null, status: null, assigned: null })}
          className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2.5 text-sm text-text-muted transition-colors hover:bg-surface-2 hover:text-text"
        >
          <X className="size-4" aria-hidden />
          Clear
        </button>
      )}
    </div>
  );
}
