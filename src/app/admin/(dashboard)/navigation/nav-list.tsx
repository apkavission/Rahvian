"use client";

import { CornerDownRight, Link2 } from "lucide-react";
import { RecordList } from "@/components/admin/record-list";
import { deleteNavItem, duplicateNavItem, moveNavItem } from "@/lib/actions/navigation";

export interface NavListItem {
  id: string;
  label: string;
  href: string;
  isActive: boolean;
  /** 0 for a top-level link, 1 for one inside a dropdown. */
  depth: 0 | 1;
  /** The parent's id, or "" at the top level. What the arrows move it among. */
  group: string;
  /** How many links are nested under this one. */
  childCount: number;
}

/**
 * The left column: one menu, in the order it is read.
 *
 * The shared list, with the two things a tree needs and a flat list does not —
 * an indent, and arrows that stop at the ends of a dropdown rather than at the
 * ends of the screen. Both are carried on the items rather than built here, so
 * this file is still only words and which actions the buttons post to.
 *
 * The subtitle carries the address, because a menu link is nothing but its
 * address: two rows reading "Services" that point at different pages is the
 * mistake this screen exists to make visible.
 */
export function NavList({
  items,
  selectedId,
  emptyLabel,
}: {
  items: NavListItem[];
  selectedId: string | null;
  emptyLabel: string;
}) {
  // The delete confirmation has to count what the cascade would take with it,
  // and the shared list hands the callback its own item rather than ours.
  const children = new Map(items.map((item) => [item.id, item.childCount]));

  return (
    <RecordList
      basePath="/admin/navigation"
      queryKey="item"
      selectedId={selectedId}
      emptyLabel={emptyLabel}
      items={items.map((item) => ({
        id: item.id,
        title: item.label,
        subtitle: [
          item.href,
          item.isActive ? null : "hidden",
          item.childCount > 0 ? `${item.childCount} in dropdown` : null,
        ]
          .filter(Boolean)
          .join(" · "),
        dimmed: !item.isActive,
        depth: item.depth,
        group: item.group,
        icon:
          item.depth === 1 ? (
            <CornerDownRight className="size-4" />
          ) : (
            <Link2 className="size-4" />
          ),
      }))}
      actions={{
        move: moveNavItem,
        duplicate: duplicateNavItem,
        remove: deleteNavItem,
      }}
      deleteCopy={(item) => {
        const nested = children.get(item.id) ?? 0;

        return {
          title: nested > 0 ? `Delete ${item.title} and its dropdown?` : `Delete ${item.title}?`,
          body:
            nested > 0
              ? `“${item.title}” and the ${nested} links nested under it are all removed, and none of them can be brought back. To take the whole dropdown out of the menu without losing it, untick “show this link on the site” instead.`
              : `“${item.title}” is removed from the menu and cannot be brought back. To take it down without losing it, untick “show this link on the site” instead.`,
          confirmLabel: nested > 0 ? "Delete all of them" : "Delete link",
        };
      }}
    />
  );
}
