/**
 * Who actually holds power across the estate, as opposed to who looks like they
 * do.
 *
 * ---------------------------------------------------------------------------
 * **Why this exists.**
 *
 * A person has two rows: one in `portal.staff`, which decides what they see in
 * the portal and the tracker, and one in `company.profiles`, which decides
 * whether `control.is_owner()` is true for them — and that flag is what every
 * `control` function checks before handing over the estate.
 *
 * The two are kept in step by remembering to. `portal.staff` has said so since
 * the day it was written:
 *
 *   > a person who joins or leaves must be added or removed in both.
 *
 * Nothing fails when they drift. Somebody can read "Developer" beside their
 * name on every screen in the tracker and still be an estate owner, able to
 * manage all staff and read every salary slip. That is not a hole in any
 * policy — every policy is doing exactly what it says — which is precisely why
 * no test catches it.
 *
 * This was found by a test that PASSED for the wrong reason: a refusal check
 * against a "developer" who was an admin on the website, which failed on a
 * duplicate key rather than on permission and still reported green.
 *
 * ---------------------------------------------------------------------------
 * Run: `node scripts/check-privileges.mjs`
 */

import { createRequire } from "node:module";
import { loadConfig, dbClient } from "./estate.mjs";

const require = createRequire(import.meta.url);
const pg = require("pg");

const db = dbClient(pg, loadConfig());
await db.connect();

let wrong = 0;
const problem = (message) => {
  wrong += 1;
  console.log(`  WRONG  ${message}`);
};

console.log("Who holds the estate\n");

const { rows: people } = await db.query(`
  select
    s.full_name,
    s.email,
    s.is_active                        as active_in_portal,
    s.role_key                         as portal_role,
    p.role                             as company_role,
    p.is_active                        as active_on_website,
    coalesce(r.is_owner, false)        as is_estate_owner,
    coalesce(pr.is_owner, false)       as portal_role_is_owner
  from portal.staff s
  left join company.profiles p on p.id = s.auth_user_id
  left join company.roles   r  on r.key = p.role
  left join company.roles   pr on pr.key = s.role_key
  where s.auth_user_id is not null
  order by lower(s.full_name)
`);

console.log(
  `  ${"Name".padEnd(18)}${"Portal".padEnd(12)}${"Website".padEnd(12)}Holds the estate`,
);
console.log("  " + "-".repeat(58));

for (const person of people) {
  console.log(
    `  ${String(person.full_name).padEnd(18)}` +
      `${String(person.portal_role ?? "—").padEnd(12)}` +
      `${String(person.company_role ?? "—").padEnd(12)}` +
      `${person.is_estate_owner ? "YES" : "no"}`,
  );
}

console.log();

/*
  The two roles disagreeing is the finding.

  Not "is anybody an owner" — somebody has to be. The question is whether
  anybody is an owner *without it being visible* on the screens they use every
  day, because that is the version nobody notices.
*/
for (const person of people) {
  if (person.is_estate_owner !== person.portal_role_is_owner) {
    problem(
      `${person.full_name} is "${person.portal_role}" in the portal but ` +
        `"${person.company_role}" on the website — ` +
        (person.is_estate_owner
          ? "so they hold the whole estate, including everybody's salary slips, " +
            "while every tracker screen calls them a developer."
          : "so they look like an admin in the portal and cannot actually " +
            "manage anything."),
    );
  }
}

/* Somebody who has left one list and not the other. */
for (const person of people) {
  if (person.company_role === null) {
    problem(
      `${person.full_name} is on the portal staff list with no website account — ` +
        "they can open the tracker and nothing here can manage them.",
    );
  } else if (person.active_in_portal && person.active_on_website === false) {
    problem(
      `${person.full_name} is switched off on the website but still active in ` +
        "the portal, so they can still sign in to the tracker.",
    );
  }
}

/*
  One account, two sides of the company.

  `portal.current_staff_id()` and `portal.current_client_user_id()` both answer
  from `auth.uid()`, so an account with a row in `staff` *and* a row in
  `client_users` is treated as staff and as a client at once. Every policy
  written as "you are the staff member, or you are the client" then matches
  twice for that person.

  This is not theoretical. It is how a real hole got in on 2026-09-02: a guard
  read `me_client is not null and author_client_user_id = me_client`, which for
  a staff member with a client row became `true and NULL` — NULL, not false — so
  `if not (...)` never fired and one person edited another person's message. The
  guard is fixed; this is what reports the situation that revealed it.
*/
const { rows: both } = await db.query(`
  select s.full_name as staff_name, cu.full_name as client_name, c.name as client
  from portal.staff s
  join portal.client_users cu on cu.auth_user_id = s.auth_user_id
  left join portal.clients c on c.id = cu.client_id
`);

for (const person of both) {
  problem(
    `${person.staff_name} is on the staff list and is also a client user ` +
      `("${person.client_name}"${person.client ? ` at ${person.client}` : ""}) on the same ` +
      "account — so every rule of the form \"staff or client\" matches them twice.",
  );
}

/*
  And the thing all of that actually protects: who can read a salary slip.

  Asked of the database rather than reasoned about, because the policy is the
  only thing that decides it.
*/
const { rows: readers } = await db.query(`
  select s.full_name, s.auth_user_id
  from portal.staff s
  where s.auth_user_id is not null and s.is_active
`);

const canRead = [];

await db.query("begin");
const { rows: [subject] } = await db.query(
  "select id, full_name from portal.staff where is_active limit 1",
);
const { rows: [slip] } = await db.query(
  `insert into portal.documents
     (kind_key, title, staff_id, amount, period_start, period_end)
   values ('salary_slip', 'Privilege check', $1, 1, '1999-01-01', '1999-01-31')
   returning id`,
  [subject.id],
);

for (const person of readers) {
  await db.query("savepoint p");
  await db.query("set local role authenticated");
  await db.query("select set_config('request.jwt.claims', $1, true)", [
    JSON.stringify({ sub: person.auth_user_id, role: "authenticated" }),
  ]);

  const { rows } = await db.query("select id from portal.documents where id = $1", [
    slip.id,
  ]);

  await db.query("reset role");
  await db.query("release savepoint p");

  if (rows.length > 0) canRead.push(person.full_name);
}
await db.query("rollback");

console.log(`  A salary slip for ${subject.full_name} is readable by:`);
for (const name of canRead) console.log(`    · ${name}`);

/* The person themselves, plus the admins. Anybody else is the finding. */
const expected = new Set([
  subject.full_name,
  ...people.filter((p) => p.is_estate_owner).map((p) => p.full_name),
]);

for (const name of canRead) {
  if (!expected.has(name)) {
    problem(`${name} can read somebody else's salary slip and should not.`);
  }
}

console.log("\n" + "-".repeat(60));

if (wrong === 0) {
  console.log(`${people.length} people checked, nothing out of place.`);
} else {
  console.log(`${wrong} thing${wrong === 1 ? "" : "s"} to put right.`);
  process.exitCode = 1;
}

await db.end();
