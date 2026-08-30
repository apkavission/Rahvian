"use client";

import { RecordList } from "@/components/admin/record-list";
import {
  deleteTestimonial,
  duplicateTestimonial,
  moveTestimonial,
} from "@/lib/actions/testimonials";

export interface TestimonialListItem {
  id: string;
  author_name: string;
  company_name: string | null;
  status: string;
  consent_confirmed: boolean;
}

/**
 * The left column: every quote, in the order they are shown.
 *
 * The subtitle carries the company, because that is what distinguishes two
 * quotes at a glance — and where consent is missing it says so instead. That is
 * the one fact about a quote that decides whether it can go live, so it belongs
 * where the list is read rather than three fieldsets into the form.
 */
export function TestimonialList({
  quotes,
  selectedId,
}: {
  quotes: TestimonialListItem[];
  selectedId: string | null;
}) {
  return (
    <RecordList
      basePath="/admin/testimonials"
      queryKey="quote"
      selectedId={selectedId}
      emptyLabel="No quotes recorded yet. Add the first one below."
      items={quotes.map((quote) => ({
        id: quote.id,
        title: quote.author_name,
        subtitle: subtitleFor(quote),
        dimmed: quote.status !== "published",
      }))}
      actions={{
        move: moveTestimonial,
        duplicate: duplicateTestimonial,
        remove: deleteTestimonial,
      }}
      deleteCopy={(item) => ({
        title: `Delete the quote from ${item.title}?`,
        body: "The quote and the record of their consent are removed and cannot be brought back. If it is attached to a case study, that case study keeps its page and simply stops showing a quote. To take it off the site and keep it, set the status to Archived instead.",
        confirmLabel: "Delete quote",
      })}
    />
  );
}

function subtitleFor(quote: TestimonialListItem): string {
  if (!quote.consent_confirmed) return "no consent recorded";

  const where = quote.company_name ?? "";

  if (quote.status === "published") return where || "published";
  return where ? `${where} · ${quote.status}` : quote.status;
}
