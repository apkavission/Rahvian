import { Reveal } from "@/components/motion/reveal";
import { Section } from "@/components/sections/section";
import type { BackgroundVariant } from "@/components/sections/section";
import { getSiteSettings } from "@/lib/queries/site-settings";
import { formatDate } from "@/lib/utils";

export interface LegalDocumentContent {
  /** ISO date the wording last changed. Shown at the top of the document. */
  updatedOn?: string;
  /** Paragraphs before the first numbered clause. */
  intro?: string[];
  clauses: {
    heading: string;
    /** One entry per paragraph. Markup is never accepted here. */
    body?: string[];
    /** A bulleted list under the paragraphs. */
    items?: string[];
  }[];
  /** Closing block. The entity details underneath come from site settings. */
  contact?: { heading: string; body: string[] };
  background?: BackgroundVariant;
}

/**
 * A legal document — privacy policy, terms, or anything else of that shape.
 *
 * Structured as clauses rather than one block of text for the same reason the
 * story section is: the owner edits a clause, a regulator cites a clause, and
 * a visitor links to a clause. Each one gets a stable anchor derived from its
 * heading and a contents list beside it.
 *
 * The company's own identifying details are not part of the content. They are
 * read from `site_settings`, so the registered address, CIN, GST and contact
 * address are stated in one place and cannot drift between two documents that
 * both claim to name the same company. Every line is conditional on a value
 * existing — an unfilled setting leaves the line out rather than printing a
 * label with nothing after it.
 */
export async function LegalDocument({ content }: { content: LegalDocumentContent }) {
  const settings = await getSiteSettings();
  const clauses = content.clauses ?? [];
  const updated = formatDate(content.updatedOn);

  const address = [
    settings?.address_line1,
    settings?.address_line2,
    [settings?.city, settings?.state, settings?.postal_code].filter(Boolean).join(" "),
    settings?.country,
  ]
    .map((line) => line?.trim())
    .filter((line): line is string => Boolean(line));

  return (
    <Section background={content.background ?? "default"} className="py-14 md:py-20">
      <div className="grid gap-12 lg:grid-cols-[minmax(0,16rem)_1fr] lg:gap-20">
        {/* Contents. A legal page is read by jumping, not scrolling. */}
        <nav aria-label="Contents" className="lg:sticky lg:top-28 lg:self-start">
          {updated && (
            <p className="font-mono text-xs uppercase tracking-[0.16em] text-text-subtle">
              Last updated {updated}
            </p>
          )}

          <ol className="mt-6 space-y-2.5 border-l border-border pl-5">
            {clauses.map((clause, index) => (
              <li key={clause.heading}>
                <a
                  href={`#${anchor(clause.heading)}`}
                  className="text-sm leading-snug text-text-muted transition-colors duration-[--duration-fast] hover:text-accent"
                >
                  <span className="font-mono text-xs text-text-subtle">
                    {String(index + 1).padStart(2, "0")}
                  </span>{" "}
                  {clause.heading}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <div>
          {content.intro && content.intro.length > 0 && (
            <Reveal>
              <div className="border-b border-border pb-10">
                {content.intro.map((paragraph, index) => (
                  <p
                    key={index}
                    className="measure leading-relaxed text-text-muted [&+p]:mt-4"
                  >
                    {paragraph}
                  </p>
                ))}
              </div>
            </Reveal>
          )}

          <div className="reveal-group">
            {clauses.map((clause, index) => (
              <Reveal key={clause.heading}>
                <section
                  id={anchor(clause.heading)}
                  className="border-b border-border py-10 scroll-mt-28"
                >
                  <h2 className="font-display text-xl font-semibold">
                    <span className="mr-3 font-mono text-sm text-text-subtle">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    {clause.heading}
                  </h2>

                  {clause.body?.map((paragraph, bodyIndex) => (
                    <p
                      key={bodyIndex}
                      className="measure mt-4 leading-relaxed text-text-muted"
                    >
                      {paragraph}
                    </p>
                  ))}

                  {clause.items && clause.items.length > 0 && (
                    <ul className="mt-5 space-y-3">
                      {clause.items.map((item) => (
                        <li
                          key={item}
                          className="measure flex gap-3 text-sm leading-relaxed text-text-muted"
                        >
                          <span
                            className="mt-2 size-1.5 shrink-0 rounded-full bg-accent"
                            aria-hidden
                          />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              </Reveal>
            ))}
          </div>

          {content.contact && (
            <Reveal>
              <div className="mt-10 rounded-2xl border border-border bg-surface-2/50 p-7">
                <h2 className="font-display text-lg font-semibold">
                  {content.contact.heading}
                </h2>

                {content.contact.body.map((paragraph, index) => (
                  <p
                    key={index}
                    className="measure mt-3 text-sm leading-relaxed text-text-muted"
                  >
                    {paragraph}
                  </p>
                ))}

                {settings && (
                  <dl className="mt-6 space-y-3 border-t border-border pt-6 text-sm">
                    <Detail term="Entity" value={settings.legal_name} />
                    {address.length > 0 && (
                      <Detail term="Registered address" value={address.join(", ")} />
                    )}
                    {settings.email && (
                      <Detail
                        term="Email"
                        value={settings.email}
                        href={`mailto:${settings.email}`}
                      />
                    )}
                    {settings.phone && (
                      <Detail
                        term="Phone"
                        value={settings.phone}
                        href={`tel:${settings.phone.replace(/\s+/g, "")}`}
                      />
                    )}
                    {settings.cin && <Detail term="CIN" value={settings.cin} />}
                    {settings.gst && <Detail term="GSTIN" value={settings.gst} />}
                  </dl>
                )}
              </div>
            </Reveal>
          )}
        </div>
      </div>
    </Section>
  );
}

function Detail({
  term,
  value,
  href,
}: {
  term: string;
  value: string;
  href?: string;
}) {
  return (
    <div className="grid gap-1 sm:grid-cols-[10rem_1fr] sm:gap-4">
      <dt className="font-mono text-xs uppercase tracking-[0.14em] text-text-subtle">
        {term}
      </dt>
      <dd className="text-text-muted">
        {href ? (
          <a href={href} className="transition-colors hover:text-accent">
            {value}
          </a>
        ) : (
          value
        )}
      </dd>
    </div>
  );
}

/**
 * A stable id for a clause, derived from its heading.
 *
 * Derived rather than stored because a clause has no natural key, and a
 * hand-typed anchor is one more field for an admin to get wrong. Renaming a
 * heading changes its link, which is the correct trade: the alternative is an
 * anchor that no longer describes what it points at.
 */
function anchor(heading: string): string {
  return (
    heading
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "clause"
  );
}
