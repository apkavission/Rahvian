/**
 * Can a stranger read a demo?
 *
 * ---------------------------------------------------------------------------
 * **Why this exists.** `check:door` proves the *application* turns an
 * uninvited visitor away, by asking the running site for a page. It passed
 * throughout the afternoon the database was answering the same question to
 * anybody who asked it directly:
 *
 *     curl "$SUPABASE_URL/rest/v1/courses?select=*" \
 *       -H "apikey: $PUBLISHABLE_KEY" -H "Accept-Profile: demo_school"
 *
 * The publishable key is not a secret — it is shipped to browsers by design.
 * Every `*_public_read` policy asked whether a row was *finished*, never who
 * was asking, so that request returned every published course, doctor, listing
 * and price in the estate.
 *
 * This check asks the database the question the door asks, using the same key
 * anybody can read out of a page. It fails if a stranger sees anything that is
 * not deliberately public.
 *
 * ---------------------------------------------------------------------------
 * **Public is a decision, not a fault.** A variant somebody opened on purpose
 * is expected to be readable, and it is named rather than counted, so the
 * output says exactly what is exposed and to whom.
 */
import { loadConfig } from "./estate.mjs";

const config = loadConfig();

const URL_ = config.NEXT_PUBLIC_SUPABASE_URL;
const KEY = config.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!URL_ || !KEY) {
  console.error("No Supabase URL or publishable key in the environment.");
  process.exit(1);
}

/** Every schema, and the tables in it whose whole purpose is to be read. */
const DEMOS = {
  demo_clinic: ["variants", "doctors", "services", "testimonials", "faqs", "nav_items", "pages", "page_sections"],
  demo_resto: ["variants", "dishes", "team", "testimonials", "faqs", "nav_items", "pages", "page_sections"],
  demo_school: ["variants", "courses", "faculty", "testimonials", "faqs", "nav_items", "pages", "page_sections"],
  demo_estate: ["variants", "listings", "agents", "testimonials", "faqs", "nav_items", "pages", "page_sections"],
  demo_crm: ["variants", "features", "team", "testimonials", "faqs", "nav_items", "pages", "page_sections"],
  demo_shop: [
    "variants",
    "products",
    "collections",
    "team",
    "testimonials",
    "faqs",
    "nav_items",
    "product_images",
    "product_options",
    "pages",
    "page_sections",
  ],
};

let failures = 0;

function check(label, ok, detail) {
  console.log(`  ${ok ? "ok  " : "FAIL"}  ${label}${detail ? "  — " + detail : ""}`);
  if (!ok) failures += 1;
}

/** One read, made exactly as a stranger with a browser would make it. */
async function read(schema, table, token) {
  const headers = { apikey: KEY, Authorization: `Bearer ${KEY}`, "Accept-Profile": schema };
  if (token) headers["x-share-token"] = token;

  const response = await fetch(`${URL_}/rest/v1/${table}?select=id&limit=200`, { headers });

  if (!response.ok) {
    /* A refusal is a pass, not an error: it is the database saying no. */
    return { rows: 0, refused: `${response.status}` };
  }

  return { rows: (await response.json()).length };
}

/* ------------------------------------------------------------- who is open */

/*
  Read with the service key, because the question is what *exists*, and the
  point of the check is that the publishable key can no longer answer it.
*/
const service = config.SUPABASE_SERVICE_ROLE_KEY;

async function publicSlugs(schema) {
  if (!service) return null;

  const response = await fetch(
    `${URL_}/rest/v1/variants?select=slug&visibility=eq.public&is_active=is.true`,
    { headers: { apikey: service, Authorization: `Bearer ${service}`, "Accept-Profile": schema } },
  );

  if (!response.ok) return null;
  return (await response.json()).map((row) => row.slug);
}

/* ------------------------------------------------------------------ asking */

console.log("A stranger, holding only the key every browser is given:\n");

for (const [schema, tables] of Object.entries(DEMOS)) {
  const open = await publicSlugs(schema);
  const isOpen = open === null ? null : open.length > 0;

  let seen = 0;
  const reached = [];

  for (const table of tables) {
    const { rows } = await read(schema, table, null);
    seen += rows;
    if (rows) reached.push(`${table}:${rows}`);
  }

  if (isOpen) {
    console.log(
      `  note  ${schema} — ${open.length} business${open.length === 1 ? "" : "es"} deliberately public (${open.join(", ")}), so ${seen} rows are readable on purpose`,
    );
    continue;
  }

  check(
    `${schema} shows a stranger nothing`,
    seen === 0,
    seen === 0 ? "every table empty" : `LEAKING ${reached.join(", ")}`,
  );
}

