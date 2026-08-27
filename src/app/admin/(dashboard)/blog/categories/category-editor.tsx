"use client";

import { RecordForm } from "@/components/admin/record-form";
import { saveCategory } from "@/lib/actions/blog";
import { categoryFieldsets } from "@/lib/records/blog";

/**
 * The middle column: one category, as a form.
 *
 * A client component because the field descriptors carry regular expressions,
 * which do not survive being serialised from a server component.
 */
export function CategoryEditor({
  id,
  values,
}: {
  id: string;
  values: Record<string, unknown>;
}) {
  return (
    <RecordForm
      id={id}
      fieldsets={categoryFieldsets()}
      values={values}
      action={saveCategory}
      copy={{ save: "Save category", busy: "Saving the category", saved: "Category saved" }}
    />
  );
}
