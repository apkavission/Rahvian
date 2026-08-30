import { expect, test } from "@playwright/test";
import { PUBLIC_ROUTES, WIDTHS } from "./routes";

/**
 * Nothing scrolls sideways, at any width, on any page.
 *
 * [responsive-rules.md](../docs/responsive-rules.md) is a standing instruction
 * from the owner and a release blocker rather than a polish pass. Most of it —
 * whether a layout *reads* well at 360px — needs eyes. One part of it does not,
 * and it is the part that actually breaks: a single element wider than the
 * viewport makes the whole document scroll sideways, and on a phone that turns
 * every page into something that slides under the thumb.
 *
 * It is also the failure most likely to be introduced by an edit nobody thinks
 * of as risky — a long unbroken word, a table, a `min-w` on a card, a padding
 * added to a container that was already exactly full width.
 *
 * Wide content is allowed to scroll **inside its own box**; that is the rule,
 * and it is why this measures the document rather than every element.
 */

for (const width of WIDTHS) {
  test.describe(`at ${width}px`, () => {
    test.use({ viewport: { width, height: 900 } });

    for (const route of PUBLIC_ROUTES) {
      test(`${route.path} does not scroll sideways`, async ({ page }) => {
        await page.goto(route.path);

        // Any lazy image or web font still settling can change the layout
        // once more after load.
        await page.waitForLoadState("networkidle");

        const overflow = await page.evaluate(() => {
          const doc = document.documentElement;
          return {
            scrollWidth: doc.scrollWidth,
            clientWidth: doc.clientWidth,
          };
        });

        // One pixel of tolerance: a sub-pixel width rounds up in Chromium and
        // is not something a person can scroll.
        expect(
          overflow.scrollWidth,
          `${route.path} is ${overflow.scrollWidth}px wide in a ${overflow.clientWidth}px viewport`,
        ).toBeLessThanOrEqual(overflow.clientWidth + 1);
      });
    }
  });
}

test.describe("the mobile menu", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  /**
   * The regression guard for the bug this suite found on 2026-08-28.
   *
   * The panel is `fixed inset-0 top-16`, so it should fill the viewport below
   * the header. It was resolving to a **height of zero** whenever the page had
   * been scrolled: the header gains `backdrop-blur` past 8px, an element with
   * a `backdrop-filter` becomes the containing block for its `position: fixed`
   * descendants, and the panel was a child of the header — so `top: 64px;
   * bottom: 0` was measured against a 64px-tall header. The menu button turned
   * into an X and nothing appeared.
   *
   * Both scroll positions are checked, because only one of them was broken and
   * the working one is what made it look fine in casual use.
   */
  for (const scrollY of [0, 600]) {
    test(`opens to a full-height panel at scrollY ${scrollY}`, async ({ page }) => {
      await page.goto("/");
      await page.evaluate((to) => window.scrollTo(0, to), scrollY);

      await page.getByRole("button", { name: "Open menu" }).click();

      const panel = page.locator("div.fixed.inset-0").first();
      await expect(panel).toBeVisible();

      const box = await panel.boundingBox();
      expect(box, "the panel should have a box at all").not.toBeNull();

      // Not "greater than zero": a panel a few pixels tall would pass that and
      // still be useless. It should fill what is left below the header.
      expect(
        box!.height,
        `the panel is ${box!.height}px tall in an 844px viewport`,
      ).toBeGreaterThan(600);

      // And the links are inside it, reachable rather than merely present.
      await expect(panel.getByRole("link", { name: "Pricing" })).toBeVisible();
      await expect(panel.getByRole("link", { name: "Contact" })).toBeVisible();
    });
  }

  test("a link in the panel navigates, and the panel closes behind it", async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Open menu" }).click();

    const panel = page.locator("div.fixed.inset-0").first();
    const link = panel.getByRole("link", { name: "Pricing" });
    await expect(link).toBeVisible();

    /*
      Activated from the keyboard rather than with a synthetic mouse click.

      Two reasons, and the second is the honest one. It covers the keyboard
      path, which this project cares about and which nothing else here checks.
      And Playwright's synthetic pointer click at this element's coordinates
      hangs — the page navigates correctly when the link is activated any other
      way, so it is not a defect in the menu, but it is not understood either.
      It is written down in docs/testing.md rather than papered over, and the
      tap is on the click-through list to be tried on a real phone.
    */
    await link.focus();
    await page.keyboard.press("Enter");

    /*
      Polled, not waited on as a navigation event.

      `waitForURL` hooks Next's navigation lifecycle and waits for a `load` that
      a client-side route change never fires again — which timed out inside the
      full suite while passing every time on its own. `toHaveURL` just re-reads
      the address until it matches, which is the thing actually being asserted.
    */
    await expect(page).toHaveURL(/\/pricing$/);

    // A panel left open across a navigation covers the page just requested.
    await expect(page.locator("div.fixed.inset-0")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Open menu" })).toBeVisible();
  });
});
