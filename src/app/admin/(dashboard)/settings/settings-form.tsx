"use client";

import { useActionState, useState } from "react";
import { BrandSpinner } from "@/components/brand/brand-loader";
import { useBusyWhile } from "@/components/forms/use-busy-while";
import { useFormToast } from "@/components/forms/use-form-toast";
import { MediaPicker } from "@/components/admin/media-picker";
import { Button } from "@/components/ui/button";
import { Field, FIELD } from "@/components/ui/field";
import { IMAGE_FIELDS, type MediaOption } from "@/lib/media/image-fields";
import { saveSettings } from "@/lib/actions/settings";
import {
  initialSettingsState,
  SOCIAL_FIELDS,
  type SocialField,
} from "@/lib/validation/settings";

export interface SettingsFormValues {
  company_name: string;
  legal_name: string;
  tagline: string;
  email: string;
  phone: string;
  whatsapp: string;
  address_line1: string;
  address_line2: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  cin: string;
  gst: string;
  logo_light_id: string;
  logo_dark_id: string;
  social: Record<string, string>;
}

/**
 * The settings form.
 *
 * One form rather than a screen of separately-saving cards. These fields are
 * edited together — an owner filling in contact details fills in all of them
 * in one sitting — and six independent save buttons is six chances to leave
 * half the change behind.
 *
 * Outcome goes through the shared toast, the same component the public forms
 * use, so success reads identically everywhere. Field errors stay beside their
 * fields, where they can be acted on.
 */
