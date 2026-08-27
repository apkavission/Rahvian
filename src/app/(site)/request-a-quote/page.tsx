import { Suspense } from "react";
import type { Metadata } from "next";
import { Mail, MessageCircle, Phone } from "lucide-react";
import { buildMetadata } from "@/lib/seo";
import { getServices } from "@/lib/queries/services";
import { getSiteSettings } from "@/lib/queries/site-settings";
import { QuoteForm } from "./quote-form";

export async function generateMetadata(): Promise<Metadata> {
  return buildMetadata({
    title: "Request a quote",
    description:
      "Tell us what you are building and we will reply within one working day " +
      "with a scope, a timeline and a price.",
    path: "/request-a-quote",
  });
}

/**
 * The quote request page.
 *
 * Unlike the home and services routes this one owns its copy rather than
 * reading `page_sections`. The page is a single form with a short preamble;
 * modelling that as editable sections would add a layer of indirection around
 * two paragraphs while the form itself — the part that matters — would still
 * live in code.
 *
 * The service list comes from the database so the dropdown always matches what
 * is actually offered, and the contact details come from settings so they are
 * changed in one place.
 */
export default async function RequestAQuotePage() {
  const [services, settings] = await Promise.all([
    getServices(),
    getSiteSettings(),
  ]);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 lg:py-24">
      <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-16">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-text sm:text-4xl">
            Request a quote
          </h1>
          <p className="mt-4 max-w-2xl text-text-muted">
            Tell us what you are building. The more you can say about scope and
            timing, the more useful our first reply will be — we answer with a
            scope, a timeline and a price rather than a call booking link.
          </p>

          {/*
            The form reads utm_* from the query string, which makes it depend
            on request-time data. The boundary keeps that dependency local: the
            heading and the contact panel still render statically, and only the
            form waits.
          */}
          <div className="mt-10">
            <Suspense fallback={<FormSkeleton />}>
              <QuoteForm
                services={services.map((service) => ({
                  id: service.id,
                  slug: service.slug,
                  name: service.name,
                }))}
              />
            </Suspense>
          </div>
        </div>

        <aside className="lg:pt-2">
          <div className="rounded-lg border border-border bg-surface-2 p-6">
            <h2 className="text-sm font-semibold text-text">
              Rather talk first?
            </h2>
            <p className="mt-2 text-sm text-text-muted">
              The form is the fastest route, but these reach us just as well.
            </p>

            <ul className="mt-5 space-y-3 text-sm">
              {settings?.email ? (
                <ContactRow
                  icon={<Mail className="size-4" aria-hidden />}
                  href={`mailto:${settings.email}`}
                  label={settings.email}
                />
              ) : null}
              {settings?.phone ? (
                <ContactRow
                  icon={<Phone className="size-4" aria-hidden />}
                  href={`tel:${settings.phone.replace(/\s+/g, "")}`}
                  label={settings.phone}
                />
              ) : null}
              {settings?.whatsapp ? (
                <ContactRow
                  icon={<MessageCircle className="size-4" aria-hidden />}
                  href={`https://wa.me/${settings.whatsapp.replace(/\D/g, "")}`}
                  label="WhatsApp"
                />
              ) : null}
            </ul>
          </div>

          <p className="mt-6 text-xs leading-relaxed text-text-subtle">
            We use your details only to answer this enquiry. We do not sell them
            and we do not add you to a mailing list.
          </p>
        </aside>
      </div>
    </div>
  );
}

/** Holds the form's height while it resolves, so the page does not jump. */
function FormSkeleton() {
  return (
    <div className="space-y-6" aria-hidden>
      <div className="grid gap-6 sm:grid-cols-2">
        {Array.from({ length: 10 }, (_, index) => (
          <div key={index} className="space-y-2">
            <div className="h-4 w-24 rounded-sm bg-surface-3" />
            <div className="h-10 rounded-md bg-surface-2" />
          </div>
        ))}
      </div>
      <div className="space-y-2">
        <div className="h-4 w-40 rounded-sm bg-surface-3" />
        <div className="h-36 rounded-md bg-surface-2" />
      </div>
      <div className="h-10 w-36 rounded-md bg-surface-2" />
    </div>
  );
}

function ContactRow({
  icon,
  href,
  label,
}: {
  icon: React.ReactNode;
  href: string;
  label: string;
}) {
  return (
    <li>
      <a
        href={href}
        className="flex items-center gap-3 text-text-muted transition-colors hover:text-accent"
      >
        <span className="text-accent">{icon}</span>
        {label}
      </a>
    </li>
  );
}
