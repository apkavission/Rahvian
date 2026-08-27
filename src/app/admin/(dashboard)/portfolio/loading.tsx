import { ContentScreenSkeleton } from "@/components/admin/screen-skeleton";

/** The portfolio screen's shape, while it arrives. */
export default function Loading() {
  return <ContentScreenSkeleton rows={5} groups={5} />;
}
