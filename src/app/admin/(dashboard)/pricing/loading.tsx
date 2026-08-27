import { ContentScreenSkeleton } from "@/components/admin/screen-skeleton";

/** The pricing screen's shape, while it arrives. */
export default function Loading() {
  return <ContentScreenSkeleton rows={4} groups={4} />;
}
