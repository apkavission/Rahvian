import { ContentScreenSkeleton } from "@/components/admin/screen-skeleton";

/** The blog screen's shape, while it arrives. */
export default function Loading() {
  return <ContentScreenSkeleton rows={5} groups={6} />;
}
