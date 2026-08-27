"use client";

import { RecordList } from "@/components/admin/record-list";
import { Icon } from "@/components/ui/icon";
import {
  deleteService,
  duplicateService,
  moveService,
} from "@/lib/actions/services";

export interface ServiceListItem {
  id: string;
  slug: string;
  name: string;
  icon: string | null;
  status: string;
}

/**
 * The left column: every service, in the order they appear on the site.
 *
 * The order here is the order visitors see — the navigation, the services index
 * and the home page grid all read the same `sort_order` — which is why
 * reordering belongs on the row rather than buried in the form.
 *
 * Everything mechanical is in the shared list; this file supplies the words and
 * says which Server Actions the buttons post to.
 */
export function ServiceList({
  services,
  selectedId,
}: {
  services: ServiceListItem[];
  selectedId: string | null;
}) {
  return (
    <RecordList
      basePath="/admin/services"
      queryKey="service"
      selectedId={selectedId}
      emptyLabel="No services yet. Create the first one below."
      items={services.map((service) => ({
        id: service.id,
        title: service.name,
        subtitle:
          service.status === "published"
            ? `/${service.slug}`
            : `/${service.slug} · ${service.status}`,
        dimmed: service.status !== "published",
        icon: <Icon name={service.icon} className="size-4" />,
      }))}
      actions={{
        move: moveService,
        duplicate: duplicateService,
        remove: deleteService,
      }}
      deleteCopy={(item) => ({
        title: `Delete ${item.title}?`,
        body: "The service, its page and everything written on it are removed and cannot be brought back. To take it off the site without losing the words, set its status to Archived instead.",
        confirmLabel: "Delete service",
      })}
    />
  );
}
