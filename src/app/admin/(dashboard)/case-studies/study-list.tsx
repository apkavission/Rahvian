"use client";

import { RecordList } from "@/components/admin/record-list";
import {
  deleteCaseStudy,
  duplicateCaseStudy,
} from "@/lib/actions/case-studies";

export interface StudyListItem {
  id: string;
  slug: string;
  title: string;
  client_name: string | null;
  industry: string | null;
  status: string;
}

/**
 * The left column: every case study, newest publication first.
 *
 * No reorder arrows. `case_studies` has no position column — the index is
 * ordered by publication date — and arrows that appear to do nothing are worse
 * than no arrows.
 *
 * The subtitle carries the client or the industry rather than the address,
 * because that is what distinguishes two write-ups at a glance.
 */
export function StudyList({
  studies,
  selectedId,
}: {
  studies: StudyListItem[];
  selectedId: string | null;
}) {
  return (
    <RecordList
      basePath="/admin/case-studies"
      queryKey="study"
      selectedId={selectedId}
      emptyLabel="No case studies yet. Write the first one below."
      items={studies.map((study) => {
        const who = study.client_name ?? study.industry ?? study.slug;

        return {
          id: study.id,
          title: study.title,
          subtitle: study.status === "published" ? who : `${who} · ${study.status}`,
          dimmed: study.status !== "published",
        };
      })}
      actions={{
        duplicate: duplicateCaseStudy,
        remove: deleteCaseStudy,
      }}
      deleteCopy={(item) => ({
        title: `Delete ${item.title}?`,
        body: "The case study and everything written in it are removed and cannot be brought back. To take it off the site without losing the words, set its status to Archived instead.",
        confirmLabel: "Delete case study",
      })}
    />
  );
}
