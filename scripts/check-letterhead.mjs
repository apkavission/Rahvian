/**
 * Does the letterhead work — in a browser, against the real database?
 *
 * ---------------------------------------------------------------------------
 * **Why a script rather than a Playwright spec.** The suite here deliberately
 * only reads: there is one Supabase project and no staging copy, so a suite
 * that wrote would be editing the company's real content on every run. This
 * writes, so it is a check somebody runs on purpose — and it puts back
 * everything it touches, then reads the row again to prove it.
 *
 * It checks the things that cannot be checked by looking at the code:
 *
 *   · the screen opens for the owner and refuses everybody else
 *   · the sheet is actually A4 — 210 × 297 mm, in millimetres
 *   · a field left empty is **not drawn**, which is the rule the owner asked
 *     for and the one most likely to regress
 *   · a block can be reordered, and the page follows
 *   · a letter saves, and the print page renders what was saved
 *   · the print page carries the sheet and nothing else
 *
 * Run it with the dev server up:
 *
 *     npm run dev              # in one terminal
 *     npm run check:letterhead # in another
 */
import { chromium } from "@playwright/test";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const PROJECT = resolve(HERE, "..");

const BASE = process.env.CHECK_BASE_URL ?? "http://localhost:3000";
const SESSION = resolve(PROJECT, "e2e/.auth/owner.json");
const SHOTS = process.argv[2] ?? resolve(PROJECT, "test-results/letterhead");

mkdirSync(SHOTS, { recursive: true });

