/**
 * Does the door actually work?
 *
 * Not "did the migration run" — `verify:estate` answers that by looking for the
 * objects. This signs in as a real owner, issues a link, opens it, lets it
 * expire and watches what each of those does to what a visitor is told.
 *
 * Everything it writes is removed at the end, and it is written against a
 * variant it creates nothing in.
 */
import pg from "pg";
import { loadConfig, dbClient } from "./estate.mjs";

const db = dbClient(pg, loadConfig());
await db.connect();

let failures = 0;

function check(label, ok, detail) {
  console.log(`  ${ok ? "ok  " : "FAIL"}  ${label}${detail ? "  — " + detail : ""}`);
  if (!ok) failures += 1;
}

/* ------------------------------------------------------------------ the doors */

/*
  Being open to the world is a decision, not a fault.

  This used to assert that nothing was public, and then failed three times the
  afternoon somebody opened the clinic from the estate screen — reporting a
  broken gate when the gate had been deliberately opened. A check that cries
  wolf about a decision is a check people learn to ignore.

  What is worth asserting is the property underneath: nothing becomes public
  without the audit log saying who did it and when. That is what makes an
  unexpected public demo answerable rather than mysterious.
*/
const open = await db.query(
  `select 'clinic' k, slug from demo_clinic.variants where visibility = 'public'
   union all select 'resto', slug from demo_resto.variants where visibility = 'public'
   union all select 'school', slug from demo_school.variants where visibility = 'public'
   union all select 'estate', slug from demo_estate.variants where visibility = 'public'
   union all select 'crm', slug from demo_crm.variants where visibility = 'public'
   union all select 'shop', slug from demo_shop.variants where visibility = 'public'`,
);

if (open.rowCount === 0) {
  check("every demo is opened by invitation", true);
} else {
  console.log(
    `  note  open to anybody: ${open.rows.map((row) => `${row.k}/${row.slug}`).join(", ")}`,
  );

  const recorded = await db.query(
    `select subject from control.audit_log
      where action = 'demo.opened_to_public' and subject = any($1::text[])`,
    [open.rows.map((row) => row.slug)],
  );

  const named = new Set(recorded.rows.map((row) => row.subject));
  const unexplained = open.rows.filter((row) => !named.has(row.slug));

  check(
    "and each one was opened by somebody the log can name",
    unexplained.length === 0,
    unexplained.length
      ? `no record of ${unexplained.map((row) => `${row.k}/${row.slug}`).join(", ")}`
      : `${open.rowCount} deliberately public`,
  );
}

const fresh = await db.query(
  `select column_default from information_schema.columns
    where table_schema = 'demo_clinic' and table_name = 'variants' and column_name = 'visibility'`,
);

check(
  "a new business is closed by default",
  String(fresh.rows[0].column_default).includes("link_only"),
  fresh.rows[0].column_default,
);

/* ------------------------------------------------------------ who is asking */

const owner = await db.query(
  `select p.id, p.full_name from company.profiles p
    join company.roles r on r.key = p.role
   where p.is_active and r.is_active and r.is_owner limit 1`,
);

if (owner.rowCount === 0) {
  console.log("  no owner account to sign in as; stopping");
  process.exit(1);
}

const OWNER = owner.rows[0];
console.log(`\n  signed in as ${OWNER.full_name}\n`);

/** Run as that person, the way the application does, not as postgres. */
async function asOwner(sql, params = []) {
  await db.query("begin");
  await db.query("select set_config('role', 'authenticated', true)");
  await db.query(
    `select set_config('request.jwt.claims', json_build_object('sub', $1::text, 'role', 'authenticated')::text, true)`,
    [OWNER.id],
  );
  try {
    const result = await db.query(sql, params);
    await db.query("commit");
    return result;
  } catch (error) {
    await db.query("rollback");
    throw error;
  }
}

/* -------------------------------------------------------------- issuing one */

