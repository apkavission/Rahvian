"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { loginSchema, safeNext, type LoginState } from "@/lib/validation/login";

/**
 * Sign in.
 *
 * Sign-up is disabled at the Supabase project, so this is the only way in and
 * accounts are created by an owner. That is the whole access model for the
 * admin: there is no self-service route to a staff account.
 *
 * A failed sign-in returns one message regardless of which half was wrong.
 * Distinguishing "no such account" from "wrong password" turns the form into a
 * way to test whether an address is registered.
 */
export async function signIn(
  _previous: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email") ?? "",
    password: formData.get("password") ?? "",
    next: formData.get("next") ?? undefined,
  });

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0];
      if (typeof key === "string" && !fieldErrors[key]) {
        fieldErrors[key] = issue.message;
      }
    }
    return {
      status: "error",
      message: "Check the highlighted fields.",
      fieldErrors,
    };
  }

  const supabase = await createClient();

  const { data, error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error || !data.user) {
    return {
      status: "error",
      message: "That email address and password do not match an account.",
    };
  }

  /*
    Authenticating is not the same as being allowed in.

    A deactivated account, or one whose access list no longer includes this
    application, still has valid credentials — `is_active` is the estate-wide
    off switch (spec §28) and it has to be honoured at the door, not only by
    the row policies further in. The session is discarded so the browser is not
    left holding a cookie for an account that cannot use it.
  */
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("is_active, app_access")
    .eq("id", data.user.id)
    .maybeSingle();

  /*
    A failed read is not the same as a refused account, and must not be
    reported as one. Telling someone with a valid, active account that they
    have no access sends them to ask for permissions they already hold, while
    the actual fault — a database that could not be reached — goes unmentioned.
  */
  if (profileError) {
    console.error("[login] profile read failed:", profileError.message);
    await supabase.auth.signOut();
    return {
      status: "error",
      message: "Could not verify your account just now. Try again in a moment.",
    };
  }

  if (!profile?.is_active || !profile.app_access.includes("company")) {
    await supabase.auth.signOut();
    return {
      status: "error",
      message: "That account does not have access to this admin.",
    };
  }

  // Best effort: a failed timestamp write is not a reason to refuse a login.
  await supabase
    .from("profiles")
    .update({ last_login_at: new Date().toISOString() })
    .eq("id", data.user.id);

  redirect(safeNext(parsed.data.next));
}

/** Sign out and return to the login screen. */
export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/admin/login");
}
