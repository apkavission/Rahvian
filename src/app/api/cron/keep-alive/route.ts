import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { createCachedClient } from "@/lib/supabase/server";

/**
 * Keeps the Supabase project from being paused.
 *
 * A free Supabase project pauses after seven days with no database activity,
 * and a paused project does not answer — so the site would go blank a week
 * after the last visitor, which is exactly the week nobody is watching. That
 * risk has been on the register since the beginning; this is the mitigation.
 *
 * **It is a real query, not a ping.** Asking the REST endpoint for its own
 * health would prove the gateway is up and prove nothing about the database
 * underneath, which is the thing that pauses. One row from one table is the
 * cheapest thing that actually touches Postgres.
 *
 * `site_settings` is the table, because it has exactly one row and every page
 * on the site already reads it. There is nothing cheaper to ask for.
 *
 * The anonymous client, deliberately: the service-role key has no business
 * being loaded by a route that only needs to prove the database answers, and
 * `site_settings_public_read` allows this row to anyone. A keep-alive should be
 * the least privileged thing in the estate.
 *
 * GET /api/cron/keep-alive
 *   header: x-cron-secret: <REVALIDATE_SECRET>
 *
 * Vercel Cron sends its own `Authorization: Bearer <CRON_SECRET>` header, which
 * is accepted as well — see below.
 */

export const dynamic = "force-dynamic";

function matches(provided: string | null, expected: string) {
  if (!provided) return false;

  const a = Buffer.from(provided);
  const b = Buffer.from(expected);

  // Constant time. The length check leaks only the length, which is not the
  // secret. Same shape as `/api/revalidate`, on purpose.
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export async function GET(request: Request) {
  /*
    Two accepted callers, and both must present something.

    Vercel Cron sends `Authorization: Bearer $CRON_SECRET` and nothing else, so
    that header is honoured when `CRON_SECRET` is set. Anything else — a
    monitor, a scheduled task on a machine, a person checking — uses
    `x-cron-secret` with the shared secret this project already has.

    Fail closed: with neither secret configured this endpoint refuses rather
    than becoming an open database query anybody can run in a loop.
  */
  const cronSecret = process.env.CRON_SECRET;
  const sharedSecret = process.env.REVALIDATE_SECRET;

  if (!cronSecret && !sharedSecret) {
    console.error("[keep-alive] neither CRON_SECRET nor REVALIDATE_SECRET is configured");
    return NextResponse.json({ error: "Not configured" }, { status: 500 });
  }

  const authorised =
    (cronSecret && matches(request.headers.get("authorization"), `Bearer ${cronSecret}`)) ||
    (sharedSecret && matches(request.headers.get("x-cron-secret"), sharedSecret));

  if (!authorised) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const started = Date.now();
  const supabase = createCachedClient();

  const { error } = await supabase.from("site_settings").select("id").eq("id", 1).maybeSingle();

  const ms = Date.now() - started;

  if (error) {
    // Loud. A keep-alive that fails silently is a keep-alive that is not
    // keeping anything alive, and the first anybody hears of it is a blank
    // site.
    console.error(`[keep-alive] database did not answer after ${ms}ms:`, error.message);
    return NextResponse.json({ ok: false, ms, error: error.message }, { status: 503 });
  }

  return NextResponse.json({ ok: true, ms });
}
