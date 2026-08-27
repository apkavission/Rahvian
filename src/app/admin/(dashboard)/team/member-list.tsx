"use client";

import { RecordList } from "@/components/admin/record-list";
import { deleteMember, duplicateMember, moveMember } from "@/lib/actions/team";

export interface MemberListItem {
  id: string;
  name: string;
  role: string;
  status: string;
}

/**
 * The left column: everyone, in the order they appear on the About page.
 *
 * The subtitle carries the role, because that is what distinguishes two people
 * at a glance and it is the field most likely to be out of date.
 */
export function MemberList({
  members,
  selectedId,
}: {
  members: MemberListItem[];
  selectedId: string | null;
}) {
  return (
    <RecordList
      basePath="/admin/team"
      queryKey="member"
      selectedId={selectedId}
      emptyLabel="Nobody listed yet. Add the first person below."
      items={members.map((member) => ({
        id: member.id,
        title: member.name,
        subtitle:
          member.status === "published" ? member.role : `${member.role} · ${member.status}`,
        dimmed: member.status !== "published",
      }))}
      actions={{
        move: moveMember,
        duplicate: duplicateMember,
        remove: deleteMember,
      }}
      deleteCopy={(item) => ({
        title: `Remove ${item.title}?`,
        body: "The profile and everything written in it are removed and cannot be brought back. If they have simply left, set the status to Archived instead — that takes the card off the site and keeps the write-up.",
        confirmLabel: "Delete profile",
      })}
    />
  );
}
