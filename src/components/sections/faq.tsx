import { FaqList } from "@/components/sections/faq-list";
import { Section, SectionHeading } from "@/components/sections/section";
import { JsonLd } from "@/components/seo/json-ld";
import { getFaqs } from "@/lib/queries/faqs";
import { buildFaqSchema } from "@/lib/structured-data";

export interface FaqContent {
  eyebrow?: string;
  heading: string;
  description?: string;
  /** Which FAQ scope to render: "home", "pricing", "contact", or a service slug. */
  scope: string;
}

/**
 * FAQ section, and the `FAQPage` document for it.
 *
 * **The structured data is emitted here rather than by each route**, and that
 * moved on 2026-08-28. It was on `/pricing` alone: the page read its own
 * sections, found the FAQ one, pulled its scope out and built the graph. Which
 * worked, and meant every other page carrying an FAQ — the home page, contact,
 * anywhere the owner adds one tomorrow — quietly had none, because emitting it
 * was something a developer had to remember per route.
 *
 * Here it cannot be forgotten. The section that renders the questions is the
 * section that declares them, from the same `items` array, in the same render.
 * The two cannot disagree about which questions the page shows, which is the
 * failure that gets a rich result penalised: claiming answers the page does
 * not display.
 *
 * It also follows the content. A section the owner removes from a page takes
 * its structured data with it, and one they add brings it along — with nobody
 * editing a route.
 *
 * The list is server-rendered so its content is in the HTML: an FAQ that only
 * exists after hydration cannot produce a rich result at all.
 *
 * Nothing is emitted when there are no questions — the component returns null
 * before this point — so an empty scope leaves no empty graph behind.
 */
export async function Faq({ content }: { content: FaqContent }) {
  const items = await getFaqs(content.scope);
  if (items.length === 0) return null;

  return (
    <Section>
      <JsonLd data={buildFaqSchema(items)} />
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
