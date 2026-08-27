import { unstable_cache } from "next/cache";
import { Reveal } from "@/components/motion/reveal";
import { Section, SectionHeading } from "@/components/sections/section";
import { CACHE_TAGS } from "@/lib/cache/tags";
import { createCachedClient } from "@/lib/supabase/server";

export interface ProcessStepsContent {
  eyebrow?: string;
  heading: string;
  description?: string;
}

const getProcessSteps = unstable_cache(
  async () => {
    const supabase = createCachedClient();
    const { data, error } = await supabase
      .from("process_steps")
      .select("id, step_number, title, description, duration_note")
      .order("step_number", { ascending: true });

    if (error) {
      console.error("[process] read failed:", error.message);
      return [];
    }
    return data ?? [];
  },
  ["process-steps"],
  { tags: [CACHE_TAGS.processSteps] },
);

/**
 * How a project runs, as a timeline.
 *
 * A card grid was the first attempt and was wrong: seven steps in four columns
 * leaves a hole in the last row, and the number of steps is admin-editable, so
 * any column count is eventually going to be the wrong one.
 *
 * A timeline has no such constraint. Three steps or twelve, it reads correctly,
 * and the sequence — which is the entire point of this section — is carried by
 * the connector rather than by reading order alone.
 */
export async function ProcessSteps({ content }: { content: ProcessStepsContent }) {
  const steps = await getProcessSteps();
  if (steps.length === 0) return null;

  return (
    <Section background="muted">
      <SectionHeading
        eyebrow={content.eyebrow}
        title={content.heading}
        description={content.description}
      />

      <ol className="reveal-group mt-14">
        {steps.map((step, index) => {
          const last = index === steps.length - 1;

          return (
            <Reveal key={step.id} as="li">
              <div className="group relative grid gap-x-6 gap-y-2 pb-10 sm:grid-cols-[3.5rem_minmax(0,14rem)_1fr] sm:gap-x-8">
                {/* Connector. Absolutely positioned so it spans the full row
                    height regardless of how long the description runs, and
                    omitted on the last step so it does not point at nothing. */}
                {!last && (
                  <span
                    aria-hidden
                    className="absolute left-[1.4rem] top-12 h-[calc(100%-2.5rem)] w-px bg-border"
                  />
                )}

                <span className="relative z-10 grid size-11 shrink-0 place-items-center rounded-full border border-border bg-surface font-mono text-sm text-text-subtle transition-colors duration-[--duration-base] group-hover:border-accent group-hover:text-accent">
                  {String(step.step_number).padStart(2, "0")}
                </span>

                <h3 className="self-center font-display text-xl font-semibold sm:pt-0">
                  {step.title}
                </h3>

                <div className="sm:self-center">
                  <p className="leading-relaxed text-text-muted">
                    {step.description}
                  </p>
                  {step.duration_note && (
                    <p className="mt-2 font-mono text-xs text-text-subtle">
                      {step.duration_note}
                    </p>
                  )}
                </div>
              </div>
            </Reveal>
          );
        })}
      </ol>
    </Section>
  );
}
