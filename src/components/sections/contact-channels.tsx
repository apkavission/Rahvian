import Link from "next/link";
import { Clock, Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import { ContactForm } from "@/components/forms/contact-form";
import { Reveal } from "@/components/motion/reveal";
import { Section, SectionHeading } from "@/components/sections/section";
import type { BackgroundVariant } from "@/components/sections/section";
import { getServices } from "@/lib/queries/services";
import { getSiteSettings } from "@/lib/queries/site-settings";

export interface ContactChannelsContent {
  eyebrow?: string;
  heading: string;
  description?: string;
  formHeading?: string;
  formNote?: string;
  submitLabel?: string;
  channelsHeading?: string;
  hoursHeading?: string;
  /** Pointer to the longer quote form, for people who arrived with a brief. */
  quoteLink?: { label: string; href: string; note?: string };
  /** Shown in place of the channel list while no contact details are set. */
  channelsFallback?: string;
  privacyNote?: string;
  background?: BackgroundVariant;
}

const DAY_LABEL: Record<string, string> = {
  monday: "Mon",
  tuesday: "Tue",
  wednesday: "Wed",
  thursday: "Thu",
  friday: "Fri",
  saturday: "Sat",
  sunday: "Sun",
};

/**
 * The contact block: the short form, and every other way to reach us.
 *
 * A section rather than page-owned markup, so the same block can be dropped on
 * any page from the admin and so the copy around the form is editable. The
 * form itself stays in code — validation, the honeypot and the consent record
 * are controls, not content.
 *
 * Every channel is conditional. `site_settings` starts with no phone, email or
 * address, and this renders correctly in that state: the form is the route
 * that always works, and a channel appears the moment it is filled in rather
 * than showing an empty label or a `mailto:` pointing nowhere.
 */
export async function ContactChannels({ content }: { content: ContactChannelsContent }) {
  const [settings, services] = await Promise.all([getSiteSettings(), getServices()]);

  /*
    The country alone is not an address. `site_settings.country` defaults to
    "India" while every street field is still empty, and joining the lot would
    print a pin icon next to the word India — which tells a visitor nothing and
    looks like a half-loaded field. The country is appended only once there is
    a real address in front of it.
  */
  const street = [
    settings?.address_line1,
    settings?.address_line2,
    settings?.city,
    settings?.state,
    settings?.postal_code,
  ]
    .filter(Boolean)
    .join(", ");

  const address = street
    ? [street, settings?.country].filter(Boolean).join(", ")
    : "";

  const hours = readHours(settings?.working_hours);
  const hasChannel = Boolean(settings?.email || settings?.phone || settings?.whatsapp || address);

  return (
    <Section background={content.background ?? "default"}>
      <SectionHeading
        eyebrow={content.eyebrow}
        title={content.heading}
        description={content.description}
      />

      <div className="mt-12 grid gap-12 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-16">
        <Reveal>
          {content.formHeading && (
            <h3 className="font-display text-xl font-semibold">{content.formHeading}</h3>
          )}
          {content.formNote && (
            <p className="measure mt-2.5 leading-relaxed text-text-muted">{content.formNote}</p>
          )}

          <div className={content.formHeading || content.formNote ? "mt-8" : undefined}>
            <ContactForm
              services={services.map((service) => ({ id: service.id, name: service.name }))}
              submitLabel={content.submitLabel}
            />
          </div>

          {content.privacyNote && (
            <p className="mt-6 text-xs leading-relaxed text-text-subtle">{content.privacyNote}</p>
          )}
        </Reveal>

        <Reveal className="space-y-6 lg:pt-1">
          <div className="rounded-2xl border border-border bg-surface-2/50 p-6">
            <h3 className="text-sm font-semibold">
              {content.channelsHeading ?? "Other ways to reach us"}
            </h3>

            {hasChannel ? (
              <ul className="mt-5 space-y-3.5 text-sm">
                {settings?.email && (
                  <Channel
                    icon={<Mail className="size-4" aria-hidden />}
                    href={`mailto:${settings.email}`}
                    label={settings.email}
                  />
                )}
                {settings?.phone && (
                  <Channel
                    icon={<Phone className="size-4" aria-hidden />}
                    href={`tel:${settings.phone.replace(/\s+/g, "")}`}
                    label={settings.phone}
                  />
                )}
                {settings?.whatsapp && (
                  <Channel
                    icon={<MessageCircle className="size-4" aria-hidden />}
                    href={`https://wa.me/${settings.whatsapp.replace(/\D/g, "")}`}
                    label="WhatsApp"
                    external
                  />
                )}
                {address && (
                  <li className="flex gap-3 text-text-muted">
                    <MapPin className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden />
                    <span>{address}</span>
                  </li>
                )}
              </ul>
            ) : (
              content.channelsFallback && (
                <p className="mt-4 text-sm leading-relaxed text-text-muted">
                  {content.channelsFallback}
                </p>
              )
            )}
          </div>

          {hours.length > 0 && (
            <div className="rounded-2xl border border-border bg-surface-2/50 p-6">
              <h3 className="flex items-center gap-2 text-sm font-semibold">
                <Clock className="size-4 text-accent" aria-hidden />
                {content.hoursHeading ?? "When we are open"}
              </h3>
              <dl className="mt-5 space-y-2 text-sm">
                {hours.map((entry) => (
                  <div key={entry.day} className="flex justify-between gap-4">
                    <dt className="text-text-muted">{DAY_LABEL[entry.day] ?? entry.day}</dt>
                    <dd className="font-mono text-xs text-text-subtle">
                      {entry.closed || !entry.open || !entry.close
                        ? "Closed"
                        : `${entry.open} – ${entry.close}`}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          )}

          {content.quoteLink && (
            <div className="rounded-2xl border border-border p-6">
              <Link
                href={content.quoteLink.href}
                className="text-sm font-medium text-accent transition-colors hover:text-accent-hover"
              >
                {content.quoteLink.label}
              </Link>
              {content.quoteLink.note && (
                <p className="mt-2 text-sm leading-relaxed text-text-muted">
                  {content.quoteLink.note}
                </p>
              )}
            </div>
          )}
        </Reveal>
      </div>
    </Section>
  );
}

// ---------------------------------------------------------------------------

interface Hours {
  day: string;
  open: string | null;
  close: string | null;
  closed: boolean;
}

/**
 * `working_hours` is JSONB, which is legitimately anything. An entry with no
 * day is dropped rather than rendered, so a malformed edit costs the panel one
 * row instead of crashing the page.
 */
function readHours(value: unknown): Hours[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((entry) => {
    if (!entry || typeof entry !== "object") return [];
    const row = entry as Record<string, unknown>;
    if (typeof row.day !== "string") return [];

    return [
      {
        day: row.day,
        open: typeof row.open === "string" ? row.open : null,
        close: typeof row.close === "string" ? row.close : null,
        closed: row.closed === true,
      },
    ];
  });
}

function Channel({
  icon,
  href,
  label,
  external,
}: {
  icon: React.ReactNode;
  href: string;
  label: string;
  external?: boolean;
}) {
  return (
    <li>
      <a
        href={href}
        target={external ? "_blank" : undefined}
        rel={external ? "noopener noreferrer" : undefined}
        className="flex items-center gap-3 text-text-muted transition-colors hover:text-accent"
      >
        <span className="text-accent">{icon}</span>
        {label}
      </a>
    </li>
  );
}
