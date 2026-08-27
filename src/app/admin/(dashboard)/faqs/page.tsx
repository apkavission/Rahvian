import type { Metadata } from "next";
import Link from "next/link";
import { PreviewPane } from "@/components/admin/preview-pane";
import { requireStaff } from "@/lib/auth/session";
import { faqScopeOptions, getAdminFaqs } from "@/lib/queries/faqs-admin";
import { faqToValues } from "@/lib/records/faqs";
import { cn } from "@/lib/utils";
import { FaqEditor } from "./faq-editor";
import { FaqList } from "./faq-list";
import { NewFaqForm } from "./new-faq-form";

export const metadata: Metadata = {
  title: "FAQs",
  robots: { index: false, follow: false, nocache: true },
};

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/**
 * The FAQ screen.
 *
 * The same three columns as every other content list, with one thing on top of
 * them that no other screen needs: a filter by page.
 *
 * It is there because `faqs.sort_order` is a single number across every page,
 * while the order that matters is the order *within* a page. Listing all
 * fourteen questions at once would mean the arrows swapping a pricing question
 * with a contact one — two rows that never appear together, so the arrows would
 * look broken on both pages. Filtered to one page, every arrow moves something
 * the person can see move.
 *
 * A question can belong to several pages, so it appears under each of them.
 * That is the feature, not a duplicate: one honest answer about code ownership
 * belongs on three pages, and three copies of it would drift apart.
 */
export default async function FaqsScreen({ searchParams }: Props) {
  await requireStaff();

  const query = await searchParams;

  const [faqs, scopes] = await Promise.all([getAdminFaqs(), faqScopeOptions()]);

  const requestedScope = typeof query.scope === "string" ? query.scope : null;
  const scope =
    requestedScope === ""
      ? ""
      : (scopes.find((option) => option.value === requestedScope)?.value ??
        scopes[0]?.value ??
        "");

  const scopeLabels = Object.fromEntries(scopes.map((option) => [option.value, option.label]));
  const scopeLabel = scope ? (scopeLabels[scope] ?? scope) : null;

  const shown = scope ? faqs.filter((faq) => (faq.scope ?? []).includes(scope)) : faqs;

  const requested = typeof query.faq === "string" ? query.faq : null;
  const selected =
    shown.find((faq) => faq.id === requested) ?? shown[0] ?? null;

  return (
    <div className="mx-auto w-full max-w-7xl">
      <header>
        <h1 className="font-display text-2xl font-semibold">FAQs</h1>
        <p className="measure mt-2 text-sm leading-relaxed text-text-muted">
          The questions people actually ask, answered before they have to ask
          them. One question can serve several pages — edit the answer once and
          every page that carries it changes, which is the whole reason this is
          a list rather than copy typed into each page.
        </p>
      </header>

      {/*
        The page filter.

        Links rather than a dropdown: the counts are worth seeing all at once,
        and a filter in the address bar is one someone can send. It scrolls
        sideways on a phone rather than wrapping into four rows of pills.
      */}
      <nav aria-label="Filter by page" className="mt-7 -mx-1 overflow-x-auto px-1 pb-1">
        <ul className="flex w-max gap-2">
          {scopes.map((option) => {
            const count = faqs.filter((faq) => (faq.scope ?? []).includes(option.value)).length;
            return (
              <ScopePill
                key={option.value}
                href={`/admin/faqs?scope=${encodeURIComponent(option.value)}`}
                label={option.label}
                count={count}
                active={scope === option.value}
              />
            );
          })}
          <ScopePill
            href="/admin/faqs?scope="
            label="All questions"
            count={faqs.length}
            active={scope === ""}
          />
        </ul>
      </nav>

      <div className="mt-8 grid gap-8 xl:grid-cols-[17rem_minmax(0,1fr)_minmax(0,1fr)]">
        <div className="xl:sticky xl:top-24 xl:self-start">
          <h2 className="font-mono text-[0.65rem] uppercase tracking-[0.16em] text-text-subtle">
            {scope ? "In the order asked" : "Every question"}
          </h2>
          <div className="mt-3">
            <FaqList
              faqs={shown.map((faq) => ({
                id: faq.id,
                question: faq.question,
                scope: faq.scope ?? [],
                is_active: faq.is_active,
              }))}
              scope={scope}
              scopeLabels={scopeLabels}
              selectedId={selected?.id ?? null}
            />
            <NewFaqForm scope={scope} scopeLabel={scopeLabel} />
          </div>
        </div>

        <div className="min-w-0">
          {selected ? (
            <div className="surface-raised rounded-2xl border border-border p-6">
              {/*
                Keyed on the question, so selecting another one remounts the
                form. Without it React would reuse the component and keep the
                first question's words in state — the editor would show one
                answer under another's question.
              */}
              <FaqEditor
                key={selected.id}
                id={selected.id}
                values={faqToValues(selected)}
                scopes={scopes}
              />
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-border bg-surface-2/40 p-8">
              <h2 className="font-display text-lg font-semibold">
                {scope ? `Nothing on the ${scopeLabel?.toLowerCase()} yet` : "No questions yet"}
              </h2>
              <p className="measure mt-3 text-sm leading-relaxed text-text-muted">
                Add one on the left and it will open here. New questions start
                hidden, so nothing half-answered reaches the site.
              </p>
            </div>
          )}
        </div>

        {/*
          The preview, beside the form rather than behind a link.

          It shows the accordion for the page being filtered to, because a
          question is read in sequence with the ones around it — the second
          answer is written differently if the first one already covered half
          of it.
        */}
        <div className="min-w-0 xl:sticky xl:top-24 xl:self-start">
          <PreviewPane
            path={`/admin/preview/faqs?scope=${encodeURIComponent(scope)}${
              selected ? `&faq=${selected.id}` : ""
            }`}
            note="The accordion as visitors see it. Hidden questions are listed underneath, where they are not."
          />
        </div>
      </div>
    </div>
  );
}

function ScopePill({
  href,
  label,
  count,
  active,
}: {
  href: string;
  label: string;
  count: number;
  active: boolean;
}) {
  return (
    <li>
      <Link
        href={href}
        aria-current={active ? "page" : undefined}
        className={cn(
          "inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm transition-colors",
          active
            ? "border-accent bg-accent-soft text-text"
            : "border-border bg-surface text-text-muted hover:border-border-strong hover:text-text",
        )}
      >
        {label}
        <span
          className={cn(
            "font-mono text-[0.65rem]",
            count === 0 ? "text-text-subtle" : "text-text-muted",
          )}
        >
          {count}
        </span>
      </Link>
    </li>
  );
}
