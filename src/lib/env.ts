import { z } from "zod";

/**
 * Environment access, validated once at module load.
 *
 * Two separate schemas, deliberately:
 *
 *   `clientEnv` holds only NEXT_PUBLIC_* values. These are inlined into the
 *   browser bundle by Next.js and are public by definition.
 *
 *   `serverEnv` holds secrets. Reading it from a Client Component throws at
 *   import time rather than silently shipping a key to the browser — a loud
 *   failure in development is the point.
 *
 * Validation happens here so a missing variable surfaces as one clear error at
 * startup, not as `undefined` reaching an API three layers down.
 */

// ---------------------------------------------------------------------------
// Client — safe in the browser
// ---------------------------------------------------------------------------

const clientSchema = z.object({
  NEXT_PUBLIC_SITE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  NEXT_PUBLIC_TURNSTILE_SITE_KEY: z.string().optional(),
  NEXT_PUBLIC_GA_MEASUREMENT_ID: z.string().optional(),
});

/**
 * Treats an empty value as absent.
 *
 * A `.env` file cannot express "not set": an unused key is written `KEY=`, and
 * that reaches the process as an empty string, not as undefined. Without this,
 * an optional variable left blank fails its format check — and because the
 * server schema is parsed as a whole, one blank optional key throws for every
 * caller, including the ones that only wanted `IP_HASH_SALT`. That is exactly
 * how one empty optional URL variable took down both public forms.
 *
 * Required variables are unaffected: blank still fails, with "required"
 * instead of a format message.
 */
function omitEmpty<T extends Record<string, unknown>>(input: T): T {
  const output: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(input)) {
    if (typeof value === "string" && value.trim() === "") continue;
    output[key] = value;
  }

  return output as T;
}
// Referenced as full literals, never as process.env[key]. Next.js replaces
// these at build time by textual substitution, so a computed key resolves to
// undefined in the browser.
const parsedClientEnv = clientSchema.safeParse(
  omitEmpty({
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_TURNSTILE_SITE_KEY: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY,
    NEXT_PUBLIC_GA_MEASUREMENT_ID: process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID,
  }),
);

if (!parsedClientEnv.success) {
  throw new Error(
    `Invalid public environment variables:\n${formatIssues(parsedClientEnv.error)}`,
  );
}

export const clientEnv = parsedClientEnv.data;

// ---------------------------------------------------------------------------
// Server — secrets, never bundled
// ---------------------------------------------------------------------------

const serverSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),

  // Cloudflare R2. The bucket is private, so there is no public URL among
  // these: nothing in it is reachable from the internet directly, and every
  // file is served through this application, which decides who may see it
  // before handing anything over.
  R2_ACCOUNT_ID: z.string().optional(),
  R2_ACCESS_KEY_ID: z.string().optional(),
  R2_SECRET_ACCESS_KEY: z.string().optional(),
  R2_BUCKET_NAME: z.string().optional(),

  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().positive().optional(),
  SMTP_SECURE: z
    .enum(["true", "false"])
    .transform((v) => v === "true")
    .optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  EMAIL_FROM: z.string().optional(),
  EMAIL_TO_ADMIN: z.string().optional(),

  TURNSTILE_SECRET_KEY: z.string().optional(),

  IP_HASH_SALT: z.string().min(16, "IP_HASH_SALT must be at least 16 characters"),
});

type ServerEnv = z.infer<typeof serverSchema>;

let cachedServerEnv: ServerEnv | undefined;

/**
 * Secrets. Server-only.
 *
 * Lazy rather than validated at import, so that optional integrations (R2,
 * SMTP, Turnstile) can stay unconfigured during early development without
 * breaking the build.
 */
export function getServerEnv(): ServerEnv {
  if (typeof window !== "undefined") {
    throw new Error(
      "getServerEnv() was called in the browser. Server secrets must never be " +
        "imported into a Client Component.",
    );
  }

  if (cachedServerEnv) return cachedServerEnv;

  const parsed = serverSchema.safeParse(omitEmpty(process.env));

  if (!parsed.success) {
    throw new Error(
      `Invalid server environment variables:\n${formatIssues(parsed.error)}`,
    );
  }

  cachedServerEnv = parsed.data;
  return cachedServerEnv;
}

// ---------------------------------------------------------------------------

function formatIssues(error: z.ZodError): string {
  return error.issues
    .map((issue) => `  - ${issue.path.join(".") || "(root)"}: ${issue.message}`)
    .join("\n");
}

/** Canonical origin, with any trailing slash removed. */
export const SITE_URL = clientEnv.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
