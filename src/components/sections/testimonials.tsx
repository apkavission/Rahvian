import { Reveal } from "@/components/motion/reveal";
import { Section, SectionHeading } from "@/components/sections/section";
import type { BackgroundVariant } from "@/components/sections/section";
import { TestimonialCard } from "@/components/testimonials/testimonial-card";
import { getTestimonials } from "@/lib/queries/testimonials";
import { cn } from "@/lib/utils";

export interface TestimonialsContent {
  eyebrow?: string;
  heading: string;
  description?: string;
  limit?: number;
  background?: BackgroundVariant;
}

/**
 * What clients actually said.
 *
 * Read live from `testimonials`, which the admin manages and which refuses to
 * publish a quote until somebody has confirmed the person said it and agreed
 * to its use — a check constraint on the table, so this section cannot show a
 * quote nobody approved even if the form were bypassed.
 *
 * **Renders nothing while the table is empty**, like the team section and for
 * the same reason: a heading saying "What our clients say" over a blank grid
 * says less than no section at all, and filling it is an admin action rather
 * than a deploy.
 */
export async function Testimonials({ content }: { content: TestimonialsContent }) {
  const all = await getTestimonials();
  if (all.length === 0) return null;

  const shown = content.limit ? all.slice(0, content.limit) : all;

  return (
    <Section background={content.background ?? "muted"}>
      <SectionHeading
        eyebrow={content.eyebrow}
        title={content.heading}
        description={content.description}
      />

      <ul
        className={cn(
          "reveal-group mt-12 grid auto-rows-fr gap-4",
          // Two across rather than three: a quote is a paragraph, and three
          // columns of paragraph on a laptop gives a measure nobody reads.
          shown.length > 1 && "sm:grid-cols-2",
        )}
      >
        {shown.map((testimonial) => (
          <Reveal key={testimonial.id} as="li" className="h-full">
            <TestimonialCard testimonial={testimonial} />
          </Reveal>
        ))}
      </ul>
    </Section>
  );
}
