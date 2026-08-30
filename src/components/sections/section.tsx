import { Reveal } from "@/components/motion/reveal";
import { cn } from "@/lib/utils";

export type BackgroundVariant = "default" | "muted" | "contrast";

const BACKGROUNDS: Record<BackgroundVariant, string> = {
  default: "",
  muted: "bg-surface-2/40",
  /*
    The dark band used for CTAs and closing sections. Committed to a dark
    treatment in both themes, which is why it defines its own colours.

    It redefines the tokens rather than only setting a background, because the
    children inside it — headings, eyebrows, muted paragraphs — reach for
    `text-accent` and `text-text-muted` like every other section does. Without
    this, the light theme's accent (a dark teal tuned for a white page) lands
    on near-black at 3.98:1 and fails. Overriding the tokens once here fixes
    every child at the same time, and keeps the rule that no component invents
    its own hex.
  */
  contrast: [
    "bg-[#07090c] text-[#e8edf4]",
    "[--accent:#2dd4bf] [--accent-hover:#5eead4] [--accent-fg:#04201f] [--ring:#2dd4bf]",
    "[--text:#e8edf4] [--text-muted:#98a5b6] [--text-subtle:#808fa2]",
    "[--border:#232b36] [--border-strong:#323c4a]",
  ].join(" "),
};

/**
 * Standard section wrapper: vertical rhythm, container, optional background.
 *
 * Every section on the site goes through this, so spacing stays consistent no
 * matter which order the admin arranges them in.
 */
export function Section({
  children,
  background = "default",
  className,
  id,
}: {
  children: React.ReactNode;
  background?: BackgroundVariant;
  className?: string;
  id?: string;
}) {
  return (
    <section id={id} className={cn("py-20 md:py-28", BACKGROUNDS[background], className)}>
      <div className="container-page">{children}</div>
    </section>
  );
}

/**
 * Section heading block: eyebrow, hook line, supporting sentence.
 *
 * The hook is the heading. The supporting line exists to make the hook
 * concrete — never to repeat it.
 */
export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "left",
  className,
  as: Heading = "h2",
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  align?: "left" | "center";
  className?: string;
  /**
   * The heading level. `h2` everywhere except a page whose main heading this
   * is — the category archive is the only one today.
   *
   * A level rather than a second component, because the styling is the same
   * and the difference is structural: a page needs exactly one `h1`, and a
   * section on a page that already has one must not add a second. Getting that
   * wrong is invisible on screen and total to somebody navigating by heading.
   */
  as?: "h1" | "h2";
}) {
  return (
    <Reveal
      className={cn(
        "max-w-2xl",
        align === "center" && "mx-auto text-center",
        className,
      )}
    >
      {eyebrow && (
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent">
          {eyebrow}
        </p>
      )}
      <Heading
        className={cn(
          "font-display text-3xl font-semibold sm:text-4xl lg:text-[2.75rem] lg:leading-[1.1]",
          eyebrow && "mt-4",
        )}
      >
        {title}
      </Heading>
      {description && (
        <p className="mt-5 text-lg leading-relaxed text-text-muted">{description}</p>
      )}
    </Reveal>
  );
}
