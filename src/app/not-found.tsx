import Link from "next/link";
import type { Metadata } from "next";
import { BrandLoader } from "@/components/brand/brand-loader";
import { ButtonLink } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Page not found",
  robots: { index: false, follow: true },
};

/**
 * 404.
 *
 * The same overlay the loader uses, carrying a message instead of a wait.
 * There is one loader in this application and this is it — a second treatment
 * for "the page is missing" would mean a visitor sees two different versions
 * of the brand within one click of each other.
 *
 * `follow` stays on while `index` is off: the page should never be indexed,
 * but the links out of it are the whole point of it existing.
 */
export default function NotFound() {
  return (
    <BrandLoader overlay size="lg" label="Page not found" showLabel>
      <div className="text-center">
        <h1 className="font-display text-3xl font-semibold sm:text-4xl">
          We cannot find that page
        </h1>
        <p className="measure mx-auto mt-4 leading-relaxed text-text-muted">
          The link may be out of date, or the page may have moved. Nothing is
          broken on your side.
        </p>

        <div className="mt-9 flex flex-wrap justify-center gap-3">
          <ButtonLink href="/" size="lg">
            Back to the home page
          </ButtonLink>
          <ButtonLink href="/services" size="lg" variant="secondary">
            See what we do
          </ButtonLink>
        </div>

        <p className="mt-8 text-sm text-text-subtle">
          Looking for something specific?{" "}
          <Link
            href="/contact"
            className="text-accent transition-colors hover:text-accent-hover"
          >
            Ask us
          </Link>
          .
        </p>
      </div>
    </BrandLoader>
  );
}