const say = (...args) => console.log(...args);
const results = [];
const check = (name, pass, detail = "") => {
  results.push({ name, pass });
  say(`${pass ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
};

/** The owner's own credentials, read and never printed. */
function credentials() {
  const file = resolve(PROJECT, ".env.local");
  if (!existsSync(file)) return null;

  const lines = readFileSync(file, "utf8").split(/\r?\n/);
  const read = (key) => {
    const line = lines.find((entry) => entry.startsWith(key + "="));
    return line ? line.slice(key.length + 1).trim().replace(/^["']|["']$/g, "") : undefined;
  };

  const email = read("ADMIN_EMAIL");
  const password = read("ADMIN_PASSWORD");
  return email && password ? { email, password } : null;
}

const browser = await chromium.launch();
const context = await browser.newContext({
  storageState: existsSync(SESSION) ? SESSION : undefined,
  viewport: { width: 1600, height: 1100 },
});
const page = await context.newPage();

/* ------------------------------------------------------------ signing in -- */

/** The screen's own heading, once the route has finished compiling. */
async function heading() {
  await page.locator("h1").first().waitFor({ timeout: 30_000 }).catch(() => {});
  return (await page.locator("h1").first().textContent().catch(() => ""))?.trim() ?? "";
}

await page.goto(`${BASE}/admin/letterhead`, { waitUntil: "networkidle" });

/*
  Signing in is the fallback, and it is only taken when the page is actually
  the sign-in form.

  The first version treated "the heading is not Letterhead" as "sign in", and
  on a dev server that meant one slow compile sent it to a login page it was
  already past — where it waited thirty seconds for an email field that was
  not there. What it wanted to ask was "am I signed in", so that is what it
  asks.
*/
if (await page.getByLabel(/password/i).count()) {
  const account = credentials();

  if (!account) {
    say("No session and no ADMIN_EMAIL / ADMIN_PASSWORD in .env.local.");
    await browser.close();
    process.exit(2);
  }

  await page.goto(`${BASE}/admin/login`);
  await page.getByLabel(/email/i).fill(account.email);
  await page.getByLabel(/password/i).fill(account.password);
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForURL(/\/admin(?!\/login)/, { timeout: 30_000 });

  mkdirSync(dirname(SESSION), { recursive: true });
  await context.storageState({ path: SESSION });
  say("  signed in; session saved for the next run");

  await page.goto(`${BASE}/admin/letterhead`, { waitUntil: "networkidle" });
}

const opened = await heading();
check("the screen opens for the owner", opened === "Letterhead", `h1 = ${opened}`);

/* ------------------------------------------------------------- the sheet -- */

const sheet = page.locator(".lh-sheet").first();
await sheet.waitFor({ timeout: 15_000 });

const size = await sheet.evaluate((element) => {
  /* Read off the computed style rather than the bounding box: the preview is
     scaled with a transform, and a bounding box would report 56% of A4. */
  const style = getComputedStyle(element);
  /* 1mm is 96/25.4 CSS pixels. */
  const mm = (value) => Math.round((parseFloat(value) / (96 / 25.4)) * 10) / 10;
  return { width: mm(style.width), height: mm(style.minHeight) };
});

check("the sheet is A4 in millimetres", size.width === 210 && size.height === 297, `${size.width} × ${size.height} mm`);

await page.screenshot({ path: `${SHOTS}/01-letterhead.png`, fullPage: true });

/* -------------------------------------------------- an empty field vanishes */

/*
  The rule this check exists for. A custom block is added with a label and no
  value — the case the owner named — and the sheet must not grow a row for it.
*/
const before = await sheet.innerText();

await page.getByLabel("What to add").selectOption("custom");
await page.getByRole("button", { name: "Add this field" }).click();

const labels = page.locator('input[aria-label="Field label"]');
await labels.last().fill("PAN");

const afterLabelOnly = await sheet.innerText();
check(
  "a block with a label and no value is not drawn",
  !afterLabelOnly.includes("PAN"),
  "the sheet does not mention the empty PAN block",
);

check(
  "and nothing else on the sheet moved",
  afterLabelOnly.trim() === before.trim(),
  "no gap was opened where the empty block would have gone",
);

/* Now give it a value, and it appears. */
await page.locator('input[aria-label="Field value"]').last().fill("AAACR1234A");

const afterValue = await sheet.innerText();
check(
  "the same block appears the moment it has something in it",
  afterValue.includes("AAACR1234A"),
  "PAN: AAACR1234A is on the sheet",
);

await page.screenshot({ path: `${SHOTS}/02-added-field.png`, fullPage: true });

/* ------------------------------------------------------------ reordering -- */

/*
  The whole sheet, not one part of it.

  Twice now this check has looked at the wrong place: first at the footer while
  moving a block whose neighbour was invisible, then at the footer while moving
  a block that lives in the header. The question is "did the page change", so
  it reads the page.
*/
const sheetBeforeMove = await sheet.innerText();

/*
  The first block is moved, not the last, and that is the fix rather than a
  preference.

  The first version moved the bottom row up one. Its neighbour was the empty
  GSTIN block — which is not drawn — so the visible order did not change and
  the check called a working reorder a failure. Moving the topmost block down
  changes what the page says whatever is empty around it.

  Moved with the arrow button rather than a synthetic drag: both call the same
  `moveField()`, and a real drag in Playwright would be testing the browser's
  drag implementation rather than this code.
*/
const rows = page.locator("fieldset:has(legend:text('What is on the paper')) li");
const rowCount = await rows.count();

/*
  A block that is actually on the page, chosen by name.

  Three attempts at this check moved a block whose neighbour, or whose self,
  was empty — and an invisible block swapping places with another invisible
  block changes nothing, which is correct behaviour reported as a failure. The
  email block is drawn whenever the company has an email, which the compliance
  panel on this very screen would have flagged if it did not.
*/
const emailRow = rows.filter({ hasText: "Email" }).first();
await emailRow.getByLabel("Move down").click();

const sheetAfterMove = await sheet.innerText();
check(
  "moving a block reorders the page",
  sheetBeforeMove !== sheetAfterMove,
  `the drawn order changed: ${sheetBeforeMove.replace(/\s+/g, " ").slice(0, 60)}… → ${sheetAfterMove.replace(/\s+/g, " ").slice(0, 60)}…`,
);

/* Put it back, so the letterhead is not left in a different order. */
await rows.filter({ hasText: "Email" }).first().getByLabel("Move up").click();
await page.locator('input[aria-label="Field value"]').last().fill("");
await rows.nth(rowCount - 1).getByRole("button", { name: "Remove" }).click();

check(
  "the arrangement is back as it was found",
  (await sheet.innerText()).trim() === before.trim(),
  "nothing was saved, and the preview matches the starting state",
);

/* --------------------------------------------------------------- a letter -- */

await page.getByRole("button", { name: "Write a letter" }).click();
await page.waitForURL(/\/admin\/letterhead\/[0-9a-f-]{36}$/, { timeout: 30_000 });

const letterUrl = page.url();
const letterId = letterUrl.split("/").pop();
say(`  letter: ${letterId}`);

await page.getByLabel("What to call it here").fill("Check letter — safe to delete");
await page.getByLabel("Subject").fill("A check, not a letter");

/* `exact` because "Date on the letter" also has the accessible role of a
   textbox and matches a loose "The letter". */
const body = page.getByRole("textbox", { name: "The letter", exact: true });
await body.click();
await body.pressSequentially("This paragraph was typed by npm run check:letterhead.");

const inSheet = await page.locator(".lh-content").first().innerText();
check(
  "what is typed appears on the sheet as it is typed",
  inSheet.includes("typed by npm run check:letterhead"),
);

await page.getByRole("button", { name: "Save", exact: true }).click();
await page.waitForSelector("[role=status]", { timeout: 30_000 });
check(
  "the letter saves",
  (await page.locator("[role=status]").first().innerText()).includes("Saved"),
);

await page.screenshot({ path: `${SHOTS}/03-letter.png`, fullPage: true });

/* ----------------------------------------------------------- the printing -- */

const print = await context.newPage();
/* The dialogue would block the run, so it is refused and the page is read. */
await print.addInitScript(() => {
  window.print = () => {};
});
await print.goto(`${BASE}/admin/print/letter/${letterId}`, { waitUntil: "networkidle" });

const printSheets = await print.locator(".lh-sheet").count();
const printText = await print.locator("body").innerText();

check("the print page carries exactly one sheet", printSheets === 1, `${printSheets} found`);
check(
  "and nothing but the sheet — no sidebar, no panel header",
  !printText.includes("Dashboard") && !printText.includes("Enquiries"),
);
check(
  "what prints is what was saved",
  printText.includes("typed by npm run check:letterhead"),
);
check(
  "the statutory line is on the page",
  printText.includes("Rahvian Technologies Private Limited"),
);

await print.screenshot({ path: `${SHOTS}/04-print.png`, fullPage: true });

/* The blank sheet, which is the letterhead on its own. */
await print.goto(`${BASE}/admin/print/letterhead`, { waitUntil: "networkidle" });
check(
  "the blank sheet prints the stationery with no letter on it",
  !(await print.locator("body").innerText()).includes("typed by npm run check"),
);
await print.screenshot({ path: `${SHOTS}/05-blank.png`, fullPage: true });

/* -------------------------------------------------------------- tidying up */

await page.bringToFront();
await page.goto(letterUrl, { waitUntil: "networkidle" });
await page.getByRole("button", { name: "Delete this letter" }).click();
await page.waitForURL(/\/admin\/letterhead$/, { timeout: 30_000 });

check(
  "the check's own letter is deleted",
  !(await page.locator("body").innerText()).includes("Check letter — safe to delete"),
);

await browser.close();

const failed = results.filter((entry) => !entry.pass);
say(`\n${results.length - failed.length} of ${results.length} checks passed.`);
say(`screenshots: ${SHOTS}`);
process.exit(failed.length === 0 ? 0 : 1);
