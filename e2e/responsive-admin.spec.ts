import { expect, test } from "@playwright/test";
import { ADMIN_SCREENS, WIDTHS } from "./routes";

/**
 * The admin, at every width, on every screen.
 *
 * ---------------------------------------------------------------------------
 * **The public site has been checked this way since August; the admin never
 * was.** Which is the wrong way round for who suffers: a visitor meets one page
 * of the public site and leaves, while somebody runs the business from these
 * twenty screens all day, and increasingly from a phone.
 *
 * It is also where sideways scroll is most likely. Every one of these screens
 * carries a table, a wide form, or a three-column layout — the exact things
 * that overflow — and several grew a column this week.
 *
 * ---------------------------------------------------------------------------
 * **What this can and cannot see.** It measures the document, not the eye: a
 * screen that fits and reads badly passes. Wide content is *allowed* to scroll
 * inside its own box — that is the rule in
 * [responsive-rules.md](../docs/responsive-rules.md) — so this asks only
 * whether the page itself slides under the thumb, which is the failure that
 * makes a phone unusable rather than merely cramped.
 */

for (const width of WIDTHS) {
  test.describe(`at ${width}px`, () => {
    test.use({ viewport: { width, height: 900 } });

    for (const screen of ADMIN_SCREENS) {
      test(`${screen.path} does not scroll sideways`, async ({ page }) => {
        await page.goto(screen.path);

        /* The screen has to have rendered, or this measures an empty shell and
           passes. A heading is what proves it assembled. */
        await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();

        // A lazy image or a web font still settling can change the layout once
        // more after load.
        await page.waitForLoadState("networkidle");

        const overflow = await page.evaluate(() => ({
          scrollWidth: document.documentElement.scrollWidth,
          clientWidth: document.documentElement.clientWidth,
        }));

        // One pixel of tolerance: a sub-pixel width rounds up in Chromium and
        // is not something a person can scroll.
        expect(
          overflow.scrollWidth,
          `${screen.path} is ${overflow.scrollWidth}px wide in a ${overflow.clientWidth}px viewport`,
        ).toBeLessThanOrEqual(overflow.clientWidth + 1);
      });
    }
  });
}

/**
 * The sidebar, on a screen too short to hold it.
 *
 * A 900-pixel laptop is the commonest screen there is, and the menu is now
 * eighteen items — taller than the space between the brand and the account
 * card. It has to scroll *inside* the rail; when it did not, the account panel
 * was drawn over the last item, which stayed clickable in the markup and
 * unclickable with a mouse.
 */
test.describe("the sidebar on a short screen", () => {
  test.use({ viewport: { width: 1440, height: 700 } });

  test("scrolls its own menu rather than growing past the screen", async ({ page }) => {
    await page.goto("/admin");

    const measured = await page.evaluate(() => {
      const rail = document.querySelector("aside");
      const scroller = rail?.querySelector("div.overflow-y-auto");
      const account = rail?.lastElementChild;

      if (!rail || !scroller || !account) return null;

      return {
        rail: rail.getBoundingClientRect().height,
        scrollerBottom: scroller.getBoundingClientRect().bottom,
        accountTop: account.getBoundingClientRect().top,
        scrolls: scroller.scrollHeight > scroller.clientHeight,
      };
    });

    expect(measured, "the admin rail is there").not.toBeNull();

    /* The rail fits the viewport … */
    expect(measured!.rail).toBeLessThanOrEqual(700);

    /* … the menu genuinely scrolls rather than overflowing … */
    expect(measured!.scrolls).toBe(true);

    /* … and nothing is drawn over the account panel. */
    expect(measured!.scrollerBottom).toBeLessThanOrEqual(measured!.accountTop + 1);
  });
});
