import { Reveal } from "@/components/motion/reveal";
import { Section, SectionHeading } from "@/components/sections/section";
import { getTechnologies } from "@/lib/queries/technologies";

export interface TechStackContent {
  eyebrow?: string;
  heading: string;
  description?: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  frontend: "Frontend",
  backend: "Backend",
  database: "Databases",
  mobile: "Mobile",
  ai: "AI",
  infrastructure: "Infrastructure",
  tooling: "Tooling",
  other: "Other",
};

const CATEGORY_ORDER = [
  "frontend",
  "backend",
  "database",
  "mobile",
  "ai",
  "infrastructure",
  "tooling",
  "other",
];


/**
 * The tools we build with, grouped by role.
 *
 * Grouped rather than presented as one undifferentiated logo wall: a prospect
 * evaluating us wants to know we have a coherent stack, not that we can name
 * twenty technologies.
 */
export async function TechStack({ content }: { content: TechStackContent }) {
  const technologies = await getTechnologies();
  if (technologies.length === 0) return null;

  const grouped = CATEGORY_ORDER.map((category) => ({
    category,
    label: CATEGORY_LABELS[category] ?? category,
    items: technologies.filter((t) => t.category === category),
  })).filter((group) => group.items.length > 0);

  return (
    <Section>
      <SectionHeading
        eyebrow={content.eyebrow}
        title={content.heading}
        description={content.description}
      />

      <div className="reveal-group mt-14 space-y-px">
        {grouped.map((group) => (
          <Reveal key={group.category}>
            <div className="grid gap-4 border-t border-border py-6 sm:grid-cols-[9rem_1fr] sm:gap-8">
              <h3 className="font-mono text-xs uppercase tracking-[0.16em] text-text-subtle">
                {group.label}
              </h3>
              <ul className="flex flex-wrap gap-2">
                {group.items.map((tech) => (
                  <li
                    key={tech.id}
                    className="rounded-lg border border-border bg-surface-2/60 px-3 py-1.5 text-sm text-text-muted transition-colors duration-[--duration-fast] hover:border-border-strong hover:text-text"
                  >
                    {tech.name}
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}
