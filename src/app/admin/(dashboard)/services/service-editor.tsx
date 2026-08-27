"use client";

import { RecordForm } from "@/components/admin/record-form";
import { saveService } from "@/lib/actions/services";
import type { MediaOption } from "@/lib/media/image-fields";
import { serviceFieldsets } from "@/lib/records/services";

/**
 * The middle column: one service, as a form.
 *
 * A thin wrapper over the shared record form, and it is a client component for
 * one specific reason — the field descriptors carry regular expressions, which
 * do not survive being serialised from a server component. Building them here
 * keeps the descriptors on one side of the boundary; the technologies, which
 * are rows and are serialisable, come across as data.
 */
export function ServiceEditor({
  id,
  values,
  technologies,
  assets,
}: {
  id: string;
  values: Record<string, unknown>;
  technologies: { id: string; name: string }[];
  assets: MediaOption[];
}) {
  return (
    <RecordForm
      id={id}
      fieldsets={serviceFieldsets(technologies, assets)}
      values={values}
      action={saveService}
      copy={{
        save: "Save service",
        busy: "Saving the service",
        saved: "Service saved",
      }}
    />
  );
}
