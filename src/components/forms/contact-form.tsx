"use client";

import { useActionState } from "react";
import { usePathname } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { BrandSpinner } from "@/components/brand/brand-loader";
import { useBusyWhile } from "@/components/forms/use-busy-while";
import { Button } from "@/components/ui/button";
import { useFormToast } from "@/components/forms/use-form-toast";
import { Field, FIELD } from "@/components/ui/field";
import { cn } from "@/lib/utils";
import { submitContactEnquiry } from "@/lib/actions/contact";
import { CONSENT_TEXT, initialContactFormState } from "@/lib/validation/contact";

export interface ServiceOption {
  id: string;
  name: string;
}


/**
 * The short enquiry form.
 *
 * Six fields against the quote form's twelve. This one is for a question; the
 * quote form is for a brief, and the link to it sits directly underneath so
 * nobody has to guess which they wanted.
 *
 * No `useSearchParams` here, unlike the quote form: this form is placed inside
 * a page section that can appear anywhere, and reading the query string would
 * make every page carrying it wait on request-time data. Campaign attribution
 * for a one-line question is not worth that.
 */
export function ContactForm({
  services,
  submitLabel = "Send message",
  consentText = CONSENT_TEXT,
}: {
  services: ServiceOption[];
  submitLabel?: string;
  consentText?: string;
}) {
  const [state, formAction, pending] = useActionState(
    submitContactEnquiry,
    initialContactFormState,
  );
  const pathname = usePathname();

  useBusyWhile(pending, "Sending your message");
  useFormToast(state, { successTitle: "Message received" });

  if (state.status === "success") {
    return (
      <div
        role="status"
        className="rounded-lg border border-accent/30 bg-accent-soft p-8 text-center"
      >
        <CheckCircle2 className="mx-auto size-10 text-accent" strokeWidth={1.5} aria-hidden />
        <p className="mt-4 text-lg font-semibold text-text">Message received</p>
        <p className="mt-2 text-sm text-text-muted">{state.message}</p>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-6" noValidate>
      <input type="hidden" name="source_page" value={pathname} />

      {/* Honeypot. Moved off-screen rather than `display:none`, because some
          bots skip hidden inputs but almost none compute layout. */}
      <div className="absolute left-[-9999px]" aria-hidden>
        <label htmlFor="contact-website-url">Leave this field empty</label>
        <input
          id="contact-website-url"
          name="website_url"
          type="text"
          tabIndex={-1}
          autoComplete="off"
        />
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <Field label="Your name" required error={state.fieldErrors?.name}>
          {(id, describedBy) => (
            <input
              id={id}
              name="name"
              type="text"
              required
              autoComplete="name"
              aria-describedby={describedBy}
              className={FIELD}
            />
          )}
        </Field>

        <Field label="Email" required error={state.fieldErrors?.email}>
          {(id, describedBy) => (
            <input
              id={id}
              name="email"
              type="email"
              required
              autoComplete="email"
              aria-describedby={describedBy}
              className={FIELD}
            />
          )}
        </Field>

        <Field label="Phone" error={state.fieldErrors?.phone}>
          {(id, describedBy) => (
            <input
              id={id}
              name="phone"
              type="tel"
              autoComplete="tel"
              aria-describedby={describedBy}
              className={FIELD}
            />
          )}
        </Field>

        <Field label="Company" error={state.fieldErrors?.company_name}>
          {(id, describedBy) => (
            <input
              id={id}
              name="company_name"
              type="text"
              autoComplete="organization"
              aria-describedby={describedBy}
              className={FIELD}
            />
          )}
        </Field>
      </div>

      {services.length > 0 && (
        <Field label="What is this about?">
          {(id, describedBy) => (
            <select id={id} name="service_id" aria-describedby={describedBy} className={FIELD}>
              <option value="">A general question</option>
              {services.map((service) => (
                <option key={service.id} value={service.id}>
                  {service.name}
                </option>
              ))}
            </select>
          )}
        </Field>
      )}

      <Field label="Message" required error={state.fieldErrors?.message}>
        {(id, describedBy) => (
          <textarea
            id={id}
            name="message"
            rows={5}
            required
            aria-describedby={describedBy}
            className={cn(FIELD, "resize-y")}
          />
        )}
      </Field>

      <div>
        <label className="flex items-start gap-3 text-sm text-text-muted">
          <input
            type="checkbox"
            name="consent_given"
            required
            className="mt-0.5 size-4 shrink-0 rounded-sm border-border-strong text-accent focus:ring-2 focus:ring-accent/20"
          />
          <span>{consentText}</span>
        </label>
        {state.fieldErrors?.consent_given ? (
          <p className="mt-2 text-sm text-danger">{state.fieldErrors.consent_given}</p>
        ) : null}
      </div>

      {state.status === "error" && !state.fieldErrors ? (
        <p role="alert" className="text-sm text-danger">
          {state.message}
        </p>
      ) : null}

      <div className="flex items-center gap-4">
        <Button type="submit" disabled={pending}>
          {pending ? (
            <>
              <BrandSpinner />
              Sending
            </>
          ) : (
            submitLabel
          )}
        </Button>
        {state.status === "error" && state.fieldErrors ? (
          <p role="alert" className="text-sm text-danger">
            {state.message}
          </p>
        ) : null}
      </div>
    </form>
  );
}

