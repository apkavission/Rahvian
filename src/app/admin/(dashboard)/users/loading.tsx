import { ContentScreenSkeleton } from "@/components/admin/screen-skeleton";

/** The users screen's shape, while it arrives. */
export default function Loading() {
  return <ContentScreenSkeleton rows={4} groups={3} />;
}