/*
  Whichever demo still has a business behind a link.

  Not always the clinic. A business that is open to the world cannot test a
  gate — a stranger is *meant* to get into that one — so hardcoding the clinic
  meant three assertions failed the afternoon somebody opened it from the estate
  screen, reporting a broken door that was deliberately unlocked. Any demo will
  do; this takes the first with something still closed.
*/
const APP_KEY = { demo_clinic: "clinic", demo_resto: "resto", demo_school: "school",
  demo_estate: "estate", demo_crm: "crm", demo_shop: "shop" };

let SCHEMA = null;
let VARIANT = null;

for (const schema of Object.keys(APP_KEY)) {
  const found = await db.query(
    `select id, slug from ${schema}.variants
      where is_active and visibility = 'link_only'
      order by sort_order limit 1`,
  );

  if (found.rowCount > 0) {
    SCHEMA = schema;
    VARIANT = found.rows[0];
    break;
  }
}

if (!SCHEMA) {
  console.log("");
  console.log("  every business in every demo is open to the world, so there is no");
  console.log("  door to test. Close one on the estate screen and run this again.");
  console.log("");
  await db.end();
  process.exit(failures === 0 ? 0 : 1);
}

const KEY = APP_KEY[SCHEMA];

console.log(`  testing the door on ${KEY}/${VARIANT.slug}
`);

let token;
try {
  const issued = await asOwner(
    `select control.create_demo_link('${KEY}', $1::uuid, $2, 14, 3, $3) as token`,
    [VARIANT.id, "Automated check — safe to delete", "Written by check-demo-access"],
  );
  token = issued.rows[0].token;
  check("an owner can issue a link", typeof token === "string" && token.length >= 40, `${token?.length} chars`);
} catch (error) {
  check("an owner can issue a link", false, error.message);
  process.exit(1);
}

/* A token nobody can guess is the whole security of this table, so its shape is
   worth pinning rather than assuming. */
check("the token is random and long", /^[A-Za-z0-9_-]{40,}$/.test(token));

/* -------------------------------------------------------- the estate's view */

const listed = await asOwner(`select * from control.demo_links('${KEY}')`);
const row = listed.rows.find((r) => r.token === token);

check("it appears on the estate screen", Boolean(row), `${listed.rowCount} links listed`);
check("as live", row?.state === "live", row?.state);
check("naming the business it opens", row?.variant_slug === VARIANT.slug, row?.variant_slug);
/* Whichever demo was chosen — the name comes from `control.applications`, and
   what matters is that the row is attributed to the right one rather than to
   whichever demo happens to be first. */
check(
  "with the demo it belongs to",
  typeof row?.app_name === "string" && row.app_name.toLowerCase().includes(KEY.slice(0, 4)),
  row?.app_name,
);

const all = await asOwner(`select distinct app_key from control.demo_links()`);
check("and the unfiltered list reaches every demo", all.rowCount >= 1, all.rows.map((r) => r.app_key).join(", "));

/* -------------------------------------------------------------- opening it */

await db.query(`select ${SCHEMA}.note_share_visit($1, $2, $3)`, [
  token,
  "Mozilla/5.0 (automated check)",
  "https://example.test/",
]);

const counted = await asOwner(`select view_count, state from control.demo_links('${KEY}') where token = $1`, [token]);
check("an opening is counted", counted.rows[0]?.view_count === 1, String(counted.rows[0]?.view_count));

/* Six pages read in one sitting is one opening, not six. */
await db.query(`select ${SCHEMA}.note_share_visit($1)`, [token]);
await db.query(`select ${SCHEMA}.note_share_visit($1)`, [token]);

const still = await asOwner(`select view_count from control.demo_links('${KEY}') where token = $1`, [token]);
check("reading more pages is still one opening", still.rows[0]?.view_count === 1, String(still.rows[0]?.view_count));

const linkId = row.link_id;
const opens = await asOwner(`select * from control.demo_link_opens('${KEY}', $1::uuid)`, [linkId]);
check("and the opening is on the record, one by one", opens.rowCount === 1, `${opens.rowCount} rows`);
check(
  "with what they came from",
  opens.rows[0]?.referrer === "https://example.test/",
  opens.rows[0]?.referrer,
);

/* ------------------------------------------------------- what a visitor sees */

const live = await db.query(`select * from ${SCHEMA}.can_view($1, $2)`, [VARIANT.slug, token]);
check("the link opens the demo", live.rows[0]?.verdict === "ok", live.rows[0]?.verdict);

