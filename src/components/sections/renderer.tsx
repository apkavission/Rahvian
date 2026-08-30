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
        return (
          <Component
            key={section.id}
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
        );
      })}
    </>
  );
}
