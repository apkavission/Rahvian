import Link from "next/link";
import { Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import { BrandLogo } from "@/components/site/brand-logo";
import { getNavigation } from "@/lib/queries/navigation";
import { getSiteSettings } from "@/lib/queries/site-settings";
import { whatsappLink, whatsappTemplateOf } from "@/lib/whatsapp";

export async function Footer() {
  const [services, company, legal, settings] = await Promise.all([
    getNavigation("footer_primary"),
    getNavigation("footer_secondary"),
    getNavigation("footer_legal"),
    getSiteSettings(),
  ]);

  const year = new Date().getFullYear();

  const whatsapp = whatsappLink(settings?.whatsapp, whatsappTemplateOf(settings));

  const address = [
    settings?.address_line1,
    settings?.address_line2,
    settings?.city,
    settings?.state,
    settings?.postal_code,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <footer className="mt-24 border-t border-border bg-surface-2/40">
      <div className="container-page py-16">
        <div className="grid gap-12 lg:grid-cols-[1.4fr_1fr_1fr_1.2fr]">
          <div className="space-y-4">
            <p className="flex items-center gap-3 font-display text-lg font-semibold tracking-tight">
              <BrandLogo height={36} />
              <span>{settings?.company_name ?? "Apka Saathi"}</span>
            </p>
            <p className="max-w-xs text-sm leading-relaxed text-text-muted">
              {settings?.tagline ||
                "Technology, Software & Digital Solutions"}
            </p>
            {/* The legal entity is named separately from the brand, so a
                visitor can always tell who they would actually contract with. */}
            <p className="text-xs text-text-subtle">
              A unit of {settings?.legal_name ?? "Apka Saathi Private Limited"}
            </p>
          </div>

          <FooterColumn title="Services" items={services} />
          <FooterColumn title="Company" items={company} />

          <div className="space-y-4">
            <h2 className="text-sm font-semibold">Get in touch</h2>
            <ul className="space-y-3 text-sm text-text-muted">
              {settings?.phone && (
                <ContactRow icon={<Phone className="size-4" />} href={`tel:${settings.phone}`}>
                  {settings.phone}
                </ContactRow>
              )}
              {/*
                The footer is on every page, so it has no one subject to name —
                the message is the generic opener. A number without its country
                code produces no link at all rather than a dead one.
              */}
              {whatsapp && (
                <ContactRow
                  icon={<MessageCircle className="size-4" />}
                  href={whatsapp}
                  external
                >
                  WhatsApp
                </ContactRow>
              )}
              {settings?.email && (
                <ContactRow icon={<Mail className="size-4" />} href={`mailto:${settings.email}`}>
                  {settings.email}
                </ContactRow>
              )}
              {address && (
                <li className="flex gap-2.5">
                  <MapPin className="mt-0.5 size-4 shrink-0" aria-hidden />
                  <span>{address}</span>
                </li>
              )}
            </ul>
          </div>
        </div>

        <div className="mt-14 flex flex-col gap-4 border-t border-border pt-8 text-xs text-text-subtle sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {year} {settings?.legal_name ?? "Apka Saathi Private Limited"}. All
            rights reserved.
            {settings?.cin ? ` CIN: ${settings.cin}.` : ""}
            {settings?.gst ? ` GST: ${settings.gst}.` : ""}
          </p>
          <nav aria-label="Legal" className="flex flex-wrap gap-x-6 gap-y-2">
            {legal.map((item) => (
              <Link
                key={item.id}
                href={item.href}
                className="transition-colors hover:text-text"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </footer>
  );
}

// ---------------------------------------------------------------------------

function FooterColumn({
  title,
  items,
}: {
  title: string;
  items: Awaited<ReturnType<typeof getNavigation>>;
}) {
  if (items.length === 0) return null;

  return (
    <div className="space-y-4">
      <h2 className="text-sm font-semibold">{title}</h2>
      <ul className="space-y-2.5">
        {items.map((item) => (
          <li key={item.id}>
            <Link
              href={item.href}
              className="text-sm text-text-muted transition-colors hover:text-text"
            >
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ContactRow({
  icon,
  href,
  external,
  children,
}: {
  icon: React.ReactNode;
  href: string;
  external?: boolean;
  children: React.ReactNode;
}) {
  return (
    <li>
      <a
        href={href}
        target={external ? "_blank" : undefined}
        rel={external ? "noopener noreferrer" : undefined}
        className="flex items-center gap-2.5 transition-colors hover:text-text"
      >
        <span className="shrink-0" aria-hidden>
          {icon}
        </span>
        {children}
      </a>
    </li>
  );
}
