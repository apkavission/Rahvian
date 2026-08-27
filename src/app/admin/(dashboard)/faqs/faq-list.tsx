"use client";

import { RecordList } from "@/components/admin/record-list";
import { deleteFaq, duplicateFaq, moveFaq } from "@/lib/actions/faqs";

export interface FaqListItem {
  id: string;
  question: string;
  scope: string[];
  is_active: boolean;
}

/**
 * The left column: the questions on one page, in the order they are asked.
 *
 * The scope is bound into the move action rather than posted with the form, so
 * the arrows swap a question with the one visibly above or below it. Without
 * that binding they would swap against the whole table — where the next row is
 * usually a question from a different page, so the arrows would appear to do
 * nothing on both.
 *
 * The subtitle carries the other pages the question also appears on, because
 * that is the fact most likely to be forgotten: editing an answer here changes
 * it everywhere, and the row should say so before it is clicked.
 */
export function FaqList({
  faqs,
  scope,
  scopeLabels,
  selectedId,
}: {
  faqs: FaqListItem[];
  /** The page the list is filtered to, or "" for every question. */
  scope: string;
  scopeLabels: Record<string, string>;
  selectedId: string | null;
}) {
  return (
    <RecordList
      basePath="/admin/faqs"
      queryKey="faq"
      selectedId={selectedId}
      emptyLabel={
        scope
          ? "No questions on this page yet. Add the first one below."
          : "No questions yet. Add the first one below."
      }
      items={faqs.map((faq) => {
        const elsewhere = faq.scope
          .filter((entry) => entry !== scope)
          .map((entry) => scopeLabels[entry] ?? entry);

        const where = scope
          ? elsewhere.length > 0
            ? `also on ${elsewhere.join(", ")}`
            : "this page only"
          : faq.scope.length > 0
            ? faq.scope.map((entry) => scopeLabels[entry] ?? entry).join(", ")
            : "no page";

        return {
          id: faq.id,
          title: faq.question,
          subtitle: faq.is_active ? where : `hidden · ${where}`,
          dimmed: !faq.is_active,
        };
      })}
      actions={{
        // Bound to the filter, so the swap happens against what is on screen.
        move: moveFaq.bind(null, scope),
        duplicate: duplicateFaq,
        remove: deleteFaq,
      }}
      deleteCopy={(item) => ({
        title: "Delete this question?",
        body: `“${item.title}” and its answer are removed from every page that carries them, and cannot be brought back. To take it down without losing the answer, untick “show this question on the site” instead.`,
        confirmLabel: "Delete question",
      })}
    />
  );
}
