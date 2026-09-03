"use client";

import { useActionState, useState } from "react";
import { FileText } from "lucide-react";
import { BrandSpinner } from "@/components/brand/brand-loader";
import { FIELD, LABEL } from "@/components/ui/field";
import { issueStaffDocument } from "@/lib/actions/portal-staff";
import type { StaffDocumentKind, StaffDocumentRow } from "@/types/control";
import { cn } from "@/lib/utils";

/**
 * Somebody's papers, issued from the one place people are managed.
 *
 * ---------------------------------------------------------------------------
 * **Here rather than in the portal**, because this is where staff are managed —
 * the portal's own team screen was removed on 2026-08-31 precisely so there
 * would be one place. An offer letter and a salary slip are about a person, so
 * they belong beside the person.
 *
 * **The form asks only for what the chosen kind needs.** A salary slip wants a
 * month and an amount; an offer letter wants neither, and showing it two empty
 * required-looking boxes is how a form teaches people to ignore it. Which
 * fields appear is read off the kind's own row — so a kind added next month
 * asks for the right things without this file changing.
 *
 * **The refusal, when one comes, is the database's own sentence.** "Salary slip
 * covers a period, so it needs a start and an end" is what somebody needs to
 * read; a generic "could not save" sends them looking for a fault that is not
 * there.
 */
export function StaffDocuments({
  staffId,
  name,
  kinds,
  issued,
}: {
  staffId: string;
  name: string;
  kinds: StaffDocumentKind[];
  issued: StaffDocumentRow[];
}) {
  const [state, action, pending] = useActionState(issueStaffDocument, {
    status: "idle" as const,
    message: "",
  });

  const [kindKey, setKindKey] = useState(kinds[0]?.key ?? "");
  const kind = kinds.find((option) => option.key === kindKey);

  if (kinds.length === 0) {
    return (
      <section className="surface-raised rounded-2xl border border-border p-6">
        <h3 className="font-display text-base font-semibold">Documents</h3>
        <p className="mt-2 text-sm text-text-subtle">
          No kinds of document are set up yet.
        </p>
      </section>
    );
  }

  return (
    <section className="surface-raised rounded-2xl border border-border p-6">
      <h3 className="flex items-center gap-2 font-display text-base font-semibold">
        <FileText className="size-4 text-text-subtle" aria-hidden />
        Documents
      </h3>
      <p className="measure mt-2 text-sm leading-relaxed text-text-subtle">
        Offer letters and salary slips for {name}. They appear in the tracker
        under Documents — nobody else can see them, and neither can another
        member of staff.
      </p>

      {issued.length > 0 && (
        <ul className="mt-5 divide-y divide-border rounded-xl border border-border">
          {issued.map((document) => (
            <li key={document.id} className="p-3 text-sm">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className="font-medium">{document.title}</span>
                <span className="text-text-subtle">{document.kind_label}</span>
                {document.amount && (
                  <span className="tabular-nums">
                    ₹{Number(document.amount).toLocaleString("en-IN")}
                  </span>
                )}
              </div>

              {/* The proof, on anything that evidences a payment. A slip that
                  claims a payment with nothing behind it is worth less than no
                  slip, because it looks like a record. */}
              {document.paid_on && (
                <p className="mt-0.5 text-xs text-text-subtle">
                  Paid {document.paid_on}
                  {document.paid_method ? ` · ${document.paid_method}` : ""}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}

      <form action={action} className="mt-5 space-y-4">
        <input type="hidden" name="staff_id" value={staffId} />

        <div className="grid gap-4 sm:grid-cols-[minmax(0,14rem)_1fr]">
          <div>
            <label htmlFor="doc-kind" className={LABEL}>
              What
            </label>
            <select
              id="doc-kind"
              name="kind_key"
              value={kindKey}
              onChange={(event) => setKindKey(event.target.value)}
              className={cn(FIELD, "mt-1.5")}
            >
              {kinds.map((option) => (
                <option key={option.key} value={option.key}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="doc-title" className={LABEL}>
              Title
            </label>
            <input
              id="doc-title"
              name="title"
              maxLength={200}
              required
              placeholder="Salary — August 2026"
              className={cn(FIELD, "mt-1.5")}
            />
          </div>
        </div>

        {/* Only for kinds that carry one. Rendered rather than disabled: a
            greyed-out amount box on an offer letter invites somebody to wonder
            what they are missing. */}
        {kind?.needs_amount && (
          <div>
            <label htmlFor="doc-amount" className={LABEL}>
              Amount
            </label>
            <input
              id="doc-amount"
              name="amount"
              type="number"
              min={1}
              /* Money is not a multiple of anything. A round `step` makes the
                 browser silently refuse ₹50,000 and explain it in a tooltip
                 nobody reads — found on the payment form, 2026-08-30. */
              step="any"
              required
              inputMode="decimal"
              className={cn(FIELD, "mt-1.5")}
            />
          </div>
        )}

        {kind?.needs_period && (
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="doc-from" className={LABEL}>
                Period from
              </label>
              <input
                id="doc-from"
                name="period_start"
                type="date"
                required
                className={cn(FIELD, "mt-1.5")}
              />
            </div>
            <div>
              <label htmlFor="doc-to" className={LABEL}>
                Period to
              </label>
              <input
                id="doc-to"
                name="period_end"
                type="date"
                required
                className={cn(FIELD, "mt-1.5")}
              />
            </div>
          </div>
        )}

        {/*
          Proof of payment, for anything that is a payment.

          `payments` could not carry this — every row there hangs off a project,
          and a salary has no project — so the slip is the record. Cash has no
          screenshot, which is why none of this is required: refusing the row
          would push that payment out of the system entirely.
        */}
        {kind?.needs_amount && (
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="doc-paid" className={LABEL}>
                Paid on
              </label>
              <input
                id="doc-paid"
                name="paid_on"
                type="date"
                className={cn(FIELD, "mt-1.5")}
              />
            </div>
            <div>
              <label htmlFor="doc-method" className={LABEL}>
                How, and the reference
              </label>
              <input
                id="doc-method"
                name="paid_method"
                maxLength={120}
                placeholder="Bank transfer · UTR 44219"
                className={cn(FIELD, "mt-1.5")}
              />
            </div>
          </div>
        )}

        <div>
          <label htmlFor="doc-note" className={LABEL}>
            Note
          </label>
          <textarea
            id="doc-note"
            name="note"
            rows={2}
            maxLength={2000}
            className={cn(FIELD, "mt-1.5")}
          />
        </div>

        {state.status !== "idle" && state.message && (
          <p
            role={state.status === "error" ? "alert" : "status"}
            className={cn(
              "text-sm",
              state.status === "error" ? "text-danger" : "text-success",
            )}
          >
            {state.message}
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-accent-fg transition-colors hover:bg-accent-hover disabled:opacity-60"
        >
          {pending ? (
            <>
              <BrandSpinner />
              Issuing
            </>
          ) : (
            "Issue it"
          )}
        </button>
      </form>
    </section>
  );
}
