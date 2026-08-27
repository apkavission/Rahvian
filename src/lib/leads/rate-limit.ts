import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Rate limiting for public forms, backed by `company.form_submissions`.
 *
 * Deliberately in the database rather than in process memory. The site runs on
 * serverless functions where each request may land on a fresh instance, so an
 * in-memory counter would reset constantly and enforce nothing.
 *
 * Two independent limits, because they stop different things. The IP limit
 * stops one machine flooding the form. The email limit stops the same person
 * submitting repeatedly from a phone, an office network and a café — a pattern
 * that is far more often an anxious client than an attacker, which is why the
 * limit is generous rather than strict.
 */

const WINDOW_MINUTES = 60;
const MAX_PER_IP = 5;
const MAX_PER_EMAIL = 3;

export interface RateLimitResult {
  allowed: boolean;
  /** Shown to the person when blocked. Never mentions which limit was hit. */
  message?: string;
}

export async function checkRateLimit(params: {
  formKey: string;
  ipHash: string | null;
  emailHash: string;
}): Promise<RateLimitResult> {
  const supabase = createAdminClient();
  const since = new Date(Date.now() - WINDOW_MINUTES * 60_000).toISOString();

  const [byIp, byEmail] = await Promise.all([
    params.ipHash
      ? supabase
          .from("form_submissions")
          .select("id", { count: "exact", head: true })
          .eq("form_key", params.formKey)
          .eq("ip_hash", params.ipHash)
          .gte("created_at", since)
      : Promise.resolve({ count: 0, error: null }),

    supabase
      .from("form_submissions")
      .select("id", { count: "exact", head: true })
      .eq("form_key", params.formKey)
      .eq("email_hash", params.emailHash)
      .gte("created_at", since),
  ]);

  // A counting failure must not block a real enquiry. Losing a lead is a worse
  // outcome than letting one extra submission through, so this fails open and
  // leaves a record for whoever investigates.
  if (byIp.error || byEmail.error) {
    console.error(
      "[rate-limit] count failed, allowing submission:",
      byIp.error?.message ?? byEmail.error?.message,
    );
    return { allowed: true };
  }

  const overLimit =
    (byIp.count ?? 0) >= MAX_PER_IP || (byEmail.count ?? 0) >= MAX_PER_EMAIL;

  if (overLimit) {
    return {
      allowed: false,
      message:
        "We have already received a few enquiries from you in the last hour. " +
        "Please give us a little time to reply, or email us directly.",
    };
  }

  return { allowed: true };
}

/**
 * Records an attempt, successful or not.
 *
 * Failed attempts count too — otherwise anyone could submit invalid data
 * indefinitely and never touch the limit.
 */
export async function recordSubmission(params: {
  formKey: string;
  ipHash: string | null;
  emailHash: string | null;
  succeeded: boolean;
}): Promise<void> {
  const supabase = createAdminClient();

  const { error } = await supabase.from("form_submissions").insert({
    form_key: params.formKey,
    ip_hash: params.ipHash ?? "unknown",
    email_hash: params.emailHash,
    succeeded: params.succeeded,
  });

  if (error) {
    console.error("[rate-limit] could not record submission:", error.message);
  }
}
