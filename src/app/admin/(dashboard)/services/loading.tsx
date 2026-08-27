import { ContentScreenSkeleton } from "@/components/admin/screen-skeleton";

/** The services screen's shape, while it arrives. */
export default function Loading() {
  return <ContentScreenSkeleton rows={7} groups={6} />;
}
