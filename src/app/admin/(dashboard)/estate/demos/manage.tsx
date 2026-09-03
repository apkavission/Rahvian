"use client";

import { useActionState, useRef, useState } from "react";
import { Check, Copy, Globe, Link2, Lock, X } from "lucide-react";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { useFormToast } from "@/components/forms/use-form-toast";
import { closeDemoLink, setDemoVisibility, shareDemo } from "@/lib/actions/demo-access";
import { initialRecordState, initialShareState } from "@/lib/validation/records";
import type { DemoVariantRow } from "@/types/control";

/**
 * The three things that can be done on this screen.
 *
 * All of them are forms posting to server actions, and every one of those
 * actions is refused by the database as well if the person is not an owner. The
 * markup here decides what is easy to do, never what is allowed.
 */

/* ========================================================================== */
/* Issuing a link                                                             */
/* ========================================================================== */

/** How long, offered as the lengths anybody actually chooses. */
const LENGTHS = [
  { days: 3, label: "3 days" },
  { days: 7, label: "A week" },
  { days: 14, label: "A fortnight" },
  { days: 30, label: "A month" },
  { days: 90, label: "Three months" },
];

export function ShareForm({ businesses }: { businesses: DemoVariantRow[] }) {
  const [state, action, pending] = useActionState(shareDemo, initialShareState);

  useFormToast(state, {
    successTitle: "Link ready",
    errorTitle: "That link was not made",
  });

  /*
    Which business is chosen decides which demo the link belongs to, so the two
    are one control rather than two that can disagree. The value carries both,
    and the hidden fields below split it apart for the action.
  */
  const [chosen, setChosen] = useState(businesses[0]?.variant_id ?? "");
  const business = businesses.find((b) => b.variant_id === chosen);

  return (
    <form
      action={action}
      className="space-y-5 rounded-2xl border border-border bg-surface p-5"
    >
      <input type="hidden" name="app_key" value={business?.app_key ?? ""} />
      <input type="hidden" name="variant_id" value={business?.variant_id ?? ""} />
      <input type="hidden" name="base_url" value={business?.base_url ?? ""} />

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="font-medium">Which business</span>
          <select
            value={chosen}
            onChange={(event) => setChosen(event.target.value)}
            className="mt-1.5 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
          >
            {businesses.map((option) => (
              <option key={option.variant_id} value={option.variant_id}>
                {option.business_name} — {option.app_name.replace(/ demo$/, "")}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-sm">
          <span className="font-medium">Who it is for</span>
          <input
            name="label"
            required
            maxLength={120}
            placeholder="Northside Dental — Dr Mehta"
            className="mt-1.5 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
          />
          <span className="mt-1 block text-xs text-text-subtle">
            Only you see this. It is how you find the link again to close it.
          </span>
        </label>

        <label className="block text-sm">
          <span className="font-medium">How long it works</span>
          <select
            name="days"
            defaultValue={14}
            className="mt-1.5 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
          >
            {LENGTHS.map((length) => (
              <option key={length.days} value={length.days}>
                {length.label}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-sm">
          <span className="font-medium">
            Limit on openings <span className="font-normal text-text-subtle">optional</span>
          </span>
          <input
            name="max_views"
            type="number"
            min={1}
            max={999}
            placeholder="No limit"
            className="mt-1.5 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
          />
          <span className="mt-1 block text-xs text-text-subtle">
            Discourages forwarding. Several pages read in one sitting count as
            one opening.
          </span>
        </label>
      </div>

      <label className="block text-sm">
        <span className="font-medium">
          Note <span className="font-normal text-text-subtle">optional</span>
        </span>
        <input
          name="note"
          maxLength={200}
          placeholder="Sent after the call on Tuesday"
          className="mt-1.5 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
        />
      </label>

      <button
        type="submit"
        disabled={pending || !business}
        className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-fg transition hover:opacity-90 disabled:opacity-60"
      >
        <Link2 className="size-4" aria-hidden />
        {pending ? "Making it…" : "Make the link"}
      </button>

      {state.status === "error" && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {state.message}
        </p>
      )}

      {state.status === "success" && state.url && (
        <IssuedLink url={state.url} label={state.label ?? ""} />
      )}
    </form>
  );
}

/**
 * The link, shown once.
 *
 * **This is the only moment it exists on a screen.** Nothing re-displays a
 * token afterwards — a list that could would hand over every live demo at once.
 * So this says plainly that it will not be shown again, because somebody who
 * assumes they can come back for it will send nothing and blame the tool.
 */
function IssuedLink({ url, label }: { url: string; label: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-4">
      <p className="text-sm font-medium">The link for {label}</p>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <code className="min-w-0 flex-1 break-all rounded-lg bg-surface px-3 py-2 font-mono text-xs">
          {url}
        </code>

        <button
          type="button"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(url);
              setCopied(true);
              window.setTimeout(() => setCopied(false), 2000);
            } catch {
              /* A browser that refuses the clipboard — an insecure origin, or a
                 denied permission. The address is on screen and selectable, so
                 there is nothing to recover from and nothing to say. */
            }
          }}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-2 text-xs font-medium transition-colors hover:bg-surface-2"
        >
          {copied ? (
            <>
              <Check className="size-3.5" aria-hidden />
              Copied
            </>
          ) : (
            <>
              <Copy className="size-3.5" aria-hidden />
              Copy
            </>
          )}
        </button>
      </div>

      <p className="mt-3 text-xs text-text-muted">
        Copy it now — it is not shown again. The record keeps the label, the
        dates and every opening; it never keeps the address.
      </p>
    </div>
  );
}

/* ========================================================================== */
/* Closing one                                                                */
/* ========================================================================== */

export function CloseLink({
  appKey,
  linkId,
  label,
}: {
  appKey: string;
  linkId: string;
  label: string;
}) {
  const [state, action, pending] = useActionState(closeDemoLink, initialRecordState);
  const form = useRef<HTMLFormElement>(null);
  const confirm = useConfirm();

  useFormToast(state, { successTitle: "Link closed", errorTitle: "Not closed" });

  return (
    <form action={action} ref={form}>
      <input type="hidden" name="app_key" value={appKey} />
      <input type="hidden" name="link_id" value={linkId} />

      {/*
        Asked before it happens.

        Whoever is holding this link loses the demo mid-sentence, is told
        nothing, and cannot be given it back — a new link is a new address. The
        control is a small button in a list of them.
      */}
      <button
        type="button"
        onClick={async () => {
          const yes = await confirm({
            title: `Close the link for ${label}?`,
            body: "It stops working immediately, wherever it was sent. Whoever has it will see the expired screen. You can send a new link, but it will be a different address.",
            confirmLabel: "Close it",
            tone: "danger",
          });
          if (yes) form.current?.requestSubmit();
        }}
        disabled={pending}
        className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs transition-colors hover:bg-surface-2 disabled:opacity-60"
      >
        <X className="size-3.5" aria-hidden />
        Close
      </button>
    </form>
  );
}

/* ========================================================================== */
/* Opening a business to the world                                            */
/* ========================================================================== */

/**
 * The switch that decides whether links matter at all.
 *
 * Both directions ask first, and they ask different questions. Opening one is
 * the dangerous direction — it makes every link to that business beside the
 * point — so the confirmation says what it costs. Closing one is the safe
 * direction, but it takes a page away from anybody reading it right now, which
 * is worth a sentence too.
 */
export function VisibilitySwitch({
  appKey,
  variantId,
  name,
  isPublic,
}: {
  appKey: string;
  variantId: string;
  name: string;
  isPublic: boolean;
}) {
  const [state, action, pending] = useActionState(setDemoVisibility, initialRecordState);
  const form = useRef<HTMLFormElement>(null);
  const confirm = useConfirm();

  useFormToast(state, {
    successTitle: isPublic ? "Closed" : "Open to anybody",
    errorTitle: "Not changed",
  });

  return (
    <form action={action} ref={form} className="mt-3">
      <input type="hidden" name="app_key" value={appKey} />
      <input type="hidden" name="variant_id" value={variantId} />
      <input type="hidden" name="open" value={isPublic ? "no" : "yes"} />

      <button
        type="button"
        onClick={async () => {
          const yes = isPublic
            ? await confirm({
                title: `Close ${name}?`,
                body: "Only a live link will open it. Anybody reading it right now without one is sent to the expired screen.",
                confirmLabel: "Close it",
                /* The safe direction. The dialog's default tone is danger, and
                   painting "make this more private" in red teaches people to
                   ignore red. */
                tone: "warning",
              })
            : await confirm({
                title: `Open ${name} to anybody?`,
                body: "The address alone will open it, for anybody who has it or finds it — including a competitor a prospect forwards it to. Every share link for this business becomes beside the point while it is open.",
                confirmLabel: "Open it to everybody",
                tone: "danger",
              });

          if (yes) form.current?.requestSubmit();
        }}
        disabled={pending}
        className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs transition-colors hover:bg-surface-2 disabled:opacity-60"
      >
        {isPublic ? (
          <>
            <Lock className="size-3.5" aria-hidden />
            Close to links only
          </>
        ) : (
          <>
            <Globe className="size-3.5" aria-hidden />
            Open to anybody
          </>
        )}
      </button>
    </form>
  );
}
