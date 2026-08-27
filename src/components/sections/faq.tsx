import { FaqList } from "@/components/sections/faq-list";
import { Section, SectionHeading } from "@/components/sections/section";
import { getFaqs } from "@/lib/queries/faqs";

export interface FaqContent {
  eyebrow?: string;
  heading: string;
  description?: string;
  /** Which FAQ scope to render: "home", "pricing", "contact", or a service slug. */
  scope: string;
}

/**
 * FAQ section.
 *
 * The read lives in `lib/queries/faqs` rather than here, because a route that
 * emits the `FAQPage` document for these questions has to read exactly the
 * same list — a cached query shared by both is what keeps the structured data
 * and the visible page from ever disagreeing.
 *
 * The list is server-rendered so its content is in the HTML — an FAQ that only
 * exists after hydration cannot produce a rich result.
 */
export async function Faq({ content }: { content: FaqContent }) {
  const items = await getFaqs(content.scope);
  if (items.length === 0) return null;

  return (
    <Section>
      <div className="grid gap-12 lg:grid-cols-[minmax(0,24rem)_1fr] lg:gap-20">
        <SectionHeading
          eyebrow={content.eyebrow}
          title={content.heading}
          description={content.description}
          className="lg:sticky lg:top-28 lg:self-start"
        />
        <FaqList items={items} />
      </div>
    </Section>
  );
}
