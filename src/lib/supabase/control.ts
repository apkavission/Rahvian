import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { clientEnv } from "@/lib/env";
import type { ControlDatabase } from "@/types/control";

/**
 * A client pinned to the `control` schema.
 *
 * ---------------------------------------------------------------------------
 * **Separate from `createClient()` on purpose, and it is not tidiness.**
 *
 * Everything else in this application reads `company`. The estate screens read
 * across all eight applications, which is the most powerful thing anybody can
 * do in this database — so it should take a differently-named client to do it.
 * `createControlClient` appears in a handful of files and nowhere else, which
 * is a property somebody can check with grep.
 *
 * ---------------------------------------------------------------------------
 * **It carries the visitor's session, and does not use the service role.**
 *
 * Every function in that schema checks `control.is_owner()` itself and refuses
 * anybody else with an exception. Handing these screens the service role would
 * bypass that check and leave the panel as the only thing deciding who may see
 * the estate — and a panel is markup, not access control.
 *
 * **`control` has to be in the exposed-schema list** or every call here answers
 * `Invalid schema`, however correct the SQL is:
 *
 *     alter role authenticator set pgrst.db_schemas =
 *       'public, graphql_public, company, portal, control, demo_clinic, ...';
 *     notify pgrst, 'reload config';
 */
export async function createControlClient() {
  const cookieStore = await cookies();

  return createServerClient<ControlDatabase, "control">(
    clientEnv.NEXT_PUBLIC_SUPABASE_URL,
    clientEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      db: { schema: "control" },
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
            // Server Components cannot set cookies; the proxy refreshes the
            // session instead. Ignoring this is correct rather than lazy.
          }
        },
      },
    },
  );
}

/**
 * The same schema, with no session at all.
 *
 * ---------------------------------------------------------------------------
 * **For the public website, which has no visitor to authenticate.** The client
 * above carries the signed-in owner's cookies, which is what every estate
 * screen needs and what `control.is_owner()` reads. A page on rahvian.com has
 * neither, and asking for cookies there would make the read uncacheable for the
 * sake of a session that is never there.
 *
 * The only function `anon` may execute in this schema is `public_demos()`,
 * which filters to businesses somebody deliberately opened. Everything else in
 * `control` refuses an anonymous caller at the first line of its body.
 *
 * Mirrors `createCachedClient()` in `server.ts` exactly, including the reason
 * its cookie handlers are empty: a client that reads cookies cannot be cached.
 */
export function createCachedControlClient() {
  return createServerClient<ControlDatabase, "control">(
    clientEnv.NEXT_PUBLIC_SUPABASE_URL,
    clientEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      db: { schema: "control" },
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
