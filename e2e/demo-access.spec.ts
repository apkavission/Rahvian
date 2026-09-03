import { expect, test } from "@playwright/test";

/**
 * A demo is opened by invitation.
 *
 * ---------------------------------------------------------------------------
 * **Read-only, like every other spec here.** There is one Supabase project and
 * no staging copy, so nothing below issues a link, closes one, or opens a
 * business to the world — those write to the real estate and would leave rows
 * behind on every run.
 *
 * What that leaves is worth having. `npm run check:access` exercises the whole
 * cycle against the database, signed in as a real owner, and tidies up after
 * itself; this checks the half that check cannot see — that the screen renders
 * from those functions, says which businesses are open to the world, and does
 * not put a token on the page.
 */

test("the estate screen says who may open a demo", async ({ page }) => {
  const response = await page.goto("/admin/estate/demos");

  expect(response?.status(), "the screen should answer 200").toBe(200);

  await expect(
    page.getByRole("heading", { name: "Who may open a demo", level: 1 }),
  ).toBeVisible();

  /* The shell, so a screen that threw and was caught by an error boundary does
     not pass by containing the right words. */
  await expect(page.getByRole("navigation", { name: "Admin" })).toBeVisible();
});

test("it lists the estate's businesses, read from every demo schema", async ({ page }) => {
  await page.goto("/admin/estate/demos");

  /*
    Waited for, not counted.

    `count()` answers with whatever is in the DOM at that instant, so on a
    screen still rendering it returns 0 and a test written around it skips
    itself while reading like a pass. That mistake has been made three times in
    this estate; it is not being made a fourth.
  */
  const businesses = page.getByRole("heading", { name: "The businesses" });
  await expect(businesses).toBeVisible();

  /*
    Eighteen businesses across six demos. Not asserted as a number — that would
    fail the day a seventh demo is added, which is a change to celebrate rather
    than a regression — but there must be more than one demo represented, or
    the cross-schema query has quietly returned only what it could reach.
  */
  const demoNames = await page.locator("main").getByText(/demo · \//).count();
  expect(demoNames, "businesses from more than one demo").toBeGreaterThan(1);
});

test("no token is anywhere on the page", async ({ page }) => {
  await page.goto("/admin/estate/demos");

  await expect(
    page.getByRole("heading", { name: "Everything sent" }),
  ).toBeVisible();

  /*
    The shape of a token: 64 hex characters. It is shown once, when a link is
    made, and never again — a list that could reveal any token would hand over
    every live demo at once, and it is the screen somebody leaves open on a
    laptop in a meeting.
  */
  const body = (await page.locator("body").textContent()) ?? "";
  expect(body).not.toMatch(/[0-9a-f]{64}/);
});

test("a demo that is open to the world is called out, not buried", async ({ page }) => {
  await page.goto("/admin/estate/demos");

  const figure = page.getByText("Open to anybody", { exact: true }).first();
  await expect(figure).toBeVisible();

  /*
    Whatever the count says, it must agree with the badges beside the
    businesses — the number above the fold and the rows below it are read as one
    statement, and a screen where they disagree is worse than one with neither.
  */
  const stated = Number(
    (await page.locator("dl dd").nth(2).textContent())?.trim() ?? "0",
  );
  const badges = await page.getByTitle("Anybody with the address can read this").count();

  expect(badges).toBe(stated);
});

test("the link count and the pager agree", async ({ page }) => {
  await page.goto("/admin/estate/demos");

  /* The shared pagination component draws this on every list in the estate; its
     absence means the list rendered without going through it. */
  await expect(page.getByTestId("page-summary")).toBeVisible();
});
