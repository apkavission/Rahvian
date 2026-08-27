"use client";

import { RecordForm } from "@/components/admin/record-form";
import { saveMedia } from "@/lib/actions/media";
import { mediaFieldsets } from "@/lib/records/media";

/**
 * The middle column: one asset's details, as a form.
 *
 * A thin wrapper over the shared record form, and a client component because
 * the field descriptors carry a regular expression for the folder name, which
 * does not survive being serialised from a server component.
 *
 * Nothing here can change the bytes. A replacement is an upload, with its own
 * row and its own address, which is what lets the serving route cache a file
 * for a year without ever handing back a stale one.
 */
export function AssetEditor({
  id,
  values,
  darkVariants,
}: {
  id: string;
  values: Record<string, unknown>;
  darkVariants: { id: string; label: string }[];
}) {
  return (
    <RecordForm
      id={id}
      fieldsets={mediaFieldsets(darkVariants)}
      values={values}
      action={saveMedia}
      copy={{
        save: "Save details",
        busy: "Saving the details",
        saved: "Details saved",
      }}
    />
  );
}
