/**
 * Does every demo actually have what its code assumes?
 *
 * Five schemas, the same questions each time: are the tables there, does the
 * access function answer, and can an anonymous visitor read published content
 * while being unable to read the enquiries.
 *
 * Asked as the anonymous role rather than the service role, because that is the
 * role a visitor arrives with — the service role sees everything by definition
 * and would prove nothing.
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

const config = Object.fromEntries(
  readFileSync("c:/Users/kumar/portal/.env.local", "utf8")
    .split(/\r?\n/)
    .map((line) => /^([A-Z_]+)=(.*)$/.exec(line.trim()))
    .filter(Boolean)
    .map((m) => [m[1], m[2].replace(/^"|"$/g, "")]),
);

const DEMOS = [
  { schema: "demo_clinic", offer: "services", people: "doctors", enquiry: "appointments" },
  { schema: "demo_resto", offer: "dishes", people: "team", enquiry: "reservations" },
  { schema: "demo_school", offer: "courses", people: "faculty", enquiry: "admissions" },
  { schema: "demo_estate", offer: "listings", people: "agents", enquiry: "viewings" },
  { schema: "demo_crm", offer: "features", people: "team", enquiry: "trials" },
];

let bad = 0;

for (const demo of DEMOS) {
  const anon = createClient(config.NEXT_PUBLIC_SUPABASE_URL, config.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    db: { schema: demo.schema },
    auth: { persistSession: false },
  });

  const [variants, offers, people, enquiries] = await Promise.all([
    anon.from("variants").select("slug, visibility, is_default"),
    anon.from(demo.offer).select("id"),
    anon.from(demo.people).select("id"),
    anon.from(demo.enquiry).select("id"),
  ]);

  const slugs = (variants.data ?? []).map((v) => v.slug);
  const view = await anon.rpc("can_view", { p_slug: slugs[0] ?? "", p_token: null });

  const problems = [];
  if (slugs.length !== 3) problems.push(`${slugs.length} variants, expected 3`);
  if ((offers.data ?? []).length === 0) problems.push(`no ${demo.offer} readable`);
  if ((people.data ?? []).length === 0) problems.push(`no ${demo.people} readable`);
  if ((enquiries.data ?? []).length > 0)
    problems.push(`a visitor can read ${demo.enquiry} — they must not`);
  if (view.error) problems.push(`can_view failed: ${view.error.message}`);
  if (view.data?.[0]?.verdict !== "ok") problems.push(`can_view said ${view.data?.[0]?.verdict}`);

  if (problems.length === 0) {
    console.log(
      `ok       ${demo.schema.padEnd(12)} ${slugs.join(", ")} · ${(offers.data ?? []).length} ${demo.offer}, ${(people.data ?? []).length} ${demo.people}`,
    );
  } else {
    bad += 1;
    console.log(`WRONG    ${demo.schema}`);
    for (const problem of problems) console.log(`         · ${problem}`);
  }
}

console.log("\n" + (bad === 0 ? "All five demos answer correctly to an anonymous visitor." : `${bad} demo(s) wrong.`));
if (bad > 0) process.exitCode = 1;
