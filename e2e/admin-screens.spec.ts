import { expect, test } from "@playwright/test";
import { ADMIN_SCREENS } from "./routes";

/**
 * Every admin screen opens, signed in, and shows what it is.
 *
 * **Read-only, deliberately and completely.** There is one Supabase project and
 * no staging copy of it, so a suite that created or saved anything would be a
 * suite editing the company's real content on every run. Nothing here clicks a
 * save button, a delete or a duplicate. Those stay on the human click-through
 * list in [testing.md](../docs/testing.md), where somebody can see what changed
 * and put it back.
 *
 * What that leaves is still the biggest gap this project had: every one of these
 * screens renders from a database read that can legitimately return nothing, so
 * "it answers 200" proves very little. A heading, the shell around it, and the
 * absence of an error boundary is what proves the screen actually assembled.
 */

for (const screen of ADMIN_SCREENS) {
  test(`${screen.path} opens and is ${screen.heading}`, async ({ page }) => {
    const response = await page.goto(screen.path);

    expect(response?.status(), `${screen.path} should answer 200`).toBe(200);

    // Not `getByText`: a heading is what the screen claims to be, and matching
    // any text would also match the sidebar link that led here.
    await expect(
      page.getByRole("heading", { name: screen.heading, level: 1 }),
    ).toBeVisible();

    // The shell, so a screen that threw and got caught by an error boundary
    // does not pass by happening to contain the right word.
    await expect(page.getByRole("navigation", { name: "Admin" })).toBeVisible();
  });
}

test("the sidebar lists every screen the owner may reach", async ({ page }) => {
  await page.goto("/admin");

  const nav = page.getByRole("navigation", { name: "Admin" });

  // An owner sees all of them, including the accounts screen that is not a
  // grant anybody else can be given.
  for (const screen of ADMIN_SCREENS) {
    // Reached from the person's own name in the sidebar, not from the menu —
    // it is the one screen no owner can take away from anybody.
    if (screen.path === "/admin/account") continue;

    const label = typeof screen.heading === "string" ? screen.heading : "Dashboard";

    await expect(
      nav.getByRole("link", { name: label, exact: true }),
      `${label} should be in the menu`,
    ).toBeVisible();
  }

  // Nothing is still marked "Soon" — every planned screen has been built.
  await expect(nav.getByText("Soon")).toHaveCount(0);
});

test("the command palette finds a screen and a record", async ({ page }) => {
  await page.goto("/admin");

  /*
    The trigger first, then the shortcut — in that order deliberately.

    The Ctrl+K listener is attached in an effect, so it does not exist until
    the page has hydrated, and pressing the key before that is a test that
    fails for a reason having nothing to do with the palette. Waiting for the
    trigger to be clickable is the honest hydration signal, and clicking it
    also covers the way somebody who does not know the shortcut gets in.
  */
  const trigger = page.getByRole("button", { name: /search/i });
  await trigger.click();

  const search = page.getByRole("textbox", { name: "Search" });
  await expect(search).toBeFocused();

  // A screen, filtered in the browser: it appears on the keystroke, with no
  // round trip at all.
  await search.fill("pric");
  await expect(page.getByRole("button", { name: /Pricing/ }).first()).toBeVisible();

  /*
    And a record, which is a round trip to the server.

    "Website Development" is seeded and published — the one record this suite
    can rely on existing before the owner has entered anything of their own.
    The word is checked against the real row rather than assumed: an earlier
    version searched for "web develop", which matches nothing, and the palette
    correctly returned nothing.
  */
  await search.fill("website");
  await expect(page.getByText("Records")).toBeVisible();

  await page.keyboard.press("Escape");
  await expect(search).toBeHidden();

  // Now the shortcut, on a page proven to be interactive.
  await page.keyboard.press("Control+k");
  await expect(search).toBeVisible();
});

test("a screen with a preview shows the real page beside the form", async ({ page }) => {
  await page.goto("/admin/navigation");

  // The preview is an iframe rendering the actual header, not a drawing of it,
  // so what is asserted is that the frame loaded and carries the site's own
  // header — which is the claim the pane makes and the one that would quietly
  // stop being true if the preview route broke.
  const preview = page.frameLocator('iframe[title="Preview"]');
  await expect(preview.locator("header").first()).toBeVisible({ timeout: 30_000 });
});

/*
  Signing out is deliberately not tested here.

  `supabase.auth.signOut()` revokes the account's refresh tokens, and every
  spec in this project shares one saved session — so a sign-out test would end
  the session the tests running beside it are using, and the failures would
  land on whichever screens happened to be mid-request. It is one line on the
  human click-through list instead, where it costs nothing.
*/