const without = await db.query(`select * from ${SCHEMA}.can_view($1, null)`, [VARIANT.slug]);
check("the address alone does not", without.rows[0]?.verdict === "needs_link", without.rows[0]?.verdict);

/* --------------------------------------------------------------- expiry */

/* Back-dated wholesale, not just the expiry: the table insists a link expires
   after it was made, which is the constraint that catches a typed-in date in
   the past. Moving only one end of it fails the check rather than the test. */
await db.query(
  `update ${SCHEMA}.share_links
      set created_at = now() - interval '30 days', expires_at = now() - interval '2 days'
    where token = $1`,
  [token],
);

const expired = await db.query(`select * from ${SCHEMA}.link_state($1)`, [token]);
check("an expired link says so", expired.rows[0]?.state === "expired", expired.rows[0]?.state);
check("and when", Boolean(expired.rows[0]?.expires_at), String(expired.rows[0]?.expires_at));
check("and for which business", Boolean(expired.rows[0]?.business), expired.rows[0]?.business);

const dead = await db.query(`select * from ${SCHEMA}.can_view($1, $2)`, [VARIANT.slug, token]);
check("an expired link no longer opens the demo", dead.rows[0]?.verdict === "needs_link", dead.rows[0]?.verdict);

const nothing = await db.query(`select * from ${SCHEMA}.link_state($1)`, ["not-a-real-token-at-all"]);
check("a made-up token learns nothing", nothing.rows[0]?.state === "unknown", nothing.rows[0]?.state);
check(
  "not even which business it is not for",
  nothing.rows[0]?.business === null && nothing.rows[0]?.expires_at === null,
);

const afterExpiry = await asOwner(`select state from control.demo_links('${KEY}') where token = $1`, [token]);
check("and the screen shows it as expired", afterExpiry.rows[0]?.state === "expired", afterExpiry.rows[0]?.state);

/* ------------------------------------------------------------- revoking */

await asOwner(`select control.revoke_demo_link('${KEY}', $1::uuid)`, [linkId]);
const revoked = await asOwner(`select state from control.demo_links('${KEY}') where token = $1`, [token]);
check("closing one by hand shows as closed", revoked.rows[0]?.state === "revoked", revoked.rows[0]?.state);

/* ------------------------------------------------- somebody who is not an owner */

const outsider = await db.query(
  `select p.id from company.profiles p
    join company.roles r on r.key = p.role
   where p.is_active and not r.is_owner limit 1`,
);

if (outsider.rowCount) {
  await db.query("begin");
  await db.query("select set_config('role', 'authenticated', true)");
  await db.query(
    `select set_config('request.jwt.claims', json_build_object('sub', $1::text, 'role', 'authenticated')::text, true)`,
    [outsider.rows[0].id],
  );
  const seen = await db.query(`select * from control.demo_links()`);
  await db.query("rollback");
  check("somebody who is not an owner sees no links at all", seen.rowCount === 0, `${seen.rowCount} rows`);

  let refused = false;
  await db.query("begin");
  await db.query("select set_config('role', 'authenticated', true)");
  await db.query(
    `select set_config('request.jwt.claims', json_build_object('sub', $1::text, 'role', 'authenticated')::text, true)`,
    [outsider.rows[0].id],
  );
  try {
    await db.query(`select control.create_demo_link('${KEY}', $1::uuid, 'nope', 7)`, [VARIANT.id]);
  } catch {
    refused = true;
  }
  await db.query("rollback");
  check("and cannot issue one", refused);
} else {
  console.log("  (no non-owner account to test with)");
}

/* ---------------------------------------------------------------- tidy up */

await db.query(`delete from ${SCHEMA}.share_links where token = $1`, [token]);
const gone = await db.query(`select count(*)::int as n from ${SCHEMA}.share_links where token = $1`, [token]);
check("the check left nothing behind", gone.rows[0].n === 0);

console.log(failures === 0 ? "\n  the door works\n" : `\n  ${failures} failed\n`);
await db.end();
process.exitCode = failures === 0 ? 0 : 1;
