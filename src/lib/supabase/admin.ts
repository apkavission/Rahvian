import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { clientEnv, getServerEnv } from "@/lib/env";
import { DB_SCHEMA } from "@/lib/supabase/constants";

/**
 * Service-role client. Bypasses Row Level Security entirely.
 *
 * `import "server-only"` at the top makes importing this file from a Client
 * Component a build error rather than a security incident.
 *
 * Legitimate uses are narrow, and each exists because the browser must not
 * hold the corresponding grant:
 *
 *   - Inserting a lead from a public form. The anonymous role has no insert
 *     grant on `company.leads`, which is what stops anyone from writing
 *     directly to the table from a console.
 *   - Reading and writing `company.form_submissions` for rate limiting.
 *   - Signing R2 upload URLs after checking authorisation separately.
 *   - Administrative user creation and invitation.
 *
 * Everything else uses the session-bound server client, where RLS does the
 * authorisation. Reaching for this client to "make a query work" is almost
 * always a sign that a policy is wrong.
 */
export function createAdminClient() {
  const { SUPABASE_SERVICE_ROLE_KEY } = getServerEnv();

  return createSupabaseClient<Database, "company">(
    clientEnv.NEXT_PUBLIC_SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY,
    {
      db: { schema: DB_SCHEMA },
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
    },
  );
}
