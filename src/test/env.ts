/**
 * Enough environment for a module to load under vitest.
 *
 * ---------------------------------------------------------------------------
 * **Why this is needed at all.** `lib/env.ts` validates the public variables at
 * import time and throws when they are missing — which is right: a missing
 * Supabase URL should stop the application starting rather than surface as a
 * confusing failure on the first query. The cost is that any module which
 * transitively imports it cannot be loaded by a test runner that has no `.env`.
 *
 * The email layout is the case that forced this. It imports the logo resolver,
 * which reads the configured logo out of settings, which reaches Supabase —
 * three files away from anything the tests touch.
 *
 * ---------------------------------------------------------------------------
 * **These values are deliberately not real.** Nothing here should reach a
 * network, and a test that does will fail against an address that does not
 * resolve rather than quietly reading the company's live data.
 */
process.env.NEXT_PUBLIC_SITE_URL ??= "https://example.test";
process.env.NEXT_PUBLIC_SUPABASE_URL ??= "https://nowhere.supabase.invalid";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??= "not-a-real-key";
