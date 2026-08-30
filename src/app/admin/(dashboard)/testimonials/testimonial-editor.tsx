"use client";

import { RecordForm } from "@/components/admin/record-form";
import { saveTestimonial } from "@/lib/actions/testimonials";
import type { MediaOption } from "@/lib/media/image-fields";
import { testimonialFieldsets, type ProjectOption } from "@/lib/records/testimonials";

/**
 * The right column: one quote, as a form.
 *
 * A thin wrapper over the shared record form. It is a client component because
 * the field descriptors are built here rather than passed in — the same reason
 * the team editor is one.
 */
export function TestimonialEditor({
  id,
  values,
  assets,
  projects,
}: {
  id: string;
  values: Record<string, unknown>;
  assets: MediaOption[];
  projects: ProjectOption[];
}) {
  return (
    <RecordForm
      id={id}
      fieldsets={testimonialFieldsets(assets, projects)}
      values={values}
      action={saveTestimonial}
      copy={{
        save: "Save quote",
        busy: "Saving the quote",
        saved: "Quote saved",
      }}
    />
  );
}
