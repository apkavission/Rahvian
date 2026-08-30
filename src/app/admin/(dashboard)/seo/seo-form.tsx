"use client";

import { useActionState, useRef, useState } from "react";
import { Globe, Lock } from "lucide-react";
import { BrandSpinner } from "@/components/brand/brand-loader";
import { useBusyWhile } from "@/components/forms/use-busy-while";
import { useFormToast } from "@/components/forms/use-form-toast";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { Field, FIELD } from "@/components/ui/field";
import { saveSeoDefaults } from "@/lib/actions/seo";
import {
  applyTitleTemplate,
  DESCRIPTION_TARGET,
  initialSeoState,
  TITLE_TARGET,
} from "@/lib/validation/seo";
import { cn } from "@/lib/utils";

export interface SeoFormValues {
  title_template: string;
  default_title: string;
  default_description: string;
  google_verification: string;
  bing_verification: string;
  organization_schema: string;
  site_noindex: boolean;
}

/**
 * The SEO form.
 *
 * One form and one save, the same decision the settings screen made: these
 * fields are written in one sitting, and separate save buttons are separate
 * chances to leave half a change behind.
 *
 * Two things here are not on the settings screen.
 *
 * **The three title and description fields are controlled**, where every other
 * field on this panel is uncontrolled. They have to be, because the preview
 * underneath them claims to show what a search result will look like — and a
 * preview that only updates on save is not a preview, it is a record. The
 * length counts are live for the same reason: the moment a title stops fitting
 * is while it is being typed.
 *
 * **The crawl switch asks before it saves.** Not because it is destructive —
 * it is one boolean and it flips back — but because it is the only control in
 * the admin whose effect is on somebody else's system. Opening the site starts
 * an indexing process nobody here can call back; closing it takes down every
 * page that has been indexed. A change that reaches outside deserves a
 * sentence saying so first.
 */
