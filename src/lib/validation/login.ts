import { z } from "zod";

/**
 * The admin sign-in form.
 *
 * Kept out of the Server Action file on purpose: a `"use server"` module may
 * only export async functions, because every export becomes a callable
 * endpoint. A schema or an initial-state object exported from one is a build
 * error — and the rule is a good one, since it makes the endpoint surface of
 * the application exactly the list of functions you can see.
 */

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Enter your email address.")
    .pipe(z.email("That does not look like an email address.")),

  password: z.string().min(1, "Enter your password."),

  /** Where to go afterwards. Validated in the action rather than trusted. */
  next: z.string().optional(),
});

export interface LoginState {
  status: "idle" | "error";
  message: string;
  fieldErrors?: Record<string, string>;
}

export const initialLoginState: LoginState = { status: "idle", message: "" };

/**
 * Only a path within this admin is an acceptable redirect target.
 *
 * `next` arrives in the query string, so anyone can put anything in it. A bare
 * "starts with a slash" check is not enough: `//evil.example` also starts with
 * a slash and is a protocol-relative URL the browser will follow off this
 * origin. That is an open redirect, and on a login screen it is the classic
 * phishing setup — a genuine login page that lands you somewhere else.
 */
export function safeNext(next: string | undefined): string {
  if (!next) return "/admin";
  if (next.startsWith("//")) return "/admin";
  if (!next.startsWith("/admin")) return "/admin";
  return next;
}
