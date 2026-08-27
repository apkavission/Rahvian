import { PanelScreenSkeleton } from "@/components/admin/screen-skeleton";

/** The dashboard's shape, while its counters arrive. */
export default function Loading() {
  return <PanelScreenSkeleton panels={4} />;
}
