"use client";

import { RecordForm } from "@/components/admin/record-form";
import { saveMember } from "@/lib/actions/team";
import type { MediaOption } from "@/lib/media/image-fields";
import { teamFieldsets } from "@/lib/records/team";

/**
 * The middle column: one person, as a form.
 *
 * A thin wrapper over the shared record form, and a client component for one
 * specific reason - the field descriptors carry regular expressions for the
 * two profile addresses, which do not survive being serialised from a server
 * component.
 */
export function MemberEditor({
  id,
  values,
  assets,
}: {
  id: string;
  values: Record<string, unknown>;
  assets: MediaOption[];
}) {
  return (
    <RecordForm
      id={id}
      fieldsets={teamFieldsets(assets)}
      values={values}
      action={saveMember}
      copy={{
        save: "Save profile",
        busy: "Saving the profile",
        saved: "Profile saved",
      }}
    />
  );
}
