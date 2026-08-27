"use client";

import { useState } from "react";
import { Check, Copy, KeyRound } from "lucide-react";

/**
 * A password, shown once, because there is nowhere else for it to be.
 *
 * This only appears when the email did not go out — no SMTP configured, or a
 * refused connection. When the email *did* go out the password is never
 * rendered: it is already where it belongs, and repeating it on a screen in an
 * open-plan office undoes the reason it was generated and mailed in the first
 * place.
 *
 * It says plainly that it cannot be recovered, because it cannot: Supabase
 * stores a hash, and the only way back from a lost password is another reset.
 * A copy button rather than an invitation to retype it — twenty characters
 * transcribed by eye is how a correct password becomes a wrong one.
 */
export function CredentialsNote({
  email,
  password,
  reason,
}: {
  email: string;
  password: string;
  reason: "created" | "reset";
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(password);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard access can be refused outright. The password is on screen and
      // selectable, so there is nothing to recover from and nothing to say.
    }
  }

  return (
    <div className="rounded-xl border border-warning/35 bg-warning-soft p-4">
      <div className="flex items-start gap-3">
        <KeyRound className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">
            {reason === "created"
              ? "The account is ready, but the email did not go out"
              : "The password was reset, but the email did not go out"}
          </p>
          <p className="measure mt-1.5 text-sm leading-relaxed text-text-muted">
            Give it to {email} yourself, and tell them to change it once they are
            in. It is shown here once — nobody, including you, can read it back
            afterwards.
          </p>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <code className="select-all rounded-md border border-border bg-surface px-3 py-2 font-mono text-sm">
              {password}
            </code>
            <button
              type="button"
              onClick={copy}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm transition-colors hover:bg-surface-2"
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
        </div>
      </div>
    </div>
  );
}
