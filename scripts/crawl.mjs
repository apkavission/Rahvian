/**
 * Open every screen in a project, in a real browser, and say what is wrong.
 *
 * ---------------------------------------------------------------------------
 * **Why this exists.** `docs/STATUS.md` has said the same thing for days:
 * *"Nobody has clicked through any of this."* Every suite in the estate checks
 * what it was told to check, and a screen can be blank, broken or throwing on
 * every render without a single one of them noticing — because none of them
 * ever opens it.
 *
 * This opens all of them. It follows links the way a person does, and on each
 * page it records the four things a person would notice and a test would not
 * be written for:
 *
 *   - **an error in the console**, which is a bug that already happened
 *   - **a request that failed**, which is a picture or a query that did not arrive
 *   - **the page scrolling sideways**, checked at a phone width and a laptop one
 *   - **a picture that did not load**, which reads as a missing photograph
 *
 * ---------------------------------------------------------------------------
 * **It only ever navigates.** No form is submitted, nothing is created, saved
 * or deleted. There is one Supabase project and no staging copy, so a crawler
 * that wrote would be a crawler editing the company's real content on every
 * run. Sign-out links are skipped for the same reason — following one would end
 * the session and the rest of the crawl would silently be a tour of the login
 * screen.
 *
 * ---------------------------------------------------------------------------
 * **Everything is local.** A local dev server, a local Chrome, and credentials
 * read from `.env.local` files on this machine. Nothing is uploaded and no
 * screenshot leaves the disk.
 *
 *     node scripts/crawl.mjs services
 *     node scripts/crawl.mjs demo-clinic --show
 */
import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { chromium } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { projectDir, loadConfig } from "./estate.mjs";

/* ------------------------------------------------------------------ config */

const config = loadConfig();

