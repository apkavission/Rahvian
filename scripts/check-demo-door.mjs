/**
 * The door to every demo, from outside — over HTTP, against the running sites.
 *
 * ---------------------------------------------------------------------------
 * **Why this exists beside `check:access`.**
 *
 * That one asks the database whether it refuses the right people, and it is the
 * stronger check of the two: it signs in as a real owner and exercises the
 * whole cycle. What it cannot see is whether the *site* asks. A proxy that
 * forgot to call `can_view`, a matcher that stopped covering a path, a redirect
 * that goes to the wrong place — every one of those leaves the database
 * perfectly correct and the demo wide open.
 *
 * So this is the same questions asked through the front door, and the two
 * together are what "nobody can open a demo" actually rests on.
 *
 * ---------------------------------------------------------------------------
 * **A demo that is not running is skipped, loudly.**
 *
 * Six dev servers are rarely up at once, and a check that failed on that would
 * be a check nobody runs. It says which ones it walked and which it could not
 * reach, so a green run cannot be mistaken for a complete one.
 *
 * ---------------------------------------------------------------------------
 * **It writes to the real database, and cleans up after itself.** One share
 * link per demo, labelled so a human who finds one knows what it is, deleted at
 * the end and deleted again on the next run if a crash left one behind.
 */
import pg from "pg";
import { loadConfig, dbClient } from "./estate.mjs";

const LABEL = "Automated check — safe to delete";

const db = dbClient(pg, loadConfig());
await db.connect();

let failures = 0;
let walked = 0;
const missing = [];

/* Demos with nothing behind a link, so nothing here to test. */
const ungated = [];

function check(label, ok, detail) {
  console.log(`    ${ok ? "ok  " : "FAIL"}  ${label}${detail ? "  — " + detail : ""}`);
  if (!ok) failures += 1;
}

/**
 * A browser: one cookie jar, redirects followed by hand.
 *
 * Followed by hand so the final address is visible — `fetch`'s own redirect
 * handling would report a 200 for a page that is really the expired screen,
 * which is the exact failure this is looking for.
 */
function browser() {
  const jar = new Map();

  return async function go(base, path, { follow = true } = {}) {
    let url = base + path;
    let response;

    for (let hop = 0; hop < 5; hop += 1) {
      response = await fetch(url, {
        redirect: "manual",
        headers: {
          cookie: [...jar].map(([key, value]) => `${key}=${value}`).join("; "),
          "user-agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/131.0 Safari/537.36",
        },
      });

      for (const raw of response.headers.getSetCookie()) {
        const [pair] = raw.split(";");
        const at = pair.indexOf("=");
        jar.set(pair.slice(0, at).trim(), pair.slice(at + 1).trim());
      }

      const next = response.headers.get("location");
      if (!follow || !next || response.status < 300 || response.status >= 400) break;

      url = new URL(next, url).toString();
    }

    return { url, status: response.status, text: await response.text() };
  };
}

/** Text as it appears in a document React rendered, rather than as it is stored. */
function asHtml(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Is anything answering there at all? */
async function awake(base) {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4000);
    await fetch(base, { redirect: "manual", signal: controller.signal });
    clearTimeout(timer);
    return true;
  } catch {
    return false;
  }
}

const demos = await db.query(
  `select key, name, base_url, db_schema
     from control.applications
    where kind = 'demo' and db_schema is not null and is_active
    order by sort_order`,
);

