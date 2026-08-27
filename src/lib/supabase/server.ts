import { createServerClient } from "@supabase/ssr";
import type { Database } from "@/types/database";
import { cookies } from "next/headers";
import { clientEnv } from "@/lib/env";
import { DB_SCHEMA } from "@/lib/supabase/constants";

/**
 * Supabase client for Server Components, Server Actions and Route Handlers.
 *
 * Uses the anon key and carries the visitor's session cookie, so every query
 * is subject to Row Level Security. This is the client that should be used
 * for essentially everything — including admin screens, where RLS is what
 * enforces the caller's role.
 *
 * For the rare operation that must bypass RLS, see `admin.ts`.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database, "company">(
    clientEnv.NEXT_PUBLIC_SUPABASE_URL,
    clientEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      db: { schema: DB_SCHEMA },
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Server Components cannot set cookies. Session refresh is handled
            // by middleware instead, so this is safe to ignore here rather
            // than being an error worth surfacing.
          }
        },
      },
    },
  );
}

/**
 * Read-only client for cached data fetching.
 *
 * Deliberately session-free. Functions wrapped in `unstable_cache` must not
 * read cookies: the cached result is shared across every visitor, so a
 * per-user session leaking into it would serve one visitor's data to another.
 *
 * Only ever use this for content that is public by definition.
 */
export function createCachedClient() {
  return createServerClient<Database, "company">(
    clientEnv.NEXT_PUBLIC_SUPABASE_URL,
    clientEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      db: { schema: DB_SCHEMA },
      cookies: {
        getAll() {
          return [];
        },
        setAll() {
          // No session, by design. See the note above.
        },
      },
    },
  );
}
