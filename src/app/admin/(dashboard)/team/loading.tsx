import { ContentScreenSkeleton } from "@/components/admin/screen-skeleton";

/** The team screen's shape, while it arrives. */
export default function Loading() {
  return <ContentScreenSkeleton rows={3} groups={4} />;
}