/* ------------------------------------------------ and an invited one still reads */

/*
  A gate that turns everybody away is not a gate, it is a wall. The second half
  of the proof is that a live token still opens exactly one business — checked
  against a demo that is closed, so the answer cannot come from it being public.
*/
console.log("\nAnd somebody holding a live link:\n");

if (!service) {
  console.log("  skip  no service key in the environment, cannot mint a link to test with");
} else {
  const closed = [];

  for (const schema of Object.keys(DEMOS)) {
    const open = await publicSlugs(schema);
    if (open && open.length === 0) closed.push(schema);
  }

  if (closed.length === 0) {
    console.log("  skip  every demo is open to the public, so there is nothing to let anybody into");
  } else {
    const schema = closed[0];

    /*
      "Not revoked and not expired" is not the same as "will open something".

      A link may also be used up — `max_views` reached — and `admitted_variant()`
      checks that, correctly. Asking for one row with no order and without that
      condition picked a spent link out of the clinic's four and reported the
      gate as broken: `a link should open one business, not 0`. The database was
      right and the check was wrong, which is the expensive way round.
    */
    const links = await fetch(
      `${URL_}/rest/v1/share_links?select=token,variant_id,view_count,max_views` +
        `&revoked_at=is.null&expires_at=gt.${new Date().toISOString()}` +
        `&order=created_at.desc&limit=20`,
      { headers: { apikey: service, Authorization: `Bearer ${service}`, "Accept-Profile": schema } },
    );

    let live = (links.ok ? await links.json() : []).filter(
      (row) => row.max_views === null || row.view_count < row.max_views,
    );
    let minted = null;

    /*
      No live link is not a reason to skip the half of the proof that matters
      most. One is made, used, and removed — a check that cannot run is a check
      that quietly stops being run.
    */
    if (live.length === 0) {
      const variants = await fetch(
        `${URL_}/rest/v1/variants?select=id&is_active=is.true&limit=1`,
        { headers: { apikey: service, Authorization: `Bearer ${service}`, "Accept-Profile": schema } },
      );

      const [variant] = variants.ok ? await variants.json() : [];

      if (variant) {
        const token = `check-leak-${crypto.randomUUID().replaceAll("-", "")}`;

        const made = await fetch(`${URL_}/rest/v1/share_links`, {
          method: "POST",
          headers: {
            apikey: service,
            Authorization: `Bearer ${service}`,
            "Content-Profile": schema,
            "Content-Type": "application/json",
            Prefer: "return=representation",
          },
          body: JSON.stringify({
            variant_id: variant.id,
            token,
            label: "check:leak — removed as soon as it is used",
            expires_at: new Date(Date.now() + 60_000).toISOString(),
          }),
        });

        if (made.ok) {
          minted = (await made.json())[0];
          live = [minted];
        }
      }
    }

    if (live.length === 0) {
      console.log(`  skip  could not get a live link for ${schema}`);
    } else {
      const { rows } = await read(schema, "variants", live[0].token);

      check(
        `a live link opens exactly one business in ${schema}`,
        rows === 1,
        rows === 1 ? "one, as invited" : `${rows} — a link should open one business, not ${rows}`,
      );

      const content = await read(schema, "testimonials", live[0].token);
      check(
        "and its content comes with it",
        !content.refused,
        content.refused ? `refused ${content.refused}` : `${content.rows} rows`,
      );

      /* And the same token, once it is dead, opens nothing. */
      if (minted) {
        await fetch(`${URL_}/rest/v1/share_links?id=eq.${minted.id}`, {
          method: "DELETE",
          headers: { apikey: service, Authorization: `Bearer ${service}`, "Content-Profile": schema },
        });

        const after = await read(schema, "variants", minted.token);
        check(
          "and the same token opens nothing once it is gone",
          after.rows === 0,
          after.rows === 0 ? "shut" : `${after.rows} rows on a dead token`,
        );
      }
    }
  }
}

console.log(failures ? `\n${failures} failed` : "\nnothing leaks");
process.exit(failures ? 1 : 0);
