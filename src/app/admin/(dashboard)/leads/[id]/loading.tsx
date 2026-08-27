import { PanelScreenSkeleton } from "@/components/admin/screen-skeleton";

/** One enquiry's shape, while it arrives. */
export default function Loading() {
  return <PanelScreenSkeleton panels={3} />;
}