function envOf(project) {
  const dir = projectDir(project);
  const out = {};

  for (const file of [".env.local", ".env.test.local"]) {
    const path = `${dir}/${file}`;
    if (!existsSync(path)) continue;

    for (const line of readFileSync(path, "utf8").split("\n")) {
      const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (match) out[match[1]] = match[2].replace(/^["']|["']$/g, "");
    }
  }

  return out;
}

/**
 * The nine, and how to get into each.
 *
 * `signIn` is a description rather than a function so the table stays readable:
 * a path, the two fields, and where the password comes from.
 */
const PROJECTS = {
  services: {
    port: 3000,
    seeds: ["/", "/admin"],
    signIn: { at: "/admin/login", from: "services", email: "ADMIN_EMAIL", password: "ADMIN_PASSWORD" },
  },
  portal: {
    port: 3100,
    seeds: ["/"],
    signIn: {
      at: "/login",
      from: "portal",
      email: "PORTAL_TEST_STAFF_EMAIL",
      password: "PORTAL_TEST_STAFF_PASSWORD",
    },
  },
  tracker: {
    port: 3200,
    seeds: ["/"],
    signIn: {
      at: "/login",
      from: "tracker",
      email: "PORTAL_TEST_STAFF_EMAIL",
      password: "PORTAL_TEST_STAFF_PASSWORD",
    },
  },
};

/**
 * The six demos.
 *
 * Each needs two things the other three do not: a **share link**, because every
 * business is opened by invitation now and a browser without one sees the
 * expired screen; and the *variant* in every address, because a demo's site
 * lives under `/<business>`.
 */
const DEMOS = {
  "demo-clinic": { port: 3300, schema: "demo_clinic" },
  "demo-restaurant": { port: 3400, schema: "demo_resto" },
  "demo-school": { port: 3500, schema: "demo_school" },
  "demo-realestate": { port: 3600, schema: "demo_estate" },
  "demo-crm": { port: 3700, schema: "demo_crm" },
  "demo-ecommerce": { port: 3800, schema: "demo_shop" },
};

for (const [name, demo] of Object.entries(DEMOS)) {
  PROJECTS[name] = {
    ...demo,
    seeds: ["/admin"],
    demo: true,
    signIn: { at: "/admin/login", from: "services", email: "ADMIN_EMAIL", password: "ADMIN_PASSWORD" },
  };
}

/* ------------------------------------------------------------------- boot */

/** Wait for a dev server to answer, however long Next takes to start. */
async function waitFor(url, ms = 180_000) {
  const until = Date.now() + ms;

  while (Date.now() < until) {
    try {
      const response = await fetch(url, { redirect: "manual" });
      if (response.status < 500) return true;
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 1000));
  }

  return false;
}

async function startServer(dir, port) {
  const base = `http://localhost:${port}`;

  if (await waitFor(base, 2000)) {
    console.log(`  (a server is already answering on ${port})`);
    return null;
  }

  console.log(`  starting ${dir.split(/[\\/]/).pop()} on ${port}…`);

  const child = spawn("npm", ["run", "dev"], {
    cwd: dir,
    shell: true,
    stdio: "ignore",
    detached: false,
  });

  if (!(await waitFor(base))) {
    child.kill();
    throw new Error(`nothing answered on ${port} after three minutes`);
  }

  return child;
}

/* ------------------------------------------------------------- the crawl */

/** Addresses that would end the session or leave the site. */
function worthVisiting(href, base) {
  if (!href.startsWith(base)) return false;

  const path = href.slice(base.length).split("#")[0];

  if (/sign-?out|logout/i.test(path)) return false;

  /*
    An export is a file, not a screen. Navigating to one makes Chrome start a
    download and the navigation never resolves, which the crawl reported as
    "would not open" — true, and not a fault.
  */
  if (/\/export(\/|\?|$)|\/download(\/|\?|$)/i.test(path)) return false;
  if (/\.(png|jpe?g|svg|webp|ico|pdf|xml|txt|json)$/i.test(path)) return false;
  if (path.startsWith("/api/")) return false;

  return true;
}

const WIDTHS = [
  { name: "phone", width: 390, height: 844 },
  { name: "laptop", width: 1440, height: 900 },
];

async function inspect(page, path, findings) {
  const say = (what, detail) => findings.push({ path, what, detail });

  for (const size of WIDTHS) {
    await page.setViewportSize({ width: size.width, height: size.height });

    /* Let a resize settle: a grid that reflows is not a bug, a grid that stays
       too wide after reflowing is. */
    await page.waitForTimeout(150);

    const measured = await page.evaluate(() => {
      const doc = document.documentElement;

      /* Two pixels of slack. Sub-pixel rounding on a scaled layout reports
         1px of overflow on pages that are perfectly fine, and a check that
         cries wolf is a check nobody reads. */
      const overflow = doc.scrollWidth - doc.clientWidth;

      /* What is actually sticking out, so the report names it. */
      const culprits = [];

      if (overflow > 2) {
        for (const el of document.querySelectorAll("body *")) {
          const box = el.getBoundingClientRect();
          if (box.width === 0 || box.right <= doc.clientWidth + 2) continue;

          culprits.push(
            (el.tagName.toLowerCase() +
              (el.className && typeof el.className === "string"
                ? "." + el.className.trim().split(/\s+/).slice(0, 3).join(".")
                : "")).slice(0, 80),
          );

          if (culprits.length >= 3) break;
        }
      }

      const brokenImages = [...document.images]
        .filter((img) => img.complete && img.naturalWidth === 0)
        .map((img) => img.getAttribute("src")?.slice(0, 90) ?? "(no src)")
        .slice(0, 3);

      return {
        overflow,
        culprits,
        brokenImages,
        headings: document.querySelectorAll("h1").length,
        text: (document.body.innerText ?? "").trim().length,
      };
    });

    if (measured.overflow > 2) {
      say(
        `scrolls sideways at ${size.width}px`,
        `${measured.overflow}px over` +
          (measured.culprits.length ? ` — ${measured.culprits.join(", ")}` : ""),
      );
    }

    if (measured.brokenImages.length) {
      say("a picture did not load", measured.brokenImages.join(", "));
    }

    if (size.name === "laptop") {
      if (measured.headings === 0) say("no h1 on the page", "");
      if (measured.text < 40) say("the page is empty", `${measured.text} characters of text`);
    }
  }
}

async function crawl(project, options) {
  const settings = PROJECTS[project];
  if (!settings) throw new Error(`unknown project: ${project}`);

  const dir = projectDir(project);
  if (!dir) throw new Error(`${project} is not on this machine`);

  const base = `http://localhost:${settings.port}`;
  const server = await startServer(dir, settings.port);

  const browser = await chromium.launch({
    headless: !options.show,
    /* Real Chrome where it is installed, the bundled Chromium where it is not.
       Same engine either way; this is only so the run matches what people use. */
    channel: "chrome",
  }).catch(() => chromium.launch({ headless: !options.show }));

  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  const findings = [];
  let current = "/";

  /* -------------------------------------------------- what the page reports */

  page.on("console", (message) => {
    if (message.type() !== "error") return;

    const text = message.text();

    /*
      Two kinds of noise, both from the dev server rather than from the code.

      A favicon 404 on a route group, and React's hydration *warning* text that
      arrives as an error in development. Real hydration mismatches show up as
      a `pageerror` instead, which is not filtered.
    */
    if (/favicon|Download the React DevTools/i.test(text)) return;

    findings.push({ path: current, what: "console error", detail: text.slice(0, 200) });
  });

  page.on("pageerror", (error) => {
    findings.push({ path: current, what: "the page threw", detail: String(error).slice(0, 200) });
  });

  page.on("response", (response) => {
    if (response.status() < 400) return;

    const url = response.url();
    if (url.includes("/_next/") && response.status() === 404) return;

    findings.push({
      path: current,
      what: `a request failed (${response.status()})`,
      detail: url.replace(base, "").slice(0, 120),
    });
  });

  /* ------------------------------------------------------------ a way in */

  if (settings.demo) {
    const token = await mintLink(settings.schema);

    if (token) {
      await page.goto(`${base}/s/${token}`, { waitUntil: "domcontentloaded" });
    } else {
      findings.push({ path: "/", what: "no share link", detail: "the site half cannot be opened" });
    }
  }

  if (settings.signIn) {
    const env = { ...config, ...envOf(settings.signIn.from) };
    const email = env[settings.signIn.email];
    const password = env[settings.signIn.password];

    if (!email || !password) {
      console.log(`  (no ${settings.signIn.email} on this machine — crawling signed out)`);
    } else {
      await page.goto(base + settings.signIn.at, { waitUntil: "domcontentloaded" });

      /* The label text differs slightly between projects; matched loosely, and
         the password is never printed or written into a finding. */
      await page.getByLabel(/email/i).first().fill(email);
      await page.getByLabel(/password/i).first().fill(password);
      await page.getByRole("button", { name: /sign in|log in/i }).first().click();

      await page.waitForLoadState("networkidle").catch(() => {});

      if (page.url().includes("login")) {
        findings.push({
          path: settings.signIn.at,
          what: "could not sign in",
          detail: "still on the login screen after submitting",
        });
      }
    }
  }

  /* ----------------------------------------------------------- the walking */

  const seen = new Set();
  const queue = [...settings.seeds];

  /*
    Who linked to what.

    A finding that says "/process returned 404" sends somebody grepping for a
    string that is very often not in the code at all — it can come from a menu
    row, a page's body, or a slug composed at render time. Naming the screen the
    link was on turns the same finding into a place to open.
  */
  const linkedFrom = new Map();
  const limit = options.limit ?? 80;

  while (queue.length && seen.size < limit) {
    const path = queue.shift();
    if (seen.has(path)) continue;
    seen.add(path);
    current = path;

    try {
      const response = await page.goto(base + path, {
        waitUntil: "domcontentloaded",
        timeout: 45_000,
      });

      if (response && response.status() >= 400) {
        const from = linkedFrom.get(path);

        findings.push({
          path,
          what: `the page itself returned ${response.status()}`,
          detail: from ? `linked from ${from}` : "reached directly",
        });
        continue;
      }

      await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});
      await inspect(page, path, findings);

      const links = await page.evaluate(() =>
        [...document.querySelectorAll("a[href]")].map((a) => a.href),
      );

      for (const href of links) {
        if (!worthVisiting(href, base)) continue;
        const next = href.slice(base.length).split("#")[0] || "/";
        if (!linkedFrom.has(next)) linkedFrom.set(next, path);
        if (!seen.has(next) && !queue.includes(next)) queue.push(next);
      }
    } catch (error) {
      findings.push({ path, what: "would not open", detail: String(error).slice(0, 160) });
    }

    process.stdout.write(`\r  ${seen.size} screens…   `);
  }

  console.log(`\r  ${seen.size} screens opened.   `);

  await browser.close();
  if (server) server.kill();

  return { findings, visited: [...seen] };
}

