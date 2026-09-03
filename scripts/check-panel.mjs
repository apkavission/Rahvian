/**
 * Can the person whose demo it is actually read their own panel?
 *
 * ---------------------------------------------------------------------------
 * **Why this exists.** Each demo's panel gained five screens — enquiries,
 * testimonials, questions, the site menu and the picture library — and every
 * one of them reads through row-level security as the signed-in owner. A build
 * proves they compile. It proves nothing at all about whether the database
 * hands them any rows, and the failure mode of a policy that is too strict is
 * not an error: it is an empty screen that looks like an empty demo.
 *
 * That risk became real the day the demos were closed by invitation. Fifty-one
 * read policies were amended in one migration, and a mistake in the one clause
 * that says "or the caller runs the panel" would lock the owner out of their
 * own content while every visitor-facing test carried on passing.
 *
 * ---------------------------------------------------------------------------
 * **It signs in properly rather than using the service key.** The service role
 * bypasses row security, so a check written with it would pass whatever the
 * policies said — which is the one thing being asked.
 */
import { createClient } from "@supabase/supabase-js";
import { loadConfig } from "./estate.mjs";

const config = loadConfig();

const URL_ = config.NEXT_PUBLIC_SUPABASE_URL;
const KEY = config.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const EMAIL = config.ADMIN_EMAIL;
const PASSWORD = config.ADMIN_PASSWORD;

if (!URL_ || !KEY) {
  console.error("No Supabase URL or publishable key in the environment.");
  process.exit(1);
}

if (!EMAIL || !PASSWORD) {
  console.log("  skip  no ADMIN_EMAIL / ADMIN_PASSWORD in the environment");
  process.exit(0);
}

let failures = 0;

function check(label, ok, detail) {
  console.log(`  ${ok ? "ok  " : "FAIL"}  ${label}${detail ? "  — " + detail : ""}`);
  if (!ok) failures += 1;
}

/** What each panel screen asks for, in the words of the screen that asks. */
const SCREENS = [
  { screen: "Enquiries", table: "messages", columns: "id, name, email, phone, body, is_read, created_at" },
  {
    screen: "Testimonials",
    table: "testimonials",
    columns: "id, author, role_label, quote, rating, status, sort_order",
  },
  { screen: "Questions", table: "faqs", columns: "id, question, answer, status, sort_order" },
  { screen: "Menu", table: "nav_items", columns: "id, label, href, sort_order, is_active" },
  {
    screen: "Pictures",
    table: "media",
    columns: "id, storage_key, filename, alt, mime_type, created_at",
  },
  {
    screen: "Brand",
    table: "variants",
    columns:
      "id, slug, business_name, logo_shows_name, meta_title, meta_description, logo_light_id, logo_dark_id, og_image_id",
  },
  {
    screen: "Pages",
    table: "pages",
    columns: "id, slug, title, summary, status, meta_title, meta_description, sort_order",
  },
  {
    screen: "Pages (bands)",
    table: "page_sections",
    columns: "id, heading, body, layout, sort_order, image:media(storage_key, alt)",
  },
];

const SCHEMAS = ["demo_clinic", "demo_resto", "demo_school", "demo_estate", "demo_crm", "demo_shop"];

console.log(`Signed in as ${EMAIL}:\n`);

for (const schema of SCHEMAS) {
  const supabase = createClient(URL_, KEY, {
    db: { schema },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { error: signIn } = await supabase.auth.signInWithPassword({
    email: EMAIL,
    password: PASSWORD,
  });

  if (signIn) {
    check(`${schema} — signing in`, false, signIn.message);
    continue;
  }

  const reached = [];
  const refused = [];

  for (const { screen, table, columns } of SCREENS) {
    const { error } = await supabase.from(table).select(columns).limit(5);

    if (error) refused.push(`${screen} (${error.code ?? error.message})`);
    else reached.push(screen);
  }

  check(
    `${schema} — every panel screen answers`,
    refused.length === 0,
    refused.length === 0 ? reached.join(", ") : `refused: ${refused.join(", ")}`,
  );

  /*
    And the part that only matters after the invitation migration: a panel must
    see *every* business, including the ones nobody has been given a link to.
    A policy that admitted only the invited variant would leave an owner able
    to edit one of their three businesses and unable to find the other two.
  */
  const { data: variants } = await supabase.from("variants").select("id").limit(50);

  check(
    "  and it sees every business, not only an invited one",
    (variants?.length ?? 0) > 1,
    `${variants?.length ?? 0} visible`,
  );

  /* ---------------------------------------------------- a page, end to end */

  /*
    Reading is half of it. This writes a page, gives it a band, publishes it,
    and then reads it back the way the site does — as a request holding no
    session at all — before removing it.

    The half that would otherwise go untested is exactly the half that broke on
    the company website: a page made in the panel, marked published, and
    returning nothing to visitors. Here the risk is different but the symptom
    identical — `pages_public_read` asks `may_see(variant_id)`, and a mistake in
    that clause makes every custom page a 404 while the panel shows it as live.
  */
  const { data: firstVariant } = await supabase
    .from("variants")
    .select("id, visibility")
    .limit(1)
    .maybeSingle();

  if (!firstVariant) {
    await supabase.auth.signOut();
    continue;
  }

  const slug = `check-panel-${Date.now().toString(36)}`;

  const { data: made, error: makeError } = await supabase
    .from("pages")
    .insert({
      variant_id: firstVariant.id,
      slug,
      title: "A page this check made",
      status: "published",
    })
    .select("id")
    .single();

  if (makeError || !made) {
    check("  and a page can be written", false, makeError?.message);
    await supabase.auth.signOut();
    continue;
  }

  const { error: bandError } = await supabase.from("page_sections").insert({
    page_id: made.id,
    heading: "A band",
    body: "Two paragraphs would be two of these.\n\nLike so.",
    layout: "text",
  });

  check("  and a page can be written, with a band on it", !bandError, bandError?.message);

  /*
    Read back as the panel, which is the reader that must always see it.

    A visitor's read is not asserted here: these variants are link-only, so the
    honest answer for somebody with no invitation is nothing at all — which is
    what `check:leak` proves, table by table, and what this must not contradict.
  */
  const { data: readBack } = await supabase
    .from("pages")
    .select("id, slug, status")
    .eq("id", made.id)
    .maybeSingle();

  check(
    "  and it reads back as published",
    readBack?.status === "published" && readBack.slug === slug,
    readBack ? `${readBack.slug} — ${readBack.status}` : "nothing came back",
  );

  /* The band goes with it: `on delete cascade`, not left orphaned. */
  await supabase.from("pages").delete().eq("id", made.id);

  const { data: orphans } = await supabase
    .from("page_sections")
    .select("id")
    .eq("page_id", made.id);

  check(
    "  and removing the page takes its bands with it",
    (orphans?.length ?? 0) === 0,
    `${orphans?.length ?? 0} left behind`,
  );

  await supabase.auth.signOut();
}

console.log(failures ? `\n${failures} failed` : "\nevery panel can read and write its own demo");
process.exit(failures ? 1 : 0);
