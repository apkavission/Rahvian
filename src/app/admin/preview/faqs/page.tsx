import type { Metadata } from "next";
import { FaqList } from "@/components/sections/faq-list";
import { requireMenu } from "@/lib/auth/session";
import { faqScopeOptions, getAdminFaqs } from "@/lib/queries/faqs-admin";

export const metadata: Metadata = {
  title: "FAQ preview",
  robots: { index: false, follow: false, nocache: true },
};

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/**
 * One page's questions as visitors meet them, plus the ones they do not.
 *
 * The same `FaqList` the public section renders, so the accordion behaves here
 * exactly as it behaves on the site — one panel open at a time, the first one
 * open on arrival. A still mock-up of it would hide the thing most worth
 * checking, which is how the answers read in sequence.
 *
 * Hidden questions are listed underneath rather than mixed into the accordion.
 * Folding them in would misrepresent the page; leaving them out entirely would
 * hide the draft the person is in the middle of writing. Below the line, marked,
 * is the honest place for them.
 *
 * Read uncached as the signed-in user, which is what makes a hidden question
 * visible at all — the public query filters them out by policy.
 *
 * It sits outside the `(dashboard)` group so the admin chrome does not wrap it.
 */
export default async function FaqPreview({ searchParams }: Props) {
  await requireMenu("faqs");

  const query = await searchParams;
  const scope = typeof query.scope === "string" ? query.scope : "";

  const [faqs, scopes] = await Promise.all([getAdminFaqs(), faqScopeOptions()]);

  const label = scopes.find((option) => option.value === scope)?.label ?? scope;

  const forScope = scope ? faqs.filter((faq) => (faq.scope ?? []).includes(scope)) : faqs;
  const live = forScope.filter((faq) => faq.is_active);
  const hidden = forScope.filter((faq) => !faq.is_active);

  return (
    <div className="min-h-dvh bg-bg">
      <div className="border-b border-border bg-surface-2 px-4 py-2">
        <p className="font-mono text-[0.65rem] uppercase tracking-[0.14em] text-text-subtle">
          Preview · {scope ? label : "every question"} · {live.length} shown
          {hidden.length > 0 ? ` · ${hidden.length} hidden` : ""}
        </p>
      </div>

      <div className="mx-auto max-w-3xl px-5 py-10 sm:px-8">
        {live.length > 0 ? (
          <FaqList items={live.map(({ id, question, answer }) => ({ id, question, answer }))} />
        ) : (
          <p className="text-sm leading-relaxed text-text-muted">
            Nothing is shown on this page. The FAQ section renders nothing at
            all rather than an empty heading, so the page simply does not carry
            one.
          </p>
        )}

        {hidden.length > 0 && (
          <section className="mt-14 border-t border-dashed border-border pt-8">
            <h2 className="font-mono text-[0.65rem] uppercase tracking-[0.16em] text-text-subtle">
              Hidden — not on the site
            </h2>
            <ul className="mt-5 space-y-5">
              {hidden.map((faq) => (
                <li key={faq.id} className="rounded-xl border border-border bg-surface-2/50 p-5">
                  <h3 className="font-display text-base font-medium text-text-muted">
                    {faq.question}
                  </h3>
                  <p className="measure mt-2 text-sm leading-relaxed text-text-subtle">
                    {faq.answer}
                  </p>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}
