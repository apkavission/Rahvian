/**
 * Where the other eight projects are, on whichever machine this is.
 *
 * ---------------------------------------------------------------------------
 * **Why this exists.** Four scripts used to open `c:/Users/kumar/portal/...` by
 * absolute path. That worked on exactly one computer. Moved to a second one,
 * every estate check died on ENOENT before it reached a single question about
 * the database — and the failure looked like a broken script rather than a
 * wrong path, which is the expensive kind of confusion.
 *
 * Two things vary between machines and both are handled here.
 *
 * **Where the estate lives.** Taken as the parent of this repository, so a
 * checkout anywhere works with no configuration. `ESTATE_ROOT` overrides it.
 *
 * **What each folder is called.** The projects were cloned under their GitHub
 * names on the second machine (`clientPortal`, `demo_CRM`) and under short
 * local names on the first (`portal`, `demo-crm`). Neither is the "real" name,
 * so each project carries a list of names it has been known by and we take
 * whichever is on disk. `ESTATE_DIR_PORTAL=/some/path` overrides one project.
 *
 * A project that is on none of those names is **absent, not broken**: callers
 * get `null` and say so. demo-ecommerce is absent on the second machine because
 * it was never pushed, and a check that skipped it silently would report a
 * clean estate while a ninth of it went unexamined.
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));

/** The directory holding all nine project folders. */
export const ESTATE_ROOT = process.env.ESTATE_ROOT
  ? resolve(process.env.ESTATE_ROOT)
  : resolve(HERE, "..", "..");

/**
 * Every name each project has been cloned under. First one found on disk wins.
 * Windows matches case-insensitively and Linux does not, so the casings that
 * have actually been used are all listed rather than assumed equivalent.
 */
const NAMES = {
  services: ["services"],
  portal: ["portal", "clientPortal"],
  tracker: ["tracker", "taskTracker"],
  "demo-clinic": ["demo-clinic", "demo_clinic"],
  "demo-restaurant": ["demo-restaurant", "demo_restaurant"],
  "demo-school": ["demo-school", "demo_School", "demo_school"],
  "demo-realestate": ["demo-realestate", "demo_RealState", "demo_realestate"],
  "demo-crm": ["demo-crm", "demo_CRM", "demo_crm"],
  "demo-ecommerce": ["demo-ecommerce", "demo_ecommerce"],
};

/** Every project name this module knows, in estate order. */
export const PROJECT_NAMES = Object.keys(NAMES);

const found = new Map();

/**
 * The absolute path to one project, or `null` if it is not on this machine.
 * @param {string} name one of PROJECT_NAMES
 */
export function projectDir(name) {
  if (found.has(name)) return found.get(name);

  const names = NAMES[name];
  if (!names) throw new Error(`Unknown project "${name}"`);

  const override = process.env[`ESTATE_DIR_${name.toUpperCase().replace(/-/g, "_")}`];
  const candidates = override ? [override] : names.map((n) => resolve(ESTATE_ROOT, n));

  const hit = candidates.find((dir) => existsSync(dir)) ?? null;
  found.set(name, hit);
  return hit;
}

/**
 * The same, but for a project the caller cannot continue without.
 * @param {string} name one of PROJECT_NAMES
 */
export function requireProjectDir(name) {
  const dir = projectDir(name);
  if (dir) return dir;
  throw new Error(
    `Cannot find the "${name}" project. Looked for ${NAMES[name].join(", ")} in ${ESTATE_ROOT}. ` +
      `Set ESTATE_ROOT, or ESTATE_DIR_${name.toUpperCase().replace(/-/g, "_")} to its path.`,
  );
}

/** Every project that is present, as `{ name, dir }`, in estate order. */
export function presentProjects() {
  return PROJECT_NAMES.map((name) => ({ name, dir: projectDir(name) })).filter((p) => p.dir);
}

/** Every project that is not on this machine, by name. */
export function absentProjects() {
  return PROJECT_NAMES.filter((name) => !projectDir(name));
}

/* ------------------------------------------------------------------- config */

function parseEnv(file) {
  return Object.fromEntries(
    readFileSync(file, "utf8")
      .split(/\r?\n/)
      /*
        `A-Z0-9_`, and the digit is the point.

        This was `[A-Z_]+`, which silently skips every name with a number in
        it — so all four `R2_*` keys were dropped and any script needing
        storage credentials saw them as undefined, with nothing saying why.
        Found when a cleanup script failed on "No value provided for input HTTP
        label: Bucket" rather than on a missing variable.
      */
      .map((line) => /^([A-Z0-9_]+)=(.*)$/.exec(line.trim()))
      .filter(Boolean)
      .map((m) => [m[1], m[2].replace(/^"|"$/g, "")]),
  );
}

/**
 * The estate's credentials, merged from every `.env.local` that exists.
 *
 * Read in order and merged rather than taken from one file, because no single
 * one holds everything: the portal's has the database password, services' adds
 * the service-role key. Later files do not overwrite earlier ones, so services'
 * own values win for itself — this script runs from services.
 */
export function loadConfig() {
  const files = [
    resolve(HERE, "..", ".env.local"),
    ...["portal", "tracker"].map((n) => projectDir(n) && resolve(projectDir(n), ".env.local")),
  ].filter((f) => f && existsSync(f));

  if (files.length === 0) {
    throw new Error(`No .env.local found. Looked in ${ESTATE_ROOT} and this repository.`);
  }

  const config = {};
  for (const file of files) {
    for (const [key, value] of Object.entries(parseEnv(file))) {
      if (config[key] === undefined) config[key] = value;
    }
  }
  return config;
}

/**
 * A connection to the estate database, using the pooler.
 * @param {typeof import("pg")} pg the caller's own pg, so this module needs no import
 */
export function dbClient(pg, config) {
  const ref = new URL(config.NEXT_PUBLIC_SUPABASE_URL).hostname.split(".")[0];
  return new pg.Client({
    host: `aws-0-${config.SUPABASE_REGION ?? "ap-south-1"}.pooler.supabase.com`,
    port: 5432,
    user: `postgres.${ref}`,
    password: config.SUPABASE_DB_PASSWORD,
    database: "postgres",
    ssl: { rejectUnauthorized: false },
  });
}
