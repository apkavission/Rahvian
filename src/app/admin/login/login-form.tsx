"use client";

import { useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { BrandSpinner } from "@/components/brand/brand-loader";
import { useBusyWhile } from "@/components/forms/use-busy-while";
import { Button } from "@/components/ui/button";
import { Field, FIELD } from "@/components/ui/field";
import { initialLoginState } from "@/lib/validation/login";
import { signIn } from "./actions";

/**
 * The sign-in form.
 *
 * There is no "forgot password" link and no sign-up link, because neither
 * exists: sign-up is disabled at the project and accounts are created by an
 * owner. A link to a route that answers with a shrug is worse than no link.
 *
 * The outcome is not announced as a toast. A toast is for something that
 * happened elsewhere on the page; here the form *is* the page, and the message
 * belongs next to the button that produced it.
 */
export function LoginForm() {
  const [state, formAction, pending] = useActionState(signIn, initialLoginState);
  const searchParams = useSearchParams();

  useBusyWhile(pending, "Signing you in");

  return (
    <form action={formAction} className="space-y-5" noValidate>
      {/* Where the middleware was sending them before it turned them away.
          Validated server-side — anyone can put anything in a query string. */}
      <input type="hidden" name="next" value={searchParams.get("next") ?? ""} />

      <Field label="Email" required error={state.fieldErrors?.email}>
        {(id, describedBy) => (
          <input
            id={id}
            name="email"
            type="email"
            required
            autoComplete="username"
            autoFocus
            aria-describedby={describedBy}
            aria-invalid={state.fieldErrors?.email ? true : undefined}
            className={FIELD}
          />
        )}
      </Field>

      <Field label="Password" required error={state.fieldErrors?.password}>
        {(id, describedBy) => (
          <input
            id={id}
            name="password"
            type="password"
            required
            autoComplete="current-password"
            aria-describedby={describedBy}
            aria-invalid={state.fieldErrors?.password ? true : undefined}
            className={FIELD}
          />
        )}
      </Field>

      {state.status === "error" && !state.fieldErrors ? (
        <p role="alert" className="text-sm text-danger">
          {state.message}
        </p>
      ) : null}

      <Button type="submit" disabled={pending} className="w-full">
        {pending ? (
          <>
            <BrandSpinner />
            Signing in
          </>
        ) : (
          "Sign in"
        )}
      </Button>
    </form>
  );
}