export function SeoForm({ values }: { values: SeoFormValues }) {
  const [state, formAction, pending] = useActionState(saveSeoDefaults, initialSeoState);
  const form = useRef<HTMLFormElement>(null);
  const confirm = useConfirm();

  const [template, setTemplate] = useState(values.title_template);
  const [title, setTitle] = useState(values.default_title);
  const [description, setDescription] = useState(values.default_description);
  const [noindex, setNoindex] = useState(values.site_noindex);

  /*
    Controlled, so a refused save does not wipe what was typed.

    These three were uncontrolled — `defaultValue` on a real input — and React
    resets an uncontrolled field once a form action completes. So a save that
    came back with "paste only the content value, not the whole meta tag" left
    the field **empty**: the message told you to fix something you could no
    longer see. Found in a browser click-through on 2026-08-28.

    The three fields above were already controlled, for the live preview —
    which is why they survived a refusal and these did not. One form behaving
    two ways is the kind of difference nobody notices until it costs somebody
    their typing.
  */
  const [google, setGoogle] = useState(values.google_verification);
  const [bing, setBing] = useState(values.bing_verification);
  const [override, setOverride] = useState(values.organization_schema);

  useBusyWhile(pending, "Saving the SEO settings");
  useFormToast(state, { successTitle: "SEO settings saved", errorTitle: "Could not save" });

  const crawlChanged = noindex !== values.site_noindex;

  /** Only ever called when the crawl switch has actually been changed. */
  async function confirmThenSave() {
    const yes = await confirm(
      noindex
        ? {
            title: "Close the site to search engines?",
            tone: "warning",
            body: "Every page will be marked noindex and robots.txt will refuse the whole site. Pages already in Google will be dropped over the following days, and getting them back afterwards takes weeks rather than minutes.",
            confirmLabel: "Close the site",
          }
        : {
            title: "Open the site to search engines?",
            tone: "warning",
            body: "Google and Bing will be told they may index every published page, and the sitemap will start listing them. Check the pages read the way you want them to first — an indexed page is public in a way that is hard to take back.",
            confirmLabel: "Open the site",
          },
    );

    if (yes) form.current?.requestSubmit();
  }

  return (
    <form action={formAction} ref={form} className="space-y-10" noValidate>
      <Section
        title="How pages are titled"
        description="Every public page runs its own title through this template. A page that has no title of its own — and the home page, which opts out on purpose — uses the fallback instead."
      >
        <Field
          label="Title template"
          required
          hint="%s is where the page's own title goes. Everything around it is added to every tab on the site."
          error={state.fieldErrors?.title_template}
        >
          {(id, describedBy) => (
            <input
              id={id}
              name="title_template"
              value={template}
              onChange={(event) => setTemplate(event.target.value)}
              required
              aria-describedby={describedBy}
              className={cn(FIELD, "font-mono text-[0.8rem]")}
            />
          )}
        </Field>

        <Field
          label="Fallback title"
          required
          error={state.fieldErrors?.default_title}
        >
          {(id, describedBy) => (
            <>
              <input
                id={id}
                name="default_title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                required
                aria-describedby={describedBy}
                className={FIELD}
              />
              <Count value={title.length} target={TITLE_TARGET} noun="title" />
            </>
          )}
        </Field>

        <Field
          label="Fallback description"
          required
          hint="The sentence under the link in a search result. Written to be read by a person deciding whether to click, not stuffed with words."
          error={state.fieldErrors?.default_description}
        >
          {(id, describedBy) => (
            <>
              <textarea
                id={id}
                name="default_description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                required
                rows={3}
                aria-describedby={describedBy}
                className={cn(FIELD, "resize-y")}
              />
              <Count
                value={description.length}
                target={DESCRIPTION_TARGET}
                noun="description"
              />
            </>
          )}
        </Field>

        <SearchPreview template={template} title={title} description={description} />
      </Section>

      <Section
        title="Crawling"
        description="One switch, and both the meta tags and robots.txt follow it. Two layers saying the same thing: the tag stops a page that has been fetched from being indexed, robots.txt stops it being fetched at all."
      >
        <CrawlSwitch value={noindex} onChange={setNoindex} changed={crawlChanged} />
      </Section>

      <Section
        title="Verification"
        description="The codes Google Search Console and Bing Webmaster Tools give you to prove the site is yours. Paste only the content value, not the whole meta tag."
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <Field
            label="Google verification"
            error={state.fieldErrors?.google_verification}
          >
            {(id, describedBy) => (
              <input
                id={id}
                name="google_verification"
                value={google}
                onChange={(event) => setGoogle(event.target.value)}
                aria-describedby={describedBy}
                className={cn(FIELD, "font-mono text-[0.8rem]")}
              />
            )}
          </Field>

          <Field label="Bing verification" error={state.fieldErrors?.bing_verification}>
            {(id, describedBy) => (
              <input
                id={id}
                name="bing_verification"
                value={bing}
                onChange={(event) => setBing(event.target.value)}
                aria-describedby={describedBy}
                className={cn(FIELD, "font-mono text-[0.8rem]")}
              />
            )}
          </Field>
        </div>
      </Section>

      <Section
        title="Organization data"
        description="The block of structured data that tells search engines who the company is. Leave it empty and it is built from the settings screen — the name, the address, the phone number, the social profiles, the CIN and the GST — which is what should happen unless there is a specific reason otherwise."
      >
        <Field
          label="Override"
          hint="JSON, and it replaces the generated block completely rather than adding to it. Anything filled in on the settings screen afterwards will not appear here until this box is emptied again."
          error={state.fieldErrors?.organization_schema}
        >
          {(id, describedBy) => (
            <textarea
              id={id}
              name="organization_schema"
              value={override}
              onChange={(event) => setOverride(event.target.value)}
              rows={8}
              spellCheck={false}
              placeholder="Leave empty to use the generated block"
              aria-describedby={describedBy}
              className={cn(FIELD, "resize-y font-mono text-[0.8rem]")}
            />
          )}
        </Field>
      </Section>

      {/* Sticks to the bottom: this form is longer than a screen, and a save
          button reachable only by scrolling back up is how an edit gets
          abandoned half-made. */}
      <div className="sticky bottom-0 -mx-4 border-t border-border bg-surface/90 px-4 py-4 backdrop-blur-md sm:-mx-6 sm:px-6">
        <div className="flex flex-wrap items-center gap-4">
          {/*
            A submit button until the crawl switch has been touched, and only
            then a plain one.

            It has to stop being a submit button to ask the question, because an
            async handler on submit cannot hold a submission back once it has
            started. But a form with no submit button in it also has no
            implicit submission — Enter in a text field would do nothing — and
            paying that on every ordinary edit to guard a switch that was not
            touched is the wrong trade. Enter still saves the copy; the one
            state where it does not is the one where the answer should be
            deliberate anyway.
          */}
          <Button
            type={crawlChanged ? "button" : "submit"}
            onClick={crawlChanged ? confirmThenSave : undefined}
            disabled={pending}
          >
            {pending ? (
              <>
                <BrandSpinner />
                Saving
              </>
            ) : (
              "Save SEO settings"
            )}
          </Button>

          {crawlChanged && !pending ? (
            <p className="text-sm text-text-muted">
              {noindex
                ? "This will close the site to search engines."
                : "This will open the site to search engines."}
            </p>
          ) : null}

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

// ---------------------------------------------------------------------------

/**
 * The crawl switch, drawn as two choices rather than as a checkbox.
 *
 * A checkbox labelled "site noindex" asks the person to hold a negative in
 * their head and answer it backwards, on the one control where being wrong is
 * expensive in both directions. Two cards that each say what happens are more
 * space and no ambiguity.
 *
 * The posted field is still a checkbox, hidden, because that is the encoding
 * the schema reads: present means ticked.
 */
function CrawlSwitch({
  value,
  onChange,
  changed,
}: {
  /** True while the site is closed — the column is `site_noindex`. */
  value: boolean;
  onChange: (next: boolean) => void;
  changed: boolean;
}) {
  return (
    <div>
      {/*
        Posted only when the site is closed, which is the encoding a checkbox
        would have produced and the one the schema reads: present means ticked.
        A hidden text input rather than a hidden checkbox, because a checkbox
        with a `checked` prop and no `onChange` is a React warning waiting to
        be silenced with a prop that does nothing.
      */}
      {value ? <input type="hidden" name="site_noindex" value="on" /> : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <CrawlChoice
          selected={!value}
          onSelect={() => onChange(false)}
          icon={<Globe className="size-4" aria-hidden />}
          title="Open"
          body="Search engines may index every published page. robots.txt allows crawling and names the sitemap."
        />
        <CrawlChoice
          selected={value}
          onSelect={() => onChange(true)}
          icon={<Lock className="size-4" aria-hidden />}
          title="Closed"
          body="Every page is marked noindex, robots.txt refuses the whole site, and the sitemap lists nothing. The right state before launch."
        />
      </div>

      {changed ? (
        <p className="mt-3 text-sm text-text-muted">
          Not saved yet — the change applies when you save, and you will be asked
          to confirm it first.
        </p>
      ) : null}
    </div>
  );
}

function CrawlChoice({
  selected,
  onSelect,
  icon,
  title,
  body,
}: {
  selected: boolean;
  onSelect: () => void;
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={cn(
        "rounded-xl border p-4 text-left transition-colors",
        selected
          ? "border-accent bg-accent-soft/40"
          : "border-border bg-surface hover:border-border-strong",
      )}
    >
      <span className="flex items-center gap-2 text-sm font-medium">
        {icon}
        {title}
      </span>
      <span className="mt-1.5 block text-xs leading-relaxed text-text-muted">{body}</span>
    </button>
  );
}

/**
 * The search result, as it is being typed.
 *
 * The title goes through `applyTitleTemplate` — the same function
 * `buildMetadata` uses — rather than through a second copy of the rule, so
 * this cannot show something the site will not render. The example page title
 * is a real one from the site.
 *
 * Truncation is left to CSS rather than counted out in characters, because
 * Google truncates on pixel width and a character count dressed up as an exact
 * cut-off would be a confident lie. The counts above say the same thing
 * honestly.
 */
function SearchPreview({
  template,
  title,
  description,
}: {
  template: string;
  title: string;
  description: string;
}) {
  const example = applyTitleTemplate(template, "Web Development");

  return (
    <div className="rounded-xl border border-border bg-surface-2/40 p-5">
      <h3 className="font-mono text-[0.65rem] uppercase tracking-[0.16em] text-text-subtle">
        Roughly how a result reads
      </h3>

      <div className="mt-4 space-y-5">
        <Result
          label="A page with its own title — the web development service"
          heading={example}
          description={description}
        />
        <Result
          label="A page with no title of its own — the fallback"
          heading={title}
          description={description}
        />
      </div>
    </div>
  );
}

function Result({
  label,
  heading,
  description,
}: {
  label: string;
  heading: string;
  description: string;
}) {
  return (
    <div className="min-w-0">
      <p className="text-xs text-text-subtle">{label}</p>
      <p className="mt-2 truncate text-base text-accent">{heading || "—"}</p>
      <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-text-muted">
        {description || "—"}
      </p>
    </div>
  );
}

/**
 * How long it is, against what usually fits.
 *
 * Amber rather than an error, and the field still saves. Google truncates on
 * pixel width, so the number is a guide — and a title of 62 words that earn
 * their place beats one of 60 that were counted into shape.
 */
function Count({
  value,
  target,
  noun,
}: {
  value: number;
  target: number;
  noun: string;
}) {
  const over = value > target;

  return (
    <p
      className={cn(
        "mt-1.5 font-mono text-[0.65rem]",
        over ? "text-warning" : "text-text-subtle",
      )}
    >
      {value} / {target}
      {over ? ` — longer than usually fits; the end of the ${noun} may be cut` : ""}
    </p>
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