export function SettingsForm({
  values,
  assets,
}: {
  values: SettingsFormValues;
  assets: MediaOption[];
}) {
  const [state, formAction, pending] = useActionState(
    saveSettings,
    initialSettingsState,
  );

  useBusyWhile(pending, "Saving settings");
  useFormToast(state, {
    successTitle: "Settings saved",
    errorTitle: "Could not save",
  });

  return (
    <form action={formAction} className="space-y-10" noValidate>
      <Section
        title="Identity"
        description="The public brand and the registered company are separate on purpose — the footer and the legal pages name the entity, everything else names the brand."
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Brand name" required error={state.fieldErrors?.company_name}>
            {(id, describedBy) => (
              <input
                id={id}
                name="company_name"
                defaultValue={values.company_name}
                required
                aria-describedby={describedBy}
                className={FIELD}
              />
            )}
          </Field>

          <Field
            label="Registered company name"
            required
            error={state.fieldErrors?.legal_name}
          >
            {(id, describedBy) => (
              <input
                id={id}
                name="legal_name"
                defaultValue={values.legal_name}
                required
                aria-describedby={describedBy}
                className={FIELD}
              />
            )}
          </Field>
        </div>

        <Field
          label="Tagline"
          hint="One line. Appears in the Organization schema and the email footer."
          error={state.fieldErrors?.tagline}
        >
          {(id, describedBy) => (
            <input
              id={id}
              name="tagline"
              defaultValue={values.tagline}
              aria-describedby={describedBy}
              className={FIELD}
            />
          )}
        </Field>
      </Section>

      <Section
        title="Logo"
        description="The mark in the header, the footer and the transactional emails. Two files rather than one: both are emitted and CSS hides the wrong one, so the right mark is painted in the first frame instead of after a script runs. An SVG is the right answer for both."
      >
        <LogoPicker
          name="logo_light_id"
          spec={IMAGE_FIELDS["settings.logoLight"]}
          assets={assets}
          initial={values.logo_light_id}
          error={state.fieldErrors?.logo_light_id}
        />
        <LogoPicker
          name="logo_dark_id"
          spec={IMAGE_FIELDS["settings.logoDark"]}
          assets={assets}
          initial={values.logo_dark_id}
          error={state.fieldErrors?.logo_dark_id}
        />
      </Section>

      <Section
        title="Contact"
        description="Every one of these is optional, and the public site leaves out whatever is blank rather than printing an empty label. Filling the email in also gives the client acknowledgement a reply-to address."
      >
        <div className="grid gap-5 sm:grid-cols-3">
          <Field label="Email" error={state.fieldErrors?.email}>
            {(id, describedBy) => (
              <input
                id={id}
                name="email"
                type="email"
                inputMode="email"
                defaultValue={values.email}
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
                inputMode="tel"
                defaultValue={values.phone}
                aria-describedby={describedBy}
                className={FIELD}
              />
            )}
          </Field>

          <Field
            label="WhatsApp"
            hint="With country code. Drives the WhatsApp buttons."
            error={state.fieldErrors?.whatsapp}
          >
            {(id, describedBy) => (
              <input
                id={id}
                name="whatsapp"
                type="tel"
                inputMode="tel"
                defaultValue={values.whatsapp}
                aria-describedby={describedBy}
                className={FIELD}
              />
            )}
          </Field>
        </div>
      </Section>

      <Section
        title="Registered address"
        description="Named in the privacy policy and the terms, and emitted in the Organization schema once there is enough of it to be worth emitting."
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Address line 1" error={state.fieldErrors?.address_line1}>
            {(id, describedBy) => (
              <input
                id={id}
                name="address_line1"
                defaultValue={values.address_line1}
                aria-describedby={describedBy}
                className={FIELD}
              />
            )}
          </Field>

          <Field label="Address line 2" error={state.fieldErrors?.address_line2}>
            {(id, describedBy) => (
              <input
                id={id}
                name="address_line2"
                defaultValue={values.address_line2}
                aria-describedby={describedBy}
                className={FIELD}
              />
            )}
          </Field>
        </div>

        <div className="grid gap-5 sm:grid-cols-4">
          <Field label="City" error={state.fieldErrors?.city}>
            {(id, describedBy) => (
              <input
                id={id}
                name="city"
                defaultValue={values.city}
                aria-describedby={describedBy}
                className={FIELD}
              />
            )}
          </Field>

          <Field label="State" error={state.fieldErrors?.state}>
            {(id, describedBy) => (
              <input
                id={id}
                name="state"
                defaultValue={values.state}
                aria-describedby={describedBy}
                className={FIELD}
              />
            )}
          </Field>

          <Field label="PIN code" error={state.fieldErrors?.postal_code}>
            {(id, describedBy) => (
              <input
                id={id}
                name="postal_code"
                inputMode="numeric"
                defaultValue={values.postal_code}
                aria-describedby={describedBy}
                className={FIELD}
              />
            )}
          </Field>

          <Field label="Country" required error={state.fieldErrors?.country}>
            {(id, describedBy) => (
              <input
                id={id}
                name="country"
                defaultValue={values.country}
                required
                aria-describedby={describedBy}
                className={FIELD}
              />
            )}
          </Field>
        </div>
      </Section>

      <Section
        title="Statutory identifiers"
        description="Emitted as identifiers in the Organization schema — the two numbers that actually distinguish one Indian company from another. Leave blank until they exist."
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="CIN" error={state.fieldErrors?.cin}>
            {(id, describedBy) => (
              <input
                id={id}
                name="cin"
                defaultValue={values.cin}
                aria-describedby={describedBy}
                className={FIELD}
              />
            )}
          </Field>

          <Field label="GSTIN" error={state.fieldErrors?.gst}>
            {(id, describedBy) => (
              <input
                id={id}
                name="gst"
                defaultValue={values.gst}
                aria-describedby={describedBy}
                className={FIELD}
              />
            )}
          </Field>
        </div>
      </Section>

      <Section
        title="Social profiles"
        description="Full addresses starting with https://. Only the ones you fill in are shown, and they become the sameAs list search engines use to connect these profiles to the company."
      >
        <div className="grid gap-5 sm:grid-cols-2">
          {SOCIAL_FIELDS.map((platform) => (
            <Field
              key={platform.name}
              label={platform.label}
              error={state.fieldErrors?.[platform.name]}
            >
              {(id, describedBy) => (
                <input
                  id={id}
                  name={platform.name}
                  type="url"
                  inputMode="url"
                  placeholder="https://"
                  defaultValue={values.social[platform.name as SocialField] ?? ""}
                  aria-describedby={describedBy}
                  className={FIELD}
                />
              )}
            </Field>
          ))}
        </div>
      </Section>

      {/* Sticks to the bottom of the viewport: this form is longer than a
          screen, and a save button only reachable by scrolling back up is how
          an edit gets abandoned. */}
      <div className="sticky bottom-0 -mx-4 border-t border-border bg-surface/90 px-4 py-4 backdrop-blur-md sm:-mx-6 sm:px-6">
        <div className="flex items-center gap-4">
          <Button type="submit" disabled={pending}>
            {pending ? (
              <>
                <BrandSpinner />
                Saving
              </>
            ) : (
              "Save settings"
            )}
          </Button>

          {state.status === "error" && !state.fieldErrors ? (
            <p role="alert" className="text-sm text-danger">
              {state.message}
            </p>
          ) : null}
        </div>
      </div>
    </form>
  );
}

/**
 * One logo, chosen from the library and carried into `FormData`.
 *
 * The rest of this form is uncontrolled — `defaultValue` on a real input, and
 * the browser collects it. A picker has no input to be uncontrolled, so its
 * choice is held here and written into a hidden field. Everything visible and
 * every size rule comes from the shared `MediaPicker`, so this control behaves
 * exactly as the nine on the content screens do.
 */
function LogoPicker({
  name,
  spec,
  assets,
  initial,
  error,
}: {
  name: string;
  spec: (typeof IMAGE_FIELDS)[keyof typeof IMAGE_FIELDS];
  assets: MediaOption[];
  initial: string;
  error?: string;
}) {
  const [value, setValue] = useState(initial);

  return (
    <Field label={spec.label} hint={spec.use} error={error}>
      {(id, describedBy) => (
        <>
          <input type="hidden" name={name} value={value} />
          <MediaPicker
            id={id}
            spec={spec}
            assets={assets}
            value={value}
            invalid={Boolean(error)}
            describedBy={describedBy}
            onChange={setValue}
          />
        </>
      )}
    </Field>
  );
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="grid gap-6 lg:grid-cols-[minmax(0,18rem)_1fr] lg:gap-12">
      <div>
        <h2 className="font-display text-base font-semibold">{title}</h2>
        <p className="mt-2 text-sm leading-relaxed text-text-muted">{description}</p>
      </div>
      <div className="space-y-5">{children}</div>
    </section>
  );
}
