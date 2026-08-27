import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { Reveal } from "@/components/motion/reveal";
import { Section, SectionHeading } from "@/components/sections/section";
import { ButtonLink } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import type { Technology } from "@/lib/queries/technologies";

/**
 * A service page, from a service row.
 *
 * Lifted out of the public route so the admin's preview renders the same
 * component rather than a second version of it. A preview that only
 * approximates the page is worse than no preview, because it is trusted — and
 * the two would drift the first time a heading changed on one side only.
 *
 * It takes plain values rather than fetching: the public route reads through
 * the cache anonymously, the preview reads uncached as the signed-in user so it
 * can show a draft, and neither decision belongs in a component that renders.
 *
 * Structured data stays with the routes. A preview inside an iframe emitting
 * `Service` JSON-LD would be describing a page that is not the one being
 * described.
 */
export interface ServiceDetailData {
  slug: string;
  name: string;
  short_name: string | null;
  icon: string | null;
  summary: string;
  hero_heading: string | null;
  hero_subheading: string | null;
  included_items: unknown;
  audience: unknown;
  approach: unknown;
  price_from: number | null;
  price_note: string | null;
  is_custom_quote: boolean;
}

export function ServiceDetail({
  service,
  technologies,
  others,
}: {
  service: ServiceDetailData;
  technologies: Technology[];
  others: { id: string; slug: string; name: string; summary: string }[];
}) {
  const included = stringList(service.included_items);
  const audience = stringList(service.audience);
  const approach = stringList(service.approach);

  return (
    <>
      <Section className="pt-14 md:pt-20">
        <Reveal className="max-w-3xl">
          <nav aria-label="Breadcrumb" className="font-mono text-xs uppercase tracking-[0.16em]">
            <Link href="/services" className="text-text-subtle transition-colors hover:text-accent">
              Services
            </Link>
            <span className="mx-2 text-text-subtle" aria-hidden>
              /
            </span>
            <span className="text-accent">{service.short_name ?? service.name}</span>
          </nav>

          <div className="mt-8 flex items-start gap-4">
            <span className="grid size-12 shrink-0 place-items-center rounded-xl border border-border bg-surface-2/60 text-accent">
              <Icon name={service.icon} className="size-6" />
            </span>
            <h1 className="font-display text-3xl font-semibold leading-[1.12] sm:text-4xl lg:text-5xl">
              {service.hero_heading ?? service.name}
            </h1>
          </div>

          <p className="mt-6 text-lg leading-relaxed text-text-muted">
            {service.hero_subheading ?? service.summary}
          </p>

          <div className="mt-9 flex flex-wrap items-center gap-4">
            <ButtonLink href="/request-a-quote" size="lg">
              Start Your Project
              <ArrowRight className="size-4" aria-hidden />
            </ButtonLink>
            <PriceNote service={service} />
          </div>
        </Reveal>
      </Section>

      {included.length > 0 && (
        <Section background="muted">
          <SectionHeading
            eyebrow="What's included"
            title="What this covers"
            description="Everything listed here is in scope. Anything not listed is quoted separately rather than assumed."
          />
          <ul className="reveal-group mt-12 grid gap-x-10 gap-y-4 sm:grid-cols-2">
            {included.map((item) => (
              <Reveal
                key={item}
                as="li"
                className="flex gap-3 border-b border-border pb-4 text-sm leading-relaxed"
              >
                <Check className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden />
                <span>{item}</span>
              </Reveal>
            ))}
          </ul>
        </Section>
      )}

      {(audience.length > 0 || approach.length > 0) && (
        <Section>
          <div className="grid gap-14 lg:grid-cols-2 lg:gap-20">
            {audience.length > 0 && (
              <ListBlock
                eyebrow="Who it's for"
                title="This is the right fit if"
                items={audience}
              />
            )}
            {approach.length > 0 && (
              <ListBlock
                eyebrow="How we deliver"
                title="What we do differently"
                items={approach}
              />
            )}
          </div>
        </Section>
      )}

      {technologies.length > 0 && (
        <Section background="muted">
          <SectionHeading
            eyebrow="Built with"
            title="The stack behind this service"
            description="Chosen because they suit the work, and because they are still supportable in five years."
          />
          <ul className="mt-10 flex flex-wrap gap-2">
            {technologies.map((tech) => (
              <li
                key={tech.id}
                className="rounded-lg border border-border bg-surface px-3 py-1.5 text-sm text-text-muted"
              >
                {tech.name}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {others.length > 0 && (
        <Section>
          <SectionHeading
            eyebrow="Other services"
            title="Most projects need more than one"
            description="These are the six that most often sit alongside this one."
          />
          <div className="reveal-group mt-12 grid auto-rows-fr gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {others.map((other) => (
              <Reveal key={other.id} className="h-full">
                <Link
                  href={`/services/${other.slug}`}
                  className="surface-raised group flex h-full flex-col rounded-2xl border border-border p-6 transition-[transform,border-color] duration-[--duration-base] ease-[--ease-out] hover:-translate-y-1 hover:border-border-strong"
                >
                  <h3 className="font-display text-base font-semibold leading-snug">
                    {other.name}
                  </h3>
                  <p className="mt-2.5 flex-1 text-sm leading-relaxed text-text-muted">
                    {other.summary}
                  </p>
                </Link>
              </Reveal>
            ))}
          </div>
        </Section>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------

function ListBlock({
  eyebrow,
  title,
  items,
}: {
  eyebrow: string;
  title: string;
  items: string[];
}) {
  return (
    <div>
      <SectionHeading eyebrow={eyebrow} title={title} className="max-w-none" />
      <ul className="mt-8 space-y-4">
        {items.map((item) => (
          <li key={item} className="flex gap-3 text-sm leading-relaxed text-text-muted">
            <span className="mt-2 size-1.5 shrink-0 rounded-full bg-accent" aria-hidden />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function PriceNote({
  service,
}: {
  service: { is_custom_quote: boolean; price_from: number | null; price_note: string | null };
}) {
  if (service.is_custom_quote) {
    return <p className="text-sm text-text-muted">Priced per project after scoping.</p>;
  }
  if (service.price_from === null) return null;

  return (
    <p className="text-sm text-text-muted">
      <span className="font-mono text-text">
        From ₹{Number(service.price_from).toLocaleString("en-IN")}
      </span>
      {service.price_note && <span className="block text-text-subtle">{service.price_note}</span>}
    </p>
  );
}

/**
 * JSONB columns are `Json`, which is legitimately anything. These three are
 * written as arrays of strings; anything else is dropped rather than rendered,
 * so a malformed edit degrades to a missing block instead of a crashed page.
 */
function stringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item.trim() !== "");
}
