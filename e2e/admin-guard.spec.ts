import { expect, test } from "@playwright/test";
import { ADMIN_ROUTES } from "./routes";

/**
 * Signed out, every admin address is the login screen.
 *
 * The cheapest security assertion in the suite, and the one guarding the
 * failure that is invisible until somebody finds it: a screen added without
 * the guard. Every route below was written by hand at some point, and the
 * middleware protects them by path prefix — so what this actually pins is that
 * nobody has moved a screen out from under that prefix.
 *
 * It is not the whole of the model and does not pretend to be. Three layers
 * decide who sees what: the middleware turns anonymous requests away, which is
 * what this checks; `requireMenu()` answers 404 for a screen not in the
 * person's own menu; and RLS refuses the rows underneath both. The other two
 * need a signed-in session, and those checks are on the click-through list in
 * [testing.md](../docs/testing.md).
 */

for (const path of ADMIN_ROUTES) {
  test(`${path} sends a signed-out visitor to the login screen`, async ({ page }) => {
    await page.goto(path);

    await expect(page).toHaveURL(/\/admin\/login/);

    // And it says where they were going, so signing in lands them there
    // rather than on the dashboard.
    expect(page.url()).toContain("next=");
  });
}

test("the login screen itself is reachable", async ({ page }) => {
  // Otherwise the assertions above would pass on a site where nothing works.
  const response = await page.goto("/admin/login");

  expect(response?.status()).toBe(200);
  await expect(page.getByLabel(/email/i)).toBeVisible();
  await expect(page.getByLabel(/password/i)).toBeVisible();
});

test("the admin is never indexable, whatever the site-wide switch says", async ({
  page,
}) => {
  // `site_noindex` is admin-editable and one day will be turned off. No value
  // of it may ever make the panel crawlable, which is why the admin layout
  // hardcodes its robots tag rather than reading the row.
  await page.goto("/admin/login");

  await expect(page.locator('head meta[name="robots"]')).toHaveAttribute(
    "content",
    /noindex/,
  );
});

test("the scheduled endpoints refuse an unauthenticated caller", async ({ request }) => {
  /*
    These are not behind the admin's session — a cron does not sign in — so a
    shared secret is the whole of their protection. A route added without the
    check would be a database query, or a cache flush, that anybody on the
    internet can run in a loop.
  */
  for (const path of ["/api/cron/keep-alive", "/api/cron/backup"]) {
    expect((await request.get(path)).status(), `${path} with no secret`).toBe(401);
    expect(
      (await request.get(path, { headers: { "x-cron-secret": "wrong" } })).status(),
      `${path} with a wrong secret`,
    ).toBe(401);
  }

  /*
    Only the refusals are exercised here, deliberately.

    Calling the backup with a valid secret would take a real backup and upload
    it to R2 on every run of this suite — a test that writes to production
    storage because somebody wanted to know the happy path works. That one is
    run by hand, and its result is in PROGRESS.
  */

  // And the invalidation endpoint, which has been there longer.
  expect((await request.post("/api/revalidate", { data: { tags: ["services"] } })).status()).toBe(401);
});
