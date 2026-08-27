"use client";

import { RecordForm } from "@/components/admin/record-form";
import { saveProject } from "@/lib/actions/projects";
import type { MediaOption } from "@/lib/media/image-fields";
import { projectFieldsets } from "@/lib/records/projects";

/**
 * The middle column: one portfolio item, as a form.
 *
 * A thin wrapper over the shared record form, and it is a client component for
 * one specific reason — the field descriptors carry regular expressions, which
 * do not survive being serialised from a server component. Building them here
 * keeps the descriptors on one side of the boundary; the technologies and
 * services, which are rows and are serialisable, come across as data.
 */
export function ProjectEditor({
  id,
  values,
  technologies,
  services,
  assets,
}: {
  id: string;
  values: Record<string, unknown>;
  technologies: { id: string; name: string }[];
  services: { id: string; name: string }[];
  assets: MediaOption[];
}) {
  return (
    <RecordForm
      id={id}
      fieldsets={projectFieldsets(technologies, services, assets)}
      values={values}
      action={saveProject}
      copy={{
        save: "Save item",
        busy: "Saving the portfolio item",
        saved: "Portfolio item saved",
      }}
    />
  );
}
