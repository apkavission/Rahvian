import { ContentScreenSkeleton } from "@/components/admin/screen-skeleton";

/** The media screen's shape, while it arrives. */
export default function Loading() {
  return <ContentScreenSkeleton rows={6} groups={3} />;
}
