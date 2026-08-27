"use client";

import { RecordForm } from "@/components/admin/record-form";
import { saveFaq } from "@/lib/actions/faqs";
import { faqFieldsets } from "@/lib/records/faqs";

/**
 * The middle column: one question, as a form.
 *
 * A thin wrapper over the shared record form. A client component because the
 * fieldsets are built here rather than passed across the server boundary —
 * the vocabulary they are written in carries regular expressions elsewhere,
 * and one rule for where descriptors are built is easier to keep than a rule
 * with an exception for the screens that happen not to use a pattern.
 */
export function FaqEditor({
  id,
  values,
  scopes,
}: {
  id: string;
  values: Record<string, unknown>;
  scopes: { value: string; label: string }[];
}) {
  return (
    <RecordForm
      id={id}
      fieldsets={faqFieldsets(scopes)}
      values={values}
      action={saveFaq}
      copy={{
        save: "Save question",
        busy: "Saving the question",
        saved: "Question saved",
      }}
    />
  );
}
