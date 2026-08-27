import { BrandLoader } from "@/components/brand/brand-loader";

/**
 * The wait between routes.
 *
 * Next renders this the moment a navigation starts and keeps it until the
 * segment's data resolves, so it covers every `GET` the router makes —
 * including the ones a visitor triggers by reloading.
 *
 * At the root rather than per route: one wait screen for the whole
 * application, which is the point of having a branded one.
 */
export default function Loading() {
  return <BrandLoader overlay size="lg" />;
}
