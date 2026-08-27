"use client";

import { RecordForm } from "@/components/admin/record-form";
import { saveCaseStudy } from "@/lib/actions/case-studies";
import type { MediaOption } from "@/lib/media/image-fields";
import { caseStudyFieldsets, type PickerOption } from "@/lib/records/case-studies";

/**
 * The middle column: one case study, as a form.
 *
 * A thin wrapper over the shared record form, and it is a client component for
 * one specific reason - the field descriptors carry regular expressions, which
 * do not survive being serialised from a server component. Building them here
 * keeps the descriptors on one side of the boundary; the picker options, which
 * are rows and are serialisable, come across as data.
 */
export function StudyEditor({
  id,
  values,
  technologies,
  projects,
  testimonials,
  assets,
}: {
  id: string;
  values: Record<string, unknown>;
  technologies: PickerOption[];
  projects: PickerOption[];
  testimonials: PickerOption[];
  assets: MediaOption[];
}) {
  return (
    <RecordForm
      id={id}
      fieldsets={caseStudyFieldsets(technologies, projects, testimonials, assets)}
      values={values}
      action={saveCaseStudy}
      copy={{
        save: "Save case study",
        busy: "Saving the case study",
        saved: "Case study saved",
      }}
    />
  );
}