for (const demo of demos.rows) {
  const base = demo.base_url.replace(/\/+$/, "");

  if (!(await awake(base))) {
    missing.push(`${demo.name} (${base})`);
    continue;
  }

  console.log(`\n  ${demo.name} — ${base}`);
  walked += 1;

  /* Anything a previous run left behind, before this one adds its own. */
  await db.query(`delete from ${demo.db_schema}.share_links where label = $1`, [LABEL]);

  /*
    A business that is deliberately open to the world cannot be used to test the
    gate — a stranger is *meant* to get in.

    This picked the first active variant and then failed six assertions when
    somebody opened that one to the public from the estate screen, which read as
    "the door is broken" and was in fact "the door is open because you opened
    it". Now it tests with a closed one and says plainly which are open.
  */
  const variant = await db.query(
    `select id, slug, business_name from ${demo.db_schema}.variants
      where is_active and visibility = 'link_only'
      order by sort_order limit 1`,
  );

  const openToWorld = await db.query(
    `select slug from ${demo.db_schema}.variants
      where is_active and visibility = 'public' order by sort_order`,
  );

  if (openToWorld.rowCount > 0) {
    console.log(
      `    note  open to anybody, so not gated: ${openToWorld.rows.map((row) => row.slug).join(", ")}`,
    );
  }

  if (variant.rowCount === 0) {
    /*
      Not a failure. Every business here being open to the world is a decision
      somebody made on the estate screen, and this check has nothing left to
      test — the same shape as a demo that is not running. Counting it as a
      failure would train whoever runs this to ignore a red line.
    */
    ungated.push(
      openToWorld.rowCount > 0
        ? `${demo.name} — every business is open to anybody`
        : `${demo.name} — no active businesses`,
    );
    walked -= 1;
    continue;
  }

  const { id, slug, business_name: business } = variant.rows[0];

  /* ------------------------------------------------------------- a stranger */

  const stranger = browser();
  const cold = await stranger(base, `/${slug}`);

  check("a stranger is sent to the expired screen", cold.url.endsWith("/expired"), cold.url);
  check("and learns nothing about any link", cold.text.includes("This link is no longer open"));

  const root = await stranger(base, "/");
  check("the bare address is closed too", root.url.endsWith("/expired"), root.url);

  /* ------------------------------------------------------------ with a link */

  const made = await db.query(
    `insert into ${demo.db_schema}.share_links (variant_id, token, label, expires_at)
     values ($1, replace(gen_random_uuid()::text,'-','') || replace(gen_random_uuid()::text,'-',''),
             $2, now() + interval '7 days')
     returning id, token`,
    [id, LABEL],
  );
  const link = made.rows[0];

  const client = browser();
  const opened = await client(base, `/s/${link.token}`);

  check("a link opens the demo", opened.url.endsWith(`/${slug}`), opened.url);
  check("and the page renders", opened.status === 200, String(opened.status));

  const first = await db.query(
    `select view_count from ${demo.db_schema}.share_links where id = $1`, [link.id],
  );
  check("the opening is counted", first.rows[0].view_count === 1, String(first.rows[0].view_count));

  await client(base, `/${slug}`);
  await client(base, `/${slug}`);

  const still = await db.query(
    `select view_count from ${demo.db_schema}.share_links where id = $1`, [link.id],
  );
  check(
    "reading more pages is still one opening",
    still.rows[0].view_count === 1,
    String(still.rows[0].view_count),
  );

  const opens = await db.query(
    `select user_agent from ${demo.db_schema}.share_link_opens where link_id = $1`, [link.id],
  );
  check(
    "with the browser on the record, one by one",
    opens.rowCount === 1 && /Chrome/.test(opens.rows[0].user_agent ?? ""),
    `${opens.rowCount} rows`,
  );

  /* While the link is live: the only moment this means anything. Somebody
     holding a dead link is a stranger, and a stranger may see a sign-in page. */
  const panel = await client(base, "/admin", { follow: false });
  check("a live link is sent away from the panel", panel.status >= 300 && panel.status < 400, String(panel.status));

  /* --------------------------------------------------------------- expiry */

  await db.query(
    `update ${demo.db_schema}.share_links
        set created_at = now() - interval '30 days', expires_at = now() - interval '1 day'
      where id = $1`,
    [link.id],
  );

  const dead = await client(base, `/${slug}`);
  check("an expired link stops opening it", dead.url.endsWith("/expired"), dead.url);
  check("and the screen says it expired", dead.text.includes("This link has expired"));
  check(
    "and says when",
    /It stopped working on \d/.test(dead.text),
    dead.text.match(/It stopped working on [^<]+/)?.[0],
  );
  /*
    Escaped before looking for it.

    "Saffron & Smoke" is `Saffron &amp; Smoke` in the document, so a plain
    substring search reports the restaurant demo failing to name its own
    business while the screen says it perfectly well. The check was wrong, not
    the page — and a check that cries wolf about the one demo with punctuation
    in its name is a check somebody starts ignoring.
  */
  check("and which business it was for", dead.text.includes(asHtml(business)), business);

  /* The same screen, at the same moment, to somebody holding nothing. */
  const passer = browser();
  const vague = await passer(base, `/${slug}`);
  check(
    "a stranger is still told nothing on that screen",
    vague.text.includes("This link is no longer open") &&
      !vague.text.includes("It stopped working on"),
  );

  /* ------------------------------------------------------- closed by hand */

  await db.query(
    `update ${demo.db_schema}.share_links
        set expires_at = now() + interval '7 days', revoked_at = now()
      where id = $1`,
    [link.id],
  );

  const closed = await client(base, `/${slug}`);
  check("a closed link says it was closed", closed.text.includes("This link has been closed"));

  await db.query(`delete from ${demo.db_schema}.share_links where id = $1`, [link.id]);
  const gone = await db.query(
    `select count(*)::int as n from ${demo.db_schema}.share_links where id = $1`, [link.id],
  );
  check("nothing left behind", gone.rows[0].n === 0);
}

console.log("");

if (missing.length) {
  console.log(`  not running, so not checked: ${missing.join(", ")}`);
}

for (const line of ungated) console.log(`  nothing to test: ${line}`);

/*
  Nothing walked, and two very different reasons for it.

  This said "no demo was running. Start one and run this again" whichever it
  was — and after every business in every demo was opened to the public on
  2026-09-12, it said that with all six demos running and answering, three lines
  below its own list of the six it had just reached and found ungated. A check
  that contradicts itself in its last sentence is a check people stop reading.

  There is no door left to test because there is no door, which is the state the
  owner asked for. That is reported as exactly that, and it exits clean: an
  invitation-only demo is a feature that was deliberately removed, not one that
  has silently broken.
*/
if (walked === 0) {
  if (ungated.length > 0 && missing.length === 0) {
    console.log(
      "  every business in every demo is open to the public, so there is no door\n" +
        "  to shut and nothing here to test. Close one on the estate screen if you\n" +
        "  want this check to have something to do.\n",
    );
    await db.end();
    process.exit(0);
  }

  console.log("  no demo was running. Start one and run this again.\n");
  await db.end();
  process.exit(1);
}

console.log(
  failures === 0
    ? `  ${walked} of ${demos.rowCount} demos walked, every door shut\n`
    : `  ${failures} failed across ${walked} demos\n`,
);

await db.end();
process.exitCode = failures === 0 ? 0 : 1;
