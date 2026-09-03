/**
 * Does every demo actually have what its code assumes?
 *
 * ---------------------------------------------------------------------------
 * **This asked a question that stopped being the right one on 2026-09-03.**
 *
 * It used to check that "an anonymous visitor can read published content while
 * being unable to read the enquiries", and that was exactly right while the
 * demos were public. They are opened by invitation now, and the migration that
 * made row-level security enforce that turned this green check red on four
 * demos in one run — reporting `0 variants, expected 3` and `can_view said
 * unknown`, which is the gate working, described as a fault.
 *
 * A check that calls a fix a fault is worse than no check: the next person
 * either "repairs" the policy or learns to ignore the output.
 *
 * ---------------------------------------------------------------------------
 * **What it asks now** is the same question in the shape the estate is in:
 *
 *   1. A visitor **holding a live link** reads that business and its published
 *      content, and still cannot read the enquiries.
 *   2. A visitor **holding nothing** reads nothing at all.
 *
 * Both halves matter. The first alone would pass on a demo that was wide open;
 * the second alone would pass on one that was broken shut.
 *
 * Still asked as the anonymous role, because that is the role a visitor arrives
 * with. The service role sees everything by definition and would prove nothing.
 */
import { createClient } from "@supabase/supabase-js";
import { loadConfig } from "./estate.mjs";

const config = loadConfig();

const URL_ = config.NEXT_PUBLIC_SUPABASE_URL;
const ANON = config.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE = config.SUPABASE_SERVICE_ROLE_KEY;

const DEMOS = [
  { schema: "demo_clinic", offer: "services", people: "doctors", enquiry: "appointments" },
  { schema: "demo_resto", offer: "dishes", people: "team", enquiry: "reservations" },
  { schema: "demo_school", offer: "courses", people: "faculty", enquiry: "admissions" },
  { schema: "demo_estate", offer: "listings", people: "agents", enquiry: "viewings" },
  { schema: "demo_crm", offer: "features", people: "team", enquiry: "trials" },
];

if (!SERVICE) {
  console.log("skip     no service key, and a link has to be minted to test with");
  process.exit(0);
}

let bad = 0;

for (const demo of DEMOS) {
  const problems = [];

  const service = createClient(URL_, SERVICE, {
    db: { schema: demo.schema },
    auth: { persistSession: false },
  });

  /* What exists, asked of the role that can see it. */
  const { data: allVariants } = await service
    .from("variants")
    .select("id, slug, visibility, is_default")
    .eq("is_active", true);

  const slugs = (allVariants ?? []).map((row) => row.slug);

  if (slugs.length !== 3) problems.push(`${slugs.length} variants, expected 3`);

  const target = allVariants?.[0];

  if (!target) {
    console.log(`WRONG    ${demo.schema}\n         · no businesses at all`);
    bad += 1;
    continue;
  }

  /* ------------------------------------------------------- with an invitation */

  const token = `check-demos-${crypto.randomUUID().replaceAll("-", "")}`;

  const { error: minted } = await service.from("share_links").insert({
    variant_id: target.id,
    token,
    label: "check:demos — removed at the end of the run",
    expires_at: new Date(Date.now() + 120_000).toISOString(),
  });

  if (minted) {
    console.log(`WRONG    ${demo.schema}\n         · could not mint a link: ${minted.message}`);
    bad += 1;
    continue;
  }

  const invited = createClient(URL_, ANON, {
    db: { schema: demo.schema },
    auth: { persistSession: false },
    /* The header the application sends from the redeemed cookie. Row security
       reads it through `request.headers`; see 20260903000070. */
    global: { headers: { "x-share-token": token } },
  });

  const [seen, offers, people, enquiries] = await Promise.all([
    invited.from("variants").select("slug"),
    invited.from(demo.offer).select("id"),
    invited.from(demo.people).select("id"),
    invited.from(demo.enquiry).select("id"),
  ]);

  const view = await invited.rpc("can_view", { p_slug: target.slug, p_token: token });

  /*
    Exactly one, and not three.

    A link opens *one* business — that is the whole point of it. Asserting
    "at least one" would pass on a policy that let an invitation to the dental
    clinic open the cardiology one beside it.
  */
  const publicCount = (allVariants ?? []).filter((row) => row.visibility === "public").length;
  const expected = Math.max(1, publicCount);

  if ((seen.data ?? []).length !== expected) {
    problems.push(
      `a link showed ${(seen.data ?? []).length} businesses, expected ${expected}` +
        (publicCount ? ` (${publicCount} of them deliberately public)` : ""),
    );
  }

  if ((offers.data ?? []).length === 0) problems.push(`no ${demo.offer} readable with a link`);
  if ((people.data ?? []).length === 0) problems.push(`no ${demo.people} readable with a link`);

  if ((enquiries.data ?? []).length > 0) {
    problems.push(`a visitor can read ${demo.enquiry} — they must not`);
  }

  if (view.error) problems.push(`can_view failed: ${view.error.message}`);
  else if (view.data?.[0]?.verdict !== "ok") problems.push(`can_view said ${view.data?.[0]?.verdict}`);

  /* ---------------------------------------------------- without an invitation */

  const stranger = createClient(URL_, ANON, {
    db: { schema: demo.schema },
    auth: { persistSession: false },
  });

  const [strangerVariants, strangerOffers] = await Promise.all([
    stranger.from("variants").select("slug"),
    stranger.from(demo.offer).select("id"),
  ]);

  if (publicCount === 0) {
    if ((strangerVariants.data ?? []).length > 0 || (strangerOffers.data ?? []).length > 0) {
      problems.push(
        `somebody with no link read ${(strangerVariants.data ?? []).length} businesses ` +
          `and ${(strangerOffers.data ?? []).length} ${demo.offer} — the door is open`,
      );
    }
  }

  await service.from("share_links").delete().eq("token", token);

  /* ---------------------------------------------------------------- the answer */

  if (problems.length === 0) {
    const note = publicCount ? ` · ${publicCount} deliberately public` : "";

    console.log(
      `ok       ${demo.schema.padEnd(12)} ${slugs.join(", ")} · ` +
        `${(offers.data ?? []).length} ${demo.offer}, ${(people.data ?? []).length} ${demo.people}${note}`,
    );
  } else {
    bad += 1;
    console.log(`WRONG    ${demo.schema}`);
    for (const problem of problems) console.log(`         · ${problem}`);
  }
}

console.log(
  "\n" +
    (bad === 0
      ? "All five demos open to a link and to nothing else."
      : `${bad} demo(s) wrong.`),
);

if (bad > 0) process.exitCode = 1;
