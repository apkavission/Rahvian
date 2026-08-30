"use client";

import { RecordForm } from "@/components/admin/record-form";
import { saveNavItem } from "@/lib/actions/navigation";
import { navFieldsets } from "@/lib/records/navigation";

/**
 * The middle column: one link, as a form.
 *
 * A thin wrapper over the shared record form, for the same reason the FAQ
 * editor is one: the fieldsets carry a regular expression — the rule for what
 * an address may look like — and a regular expression does not survive the
 * trip from a Server Component to a Client one.
 */
export function NavItemEditor({
  id,
  values,
  parents,
}: {
  id: string;
  values: Record<string, unknown>;
  /** The top-level links in this link's menu, minus itself. May be empty. */
  parents: { value: string; label: string }[];
}) {
  return (
    <RecordForm
      id={id}
      fieldsets={navFieldsets(parents)}
      values={values}
      action={saveNavItem}
      copy={{
        save: "Save link",
        busy: "Saving the link",
        saved: "Link saved",
      }}
    />
  );
}
