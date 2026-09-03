import { getSectionComponent } from "@/components/sections/registry";
import type { PageWithSections } from "@/lib/queries/page";

/**
 * Render a page's sections in order.
 *
 * An unrecognised type is skipped rather than thrown, with a server-side
 * warning. A section removed from the code while rows still reference it must
 * not take the whole page down — the rest of the content is still worth
 * serving, and the warning is what gets it noticed.
 */
export function SectionRenderer({
  sections,
  context,
}: {
  sections: PageWithSections["sections"];
  /**
   * What this page is about, in the page's own words.
   *
   * Merged into every section's content as `whatsappContext`, which is what
   * lets a WhatsApp button open a chat that already names the subject instead
   * of an empty one. Passed as the page's title rather than a string typed
   * here, so it follows what the owner renamed the page to.
   *
   * Merged rather than passed as a second prop for the same reason
   * `background` is: one prop keeps every section's signature identical, which
   * is what lets the registry type them all the same way.
   */
  context?: string;
}) {
  /*
    An address for each band of the page.

    Nothing on this site could be linked to below the top of a page. The
    services page's own hero carried a "How we work" button pointing at
    `/process` — a page that does not exist and never did — because the thing it
    meant is a section three bands further down, and there was no way to say so.

    The anchor is the section's type, which is stable across an edit: it is what
    the section *is*, not where it currently sits. A page with two of the same
    type numbers the second one, so `#faq` stays the first FAQ even after
    another is added above it.

    Rendered as an empty element before the section rather than as an `id` on
    it, because every section component owns its own root element and wrapping
    those would change the layout of forty screens to add an attribute.
  */
  const used = new Map<string, number>();

  const anchorFor = (type: string) => {
    const base = type.replace(/_/g, "-");
    const seen = used.get(base) ?? 0;
    used.set(base, seen + 1);
    return seen === 0 ? base : `${base}-${seen + 1}`;
  };

  return (
    <>
      {sections.map((section) => {
        const Component = getSectionComponent(section.type);

        if (!Component) {
          console.warn(
            `[sections] no component registered for type "${section.type}" (id ${section.id})`,
          );
          return null;
        }

        /*
          The background is a column, not part of the content.

          Section components read it from `content.background`, so it is merged
          in here rather than passed as a second prop — one prop keeps every
          section's signature identical, which is what lets the registry type
          them all the same way.

          Merging it also settles which of the two wins. Before this, the column
          was written by the seeder and the admin and then silently ignored: a
          section marked muted in the database rendered with its default
          background, and nothing said so.
        */
        /*
          `scroll-mt` clears the sticky header. Without it a jump link lands
          with the heading hidden behind the bar, which reads as the link going
          to the wrong place.
        */
        return (
          <div key={section.id} className="contents">
            <div id={anchorFor(section.type)} className="scroll-mt-24" aria-hidden />
            <Component
            content={
              section.content && typeof section.content === "object" && !Array.isArray(section.content)
                ? {
                    // A context written into the section itself wins: somebody
                    // who set one meant that wording, not the page title.
                    whatsappContext: context,
                    ...section.content,
                    background: section.background,
                  }
                : section.content
              }
            />
          </div>
        );
      })}
    </>
  );
}
