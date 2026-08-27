"use client";

import { useActionState, useRef } from "react";
import { KeyRound, ShieldBan, ShieldCheck } from "lucide-react";
import { BrandSpinner } from "@/components/brand/brand-loader";
import { useBusyWhile } from "@/components/forms/use-busy-while";
import { useFormToast } from "@/components/forms/use-form-toast";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { resetAccountPassword, setAccountActive } from "@/lib/actions/users";
import { initialAccountState } from "@/lib/validation/users";
import { CredentialsNote } from "./credentials-note";

/**
 * The two things you do *to* an account.
 *
 * Kept out of the form on purpose. Blocking somebody and reissuing their
 * password are not fields — they take effect the moment they are pressed,
 * they are the two actions on this screen with consequences outside it, and
 * neither should ever happen as a side effect of saving a corrected surname.
 *
 * Both ask first, through the shared dialog. Blocking because it signs
 * somebody out of everything mid-sentence; resetting because it invalidates
 * the password they are holding whether or not they were expecting it.
 */
export function AccountSecurity({
  id,
  name,
  email,
  isActive,
  isSelf,
}: {
  id: string;
  name: string;
  email: string | null;
  isActive: boolean;
  isSelf: boolean;
}) {
  return (
    <div className="surface-raised rounded-2xl border border-border p-6">
      <h2 className="font-display text-base font-semibold">Access</h2>
      <p className="measure mt-2 text-sm leading-relaxed text-text-muted">
        {isActive
          ? "Blocking ends access everywhere at once — this panel, the tracker, every demo — from their next request. It is never a deletion: their notes, assignments and history stay attached to them."
          : "This account is blocked. It cannot sign in anywhere, and the database refuses its rows even if it somehow did. Everything it has ever been attached to is still there."}
      </p>

      <div className="mt-5 space-y-4">
        <BlockButton id={id} name={name} isActive={isActive} isSelf={isSelf} />
        <ResetButton id={id} name={name} email={email} isSelf={isSelf} />
      </div>
    </div>
  );
}

function BlockButton({
  id,
  name,
  isActive,
  isSelf,
}: {
  id: string;
  name: string;
  isActive: boolean;
  isSelf: boolean;
}) {
  const [state, formAction, pending] = useActionState(
    setAccountActive,
    initialAccountState,
  );
  const form = useRef<HTMLFormElement>(null);
  const confirm = useConfirm();

  useBusyWhile(pending, isActive ? "Blocking the account" : "Restoring access");
  useFormToast(state, {
    successTitle: isActive ? "Blocked" : "Access restored",
    errorTitle: "Could not change it",
  });

  if (isSelf) {
    return (
      <p className="rounded-lg border border-border bg-surface-2/50 px-3.5 py-3 text-sm text-text-muted">
        You cannot block your own account. Somebody has to be able to undo it.
      </p>
    );
  }

  return (
    <form action={formAction} ref={form}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="active" value={isActive ? "false" : "true"} />

      {/*
        `type="button"`, because the question has to be answered before the form
        is submitted rather than after: an async handler on submit cannot hold a
        submission back once it has started.
      */}
      <button
        type="button"
        disabled={pending}
        onClick={async () => {
          const yes = await confirm(
            isActive
              ? {
                  title: `Block ${name || "this account"}?`,
                  body: "They are signed out of everything on their next request, and cannot sign in again until this is undone. Nothing is deleted.",
                  confirmLabel: "Block the account",
                  tone: "danger",
                }
              : {
                  title: `Let ${name || "this account"} back in?`,
                  body: "They will be able to sign in again with the password they already have. If that password may be known to somebody else, reset it as well.",
                  confirmLabel: "Restore access",
                  tone: "warning",
                },
          );
          if (yes) form.current?.requestSubmit();
        }}
        className={
          isActive
            ? "inline-flex items-center gap-2 rounded-lg border border-danger/40 bg-danger-soft px-4 py-2.5 text-sm font-medium text-danger transition-colors hover:brightness-105 disabled:opacity-50"
            : "inline-flex items-center gap-2 rounded-lg border border-border-strong bg-surface px-4 py-2.5 text-sm font-medium transition-colors hover:bg-surface-2 disabled:opacity-50"
        }
      >
        {pending ? (
          <BrandSpinner />
        ) : isActive ? (
          <ShieldBan className="size-4" aria-hidden />
        ) : (
          <ShieldCheck className="size-4" aria-hidden />
        )}
        {isActive ? "Block this account" : "Let them back in"}
      </button>

      {state.status === "error" ? (
        <p role="alert" className="mt-2 text-sm text-danger">
          {state.message}
        </p>
      ) : null}
    </form>
  );
}

function ResetButton({
  id,
  name,
  email,
  isSelf,
}: {
  id: string;
  name: string;
  email: string | null;
  isSelf: boolean;
}) {
  const [state, formAction, pending] = useActionState(
    resetAccountPassword,
    initialAccountState,
  );
  const form = useRef<HTMLFormElement>(null);
  const confirm = useConfirm();

  useBusyWhile(pending, "Issuing a new password");
  useFormToast(state, {
    successTitle: "Password reset",
    errorTitle: "Could not reset it",
  });

  return (
    <div className="space-y-3">
      <form action={formAction} ref={form}>
        <input type="hidden" name="id" value={id} />

        <button
          type="button"
          disabled={pending}
          onClick={async () => {
            const yes = await confirm({
              title: isSelf
                ? "Send yourself a new password?"
                : `Reset the password for ${name || "this account"}?`,
              body: email
                ? `A new one is generated and sent to ${email}. The password they have now stops working immediately, and nobody — including you — can read the new one back afterwards.`
                : "A new password is generated. The one they have now stops working immediately.",
              confirmLabel: "Reset the password",
              tone: "warning",
            });
            if (yes) form.current?.requestSubmit();
          }}
          className="inline-flex items-center gap-2 rounded-lg border border-border-strong bg-surface px-4 py-2.5 text-sm font-medium transition-colors hover:bg-surface-2 disabled:opacity-50"
        >
          {pending ? <BrandSpinner /> : <KeyRound className="size-4" aria-hidden />}
          Reset password
        </button>

        {state.status === "error" ? (
          <p role="alert" className="mt-2 text-sm text-danger">
            {state.message}
          </p>
        ) : null}
      </form>

      {state.credentials && (
        <CredentialsNote
          email={state.credentials.email}
          password={state.credentials.password}
          reason={state.credentials.reason}
        />
      )}
    </div>
  );
}
