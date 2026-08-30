"use client";

import { useActionState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { BrandSpinner } from "@/components/brand/brand-loader";
import { useBusyWhile } from "@/components/forms/use-busy-while";
import { Button } from "@/components/ui/button";
import { useFormToast } from "@/components/forms/use-form-toast";
import { Field, FIELD } from "@/components/ui/field";
import { cn } from "@/lib/utils";
import {
  BUDGET_RANGES,
  CONSENT_TEXT,
  initialLeadFormState,
  PREFERRED_CONTACT,
  TIMELINES,
} from "@/lib/validation/lead";
import { submitQuoteRequest } from "./actions";

interface ServiceOption {
  id: string;
  slug: string;
  name: string;
}

const UTM_KEYS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
] as const;


export function QuoteForm({ services }: { services: ServiceOption[] }) {
  const [state, formAction, pending] = useActionState(
    submitQuoteRequest,
    initialLeadFormState,
  );
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useBusyWhile(pending, "Sending your enquiry");
  useFormToast(state, { successTitle: "Enquiry received" });

  // Campaign parameters ride along as hidden inputs so the action can record
  // where the enquiry came from. Read straight from the hook rather than
  // copied into state — the value is already reactive, and mirroring it would
  // only add a render.
  /*
    A service named in the query string preselects the dropdown, which is what
    lets a pricing card or a service page hand the form its own context. It is
    matched by slug rather than id: a slug is stable, readable in a link, and
    already public — an id in a marketing URL is neither.

    An unknown slug simply selects nothing, so a stale link still opens a
    working form.
  */
  const requestedService = searchParams.get("service");
  const preselectedServiceId =
    services.find((service) => service.slug === requestedService)?.id ?? "";

  const utm = UTM_KEYS.map(
    (key) => [key, searchParams.get(key)] as const,
  ).filter((entry): entry is readonly [(typeof UTM_KEYS)[number], string] =>
    Boolean(entry[1]),
  );

  if (state.status === "success") {
    return (
      <div
        role="status"
        className="rounded-lg border border-accent/30 bg-accent-soft p-8 text-center"
      >
        <CheckCircle2
          className="mx-auto size-10 text-accent"
          strokeWidth={1.5}
          aria-hidden
        />
        <p className="mt-4 text-lg font-semibold text-text">
          Enquiry received
        </p>
        <p className="mt-2 text-sm text-text-muted">{state.message}</p>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-6" noValidate>
      <input type="hidden" name="source_page" value={pathname} />
      {utm.map(([key, value]) => (
        <input key={key} type="hidden" name={key} value={value} />
      ))}

      {/*
        Honeypot. Moved off-screen rather than `display:none`, because some
        bots skip hidden inputs but almost none compute layout. `tabIndex={-1}`
        and `aria-hidden` keep it away from keyboard and screen reader users.
      */}
      <div className="absolute left-[-9999px]" aria-hidden>
        <label htmlFor="website_url">Leave this field empty</label>
        <input
          id="website_url"
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

        <Field label="WhatsApp" hint="If different from your phone">
          {(id, describedBy) => (
            <input
              id={id}
              name="whatsapp"
              type="tel"
              aria-describedby={describedBy}
              className={FIELD}
            />
          )}
        </Field>

        <Field label="Existing website">
          {(id, describedBy) => (
            <input
              id={id}
              name="existing_website"
              type="text"
              inputMode="url"
              placeholder="example.com"
              aria-describedby={describedBy}
              className={FIELD}
            />
          )}
        </Field>

        <Field label="What do you need?">
          {(id, describedBy) => (
            <select
              id={id}
              name="service_id"
              defaultValue={preselectedServiceId}
              aria-describedby={describedBy}
              className={FIELD}
            >
              <option value="">Not sure yet</option>
              {services.map((service) => (
                <option key={service.id} value={service.id}>
                  {service.name}
                </option>
              ))}
            </select>
          )}
        </Field>

        <Field label="Preferred way to reach you">
          {(id, describedBy) => (
            <select
              id={id}
              name="preferred_contact"
              aria-describedby={describedBy}
              className={FIELD}
            >
              <option value="">No preference</option>
              {PREFERRED_CONTACT.map((option) => (
                <option key={option} value={option}>
                  {option === "email" ? "Email" : option === "phone" ? "Phone" : "WhatsApp"}
                </option>
              ))}
            </select>
          )}
        </Field>

        <Field label="Budget">
          {(id, describedBy) => (
            <select id={id} name="budget_range" aria-describedby={describedBy} className={FIELD}>
              <option value="">Prefer not to say</option>
              {BUDGET_RANGES.map((range) => (
                <option key={range} value={range}>
                  {range}
                </option>
              ))}
            </select>
          )}
        </Field>

        <Field label="Timeline">
          {(id, describedBy) => (
            <select id={id} name="timeline" aria-describedby={describedBy} className={FIELD}>
              <option value="">Not decided</option>
              {TIMELINES.map((timeline) => (
                <option key={timeline} value={timeline}>
                  {timeline}
                </option>
              ))}
            </select>
          )}
        </Field>
      </div>

      <Field
        label="Tell us about the project"
        required
        hint="What you are building, who it is for, and anything already decided."
        error={state.fieldErrors?.description}
      >
        {(id, describedBy) => (
          <textarea
            id={id}
            name="description"
            rows={6}
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
            required
            className="mt-0.5 size-4 shrink-0 rounded-sm border-border-strong text-accent focus:ring-2 focus:ring-accent/20"
          />
          <span>{CONSENT_TEXT}</span>
        </label>
        {state.fieldErrors?.consent_given ? (
          <p className="mt-2 text-sm text-danger">
            {state.fieldErrors.consent_given}
          </p>
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
            "Send enquiry"
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

