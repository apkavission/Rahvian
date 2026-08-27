#!/usr/bin/env node
/**
 * Create a staff account for the admin panel.
 *
 *   npm run admin:create -- --email someone@example.com --name "Their Name"
 *   npm run admin:create -- --email someone@example.com --role admin
 *   npm run admin:create -- --email someone@example.com --password "..."
 *
 * Sign-up is disabled at the Supabase project by design, so this is the only
 * way an account comes into existence until `/admin/users` is built. It uses
 * the service-role key against the Auth admin API, which is why it is a script
 * on a developer's machine and not an endpoint anyone can reach.
 *
 * The account is created with its email already confirmed. There is no
 * confirmation mail to click, deliberately: the person running this is sitting
 * with the owner, and a confirmation link that expires in an inbox nobody
 * checks is the usual reason a new admin cannot get in.
 *
 * Idempotent enough to be safe: an address that already has an account is
 * reported rather than duplicated, and its profile is still corrected, so
 * re-running to fix a role is a legitimate use.
 *
 * Talks to PostgREST and GoTrue over plain fetch, like the seeder, so it does
 * not depend on a Node version that `@supabase/supabase-js` requires.
 */

import { readFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SCHEMA = "company";

const ROLES = ["super_admin", "owner", "admin", "editor"];

// --- environment ------------------------------------------------------------

function loadEnv() {
  const env = {};
  try {
    for (const line of readFileSync(resolve(ROOT, ".env.local"), "utf8").split(/\r?\n/)) {
      const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
      if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  } catch {
    /* CI passes them directly */
  }
  return { ...env, ...process.env };
}

const env = loadEnv();
const BASE = env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = env.SUPABASE_SERVICE_ROLE_KEY;

if (!BASE || !KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

// --- arguments --------------------------------------------------------------

/**
 * Flags and their values.
 *
 * Every token up to the next flag is joined into the value, so `--name Their
 * Name` works whether or not the shell kept the quotes. npm strips one layer
 * of quoting on its way to the script, which is exactly how a two-word name
 * silently becomes one word.
 */
function parseArgs(argv) {
  const args = {};
  let current = null;

  for (const token of argv) {
    const flag = /^--([a-z-]+)$/.exec(token);

    if (flag) {
      current = flag[1];
      args[current] = true;
      continue;
    }

    if (!current) continue;
    args[current] = args[current] === true ? token : `${args[current]} ${token}`;
  }

  return args;
}

const args = parseArgs(process.argv.slice(2));

const email = typeof args.email === "string" ? args.email.trim().toLowerCase() : null;
const name = typeof args.name === "string" ? args.name : "";
const role = typeof args.role === "string" ? args.role : "owner";

if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
  console.error("Usage: npm run admin:create -- --email you@example.com [--name \"Your Name\"] [--role owner] [--password ...]");
  process.exit(1);
}

if (!ROLES.includes(role)) {
  console.error(`--role must be one of: ${ROLES.join(", ")}`);
  process.exit(1);
}

/**
 * A generated password is 24 bytes of base64url.
 *
 * Generated rather than prompted because a password typed at a shell prompt
 * ends up in the shell history, and one chosen on the spot is chosen badly.
 * It is printed once; the owner is expected to change it or store it.
 */
const password =
  typeof args.password === "string" && args.password.length >= 8
    ? args.password
    : randomBytes(24).toString("base64url");

// --- api --------------------------------------------------------------------

const authHeaders = {
  apikey: KEY,
  Authorization: `Bearer ${KEY}`,
  "Content-Type": "application/json",
};

async function findUser(address) {
  const url = `${BASE}/auth/v1/admin/users?per_page=200`;
  const response = await fetch(url, { headers: authHeaders });
  if (!response.ok) throw new Error(`Listing users failed: HTTP ${response.status}`);

  const payload = await response.json();
  const users = Array.isArray(payload) ? payload : (payload.users ?? []);
  return users.find((user) => (user.email ?? "").toLowerCase() === address) ?? null;
}

async function createUser() {
  const response = await fetch(`${BASE}/auth/v1/admin/users`, {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: name },
    }),
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(payload?.msg ?? payload?.message ?? `HTTP ${response.status}`);
  }
  return payload;
}

/**
 * Bring the profile into line.
 *
 * A trigger on `auth.users` already created one, conservatively — role
 * `editor`, company access only. This raises it to the requested role and
 * makes sure the account is active, which is also what makes re-running this
 * a valid way to fix a role or reactivate someone.
 */
async function updateProfile(id) {
  const response = await fetch(`${BASE}/rest/v1/profiles?id=eq.${id}`, {
    method: "PATCH",
    headers: {
      ...authHeaders,
      "Accept-Profile": SCHEMA,
      "Content-Profile": SCHEMA,
      Prefer: "return=representation",
    },
    body: JSON.stringify({
      role,
      is_active: true,
      app_access: ["company"],
      ...(name ? { full_name: name } : {}),
    }),
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(payload?.message ?? `HTTP ${response.status}`);
  }
  return Array.isArray(payload) ? payload[0] : payload;
}

// --- run --------------------------------------------------------------------

console.log("");

try {
  const existing = await findUser(email);

  if (existing) {
    await updateProfile(existing.id);
    console.log(`  Account already exists — profile updated.`);
    console.log(`  Email    ${email}`);
    console.log(`  Role     ${role}`);
    console.log(`  Password unchanged. Reset it from the Supabase dashboard if it is lost.`);
  } else {
    const user = await createUser();
    await updateProfile(user.id);
    console.log(`  Account created.`);
    console.log(`  Email    ${email}`);
    console.log(`  Password ${password}`);
    console.log(`  Role     ${role}`);
    console.log("");
    console.log("  This password is shown once. Store it now.");
  }

  console.log("");
  console.log("  Sign in at /admin/login");
  console.log("");
} catch (error) {
  console.error(`  Failed: ${error.message}`);
  console.error("");
  process.exit(1);
}
