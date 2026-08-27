import { PanelScreenSkeleton } from "@/components/admin/screen-skeleton";

/** The page builder's shape, while it arrives. */
export default function Loading() {
  return <PanelScreenSkeleton panels={4} />;
}
