"use client";

import { Star } from "lucide-react";
import { RecordList } from "@/components/admin/record-list";
import {
  deleteProject,
  duplicateProject,
  moveProject,
} from "@/lib/actions/projects";

export interface ProjectListItem {
  id: string;
  slug: string;
  title: string;
  type: string;
  status: string;
  is_featured: boolean;
}

/** The short label for a kind of work — the long one is for the form's select. */
const SHORT_TYPE_LABEL: Record<string, string> = {
  client: "Client",
  demo: "Demo",
  inhouse: "Our product",
  previous: "Earlier",
};

/**
 * The left column: every portfolio item, in the admin's order.
 *
 * The subtitle carries the kind of work rather than the address, because that
 * is the thing about a portfolio row that matters at a glance — it is the field
 * three database constraints hang off, and mixing a demo up with client work is
 * the one mistake this site is built to make impossible.
 *
 * A featured item is starred. Featured work leads the public grid ahead of this
 * order, so without the star the list would appear not to match the site.
 */
export function ProjectList({
  projects,
  selectedId,
}: {
  projects: ProjectListItem[];
  selectedId: string | null;
}) {
  return (
    <RecordList
      basePath="/admin/portfolio"
      queryKey="project"
      selectedId={selectedId}
      emptyLabel="Nothing in the portfolio yet. Add the first item below."
      items={projects.map((project) => ({
        id: project.id,
        title: project.title,
        subtitle:
          project.status === "published"
            ? (SHORT_TYPE_LABEL[project.type] ?? project.type)
            : `${SHORT_TYPE_LABEL[project.type] ?? project.type} · ${project.status}`,
        dimmed: project.status !== "published",
        icon: project.is_featured ? (
          <Star className="size-4 fill-accent text-accent" aria-label="Featured" />
        ) : undefined,
      }))}
      actions={{
        move: moveProject,
        duplicate: duplicateProject,
        remove: deleteProject,
      }}
      deleteCopy={(item) => ({
        title: `Delete ${item.title}?`,
        body: "The item, its page and the whole write-up are removed and cannot be brought back. To take it off the site without losing the words, set its status to Archived instead.",
        confirmLabel: "Delete item",
      })}
    />
  );
}
