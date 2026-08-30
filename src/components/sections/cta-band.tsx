import { ArrowRight, MessageCircle } from "lucide-react";
import { Reveal } from "@/components/motion/reveal";
import { SceneMount } from "@/components/three/scene-mount";
import { ButtonLink } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getSiteSettings } from "@/lib/queries/site-settings";
import { whatsappLink, whatsappTemplateOf } from "@/lib/whatsapp";

export interface CtaBandContent {
  eyebrow?: string;
  heading: string;
  description?: string;
  ctaPrimary: { label: string; href: string };
  /** Shown only when a WhatsApp number is configured in settings. */
  showWhatsapp?: boolean;
  whatsappLabel?: string;
  /** The page's subject, merged in by the renderer. See `lib/whatsapp.ts`. */
  whatsappContext?: string;
}

export async function CtaBand({ content }: { content: CtaBandContent }) {
  const settings = await getSiteSettings();
  const whatsapp = content.showWhatsapp
    ? whatsappLink(settings?.whatsapp, whatsappTemplateOf(settings), content.whatsappContext)
    : null;

  return (
    /*
      Same dark band as `Section`'s contrast variant, and the same token
      overrides: `text-accent` inside here has to resolve to the dark theme's
      accent in both themes, or the eyebrow lands on near-black at 3.98:1.
      This section builds its own element rather than using `Section` because
      it carries a WebGL scene and its own vertical rhythm.
    */
    <section className="relative overflow-hidden bg-[#07090c] text-[#e8edf4] [--accent:#2dd4bf] [--accent-hover:#5eead4] [--accent-fg:#04201f] [--ring:#2dd4bf] [--text:#e8edf4] [--text-muted:#98a5b6] [--text-subtle:#808fa2]">
      {/*
        Closing scene — the rippling field, deliberately not the hero's
        lattice. The page opens on a bounded system and closes on an open
        plane, so the two ends do not read as the same image twice.

        Spans the full width and sits low, behind and below the copy, on every
        screen size. SceneMount unmounts whenever it leaves the viewport, so
        this and the hero never hold a WebGL context at the same time.
      */}
      {/* The lattice is a bounded, roughly spherical form, so it needs a
          square-ish box — stretched across a wide strip it would read as a
          smear. Sits behind the copy on narrow screens, beside it on wide. */}
      <SceneMount
        scene="lattice"
        fallback="orbits"
        className={cn(
          "pointer-events-none absolute -bottom-10 right-[-25%] size-96",
          "mask-[radial-gradient(58%_58%_at_50%_50%,#000,transparent_76%)]",
          "md:size-128 lg:-bottom-16 lg:right-[2%] lg:size-160 lg:mask-none",
        )}
      />

      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 -bottom-56 h-112 opacity-25 [background:radial-gradient(50%_50%_at_50%_50%,var(--accent),transparent_70%)]"
      />

      <div className="container-page relative py-24 md:py-32">
        <Reveal className="max-w-3xl">
          {content.eyebrow && (
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent">
              {content.eyebrow}
            </p>
          )}
          <h2 className="mt-5 font-display text-3xl font-semibold leading-tight sm:text-5xl">
            {content.heading}
          </h2>
          {content.description && (
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-[#98a5b6]">
              {content.description}
            </p>
          )}
        </Reveal>

        <Reveal>
          <div className="mt-10 flex flex-wrap gap-3">
            <ButtonLink href={content.ctaPrimary.href} size="lg" className="group">
              {content.ctaPrimary.label}
              <ArrowRight
                className="size-4 transition-transform duration-[--duration-base] ease-[--ease-out] group-hover:translate-x-0.5"
                aria-hidden
              />
            </ButtonLink>

            {whatsapp && (
              <a
                href={whatsapp}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-13 items-center gap-2 rounded-lg border border-[#232b36] px-7 text-base font-medium text-[#e8edf4] transition-colors duration-[--duration-fast] hover:border-[#323c4a] hover:bg-[#0e1218]"
              >
                <MessageCircle className="size-4" aria-hidden />
                {content.whatsappLabel ?? "Message on WhatsApp"}
              </a>
            )}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
