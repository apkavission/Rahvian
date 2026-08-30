import { PanelScreenSkeleton } from "@/components/admin/screen-skeleton";

/**
 * Your account, while it arrives.
 *
 * The last admin screen without one, added 2026-08-28 so that the loader and
 * the skeleton reach every route — `docs/loading-rules.md`, "One loader. This
 * one. Everywhere."
 *
 * It is safe here in a way it would not be one level up. This screen calls
 * `requireStaff()`, which redirects; every screen in the menu calls
 * `requireMenu()`, which calls `notFound()` — and a Suspense boundary above a
 * `notFound()` flushes the response before the status can be set. A boundary
 * on the group would turn every refused screen's 404 into a 200. Per screen is
 * the only place it belongs.
 */
export default function Loading() {
  return <PanelScreenSkeleton panels={2} />;
}
