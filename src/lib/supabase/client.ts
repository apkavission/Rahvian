import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types/database";
import { clientEnv } from "@/lib/env";
import { DB_SCHEMA } from "@/lib/supabase/constants";

/**
 * Supabase client for Client Components.
 *
 * Anon key only, always subject to Row Level Security. Nothing this client can
 * reach is secret: it cannot read leads, profiles or draft content, because no
 * policy grants the anonymous or authenticated role access to them beyond what
 * that user is entitled to.
 *
 * Used for realtime subscriptions and interactive admin surfaces. Public page
 * content is fetched on the server instead, so it is present in the HTML for
 * crawlers.
 */
export function createClient() {
  return createBrowserClient<Database, "company">(
    clientEnv.NEXT_PUBLIC_SUPABASE_URL,
    clientEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { db: { schema: DB_SCHEMA } },
  );
}
