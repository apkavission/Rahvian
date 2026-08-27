import { BrandLoader } from "@/components/brand/brand-loader";

/**
 * The public site's own wait screen.
 *
 * Present as well as the root one because a route group boundary is where
 * Next looks first, and because the admin and the portal will want their own
 * treatment inside their own shells later. Same component, same gesture.
 */
export default function SiteLoading() {
  return <BrandLoader overlay size="lg" />;
}