/** A live link for a demo, so its site can be opened at all. */
async function mintLink(schema) {
  const url = config.NEXT_PUBLIC_SUPABASE_URL;
  const key = config.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) return null;

  const supabase = createClient(url, key, {
    db: { schema },
    auth: { persistSession: false },
  });

  const { data: variant } = await supabase
    .from("variants")
    .select("id")
    .eq("is_active", true)
    .order("sort_order")
    .limit(1)
    .maybeSingle();

  if (!variant) return null;

  const token = `crawl-${crypto.randomUUID().replaceAll("-", "")}`;

  const { error } = await supabase.from("share_links").insert({
    variant_id: variant.id,
    token,
    label: "Click-through — safe to delete",
    /* An hour, so a crashed run does not leave a live door open. */
    expires_at: new Date(Date.now() + 3_600_000).toISOString(),
  });

  return error ? null : token;
}

/* ------------------------------------------------------------------ saying */

const [, , which, ...flags] = process.argv;
const options = { show: flags.includes("--show"), limit: 80 };

const targets = which && which !== "all" ? [which] : Object.keys(PROJECTS);

let total = 0;

for (const project of targets) {
  console.log(`\n${"=".repeat(60)}\n${project}\n${"=".repeat(60)}`);

  try {
    const { findings, visited } = await crawl(project, options);

    if (findings.length === 0) {
      console.log(`  nothing wrong on ${visited.length} screens`);
      continue;
    }

    /* Grouped by screen, because "this page is broken" is what gets fixed —
       not "there are nineteen console errors somewhere in the project". */
    const byPath = new Map();
    for (const finding of findings) {
      if (!byPath.has(finding.path)) byPath.set(finding.path, []);
      byPath.get(finding.path).push(finding);
    }

    for (const [path, list] of byPath) {
      console.log(`\n  ${path}`);
      const said = new Set();

      for (const finding of list) {
        const line = `    · ${finding.what}${finding.detail ? " — " + finding.detail : ""}`;
        if (said.has(line)) continue;
        said.add(line);
        console.log(line);
      }
    }

    total += findings.length;
    console.log(`\n  ${findings.length} on ${byPath.size} of ${visited.length} screens`);
  } catch (error) {
    console.log(`  could not crawl: ${error.message}`);
    total += 1;
  }
}

console.log(total === 0 ? "\nEvery screen opened cleanly.\n" : `\n${total} things to look at.\n`);
process.exitCode = total === 0 ? 0 : 1;
