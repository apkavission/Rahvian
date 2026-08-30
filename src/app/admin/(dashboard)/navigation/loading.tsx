import { ContentScreenSkeleton } from "@/components/admin/screen-skeleton";

/** The navigation screen's shape, while it arrives. */
export default function Loading() {
  return <ContentScreenSkeleton rows={8} groups={3} />;
}
