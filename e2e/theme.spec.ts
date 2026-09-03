import { expect, test } from "@playwright/test";

/**
 * The theme control, and the three things about it that are easy to break.
 *
 * "Both themes everywhere" is ground rule 7 and the theme is the one piece of
 * state on the public site that outlives a page: it is written to
 * `localStorage`, read back by a blocking script in `<head>` before the first
 * paint, and applied as `data-theme` on `<html>`. Three moving parts, none of
 * which a build or a type check can see.
 *
 * These specs exist as a guard on that machinery, written before it was
 * refactored on 2026-08-28 so the refactor had something to answer to.
 */

const ROOT = "html";

/**
 * Choose a theme from the keyboard.
 *
 * Not `click()`, and for a reason that is written down rather than guessed at:
 * Playwright's synthetic pointer click on this control hangs roughly once in
 * fifteen under parallel load — it dispatches and then never resolves. The same
 * signature appeared on the mobile menu's links, and in both cases the control
 * works perfectly when driven any other way, including a real click measured on
 * its own. It is an open question in docs/testing.md.
 *
 * Activating a radio with the keyboard is also a path nothing else here covers,
 * so this is not purely a workaround.
 */
async function choose(page: import("@playwright/test").Page, name: string) {
  const control = page
    .getByRole("radiogroup", { name: "Colour theme" })
    .first()
    .getByRole("radio", { name });

  await control.focus();
  await control.press("Enter");
}

test("the control offers all three modes and marks the active one", async ({ page }) => {
  await page.goto("/");

  const group = page.getByRole("radiogroup", { name: "Colour theme" }).first();

  for (const label of ["Light", "Dark", "System"]) {
    await expect(group.getByRole("radio", { name: label })).toBeVisible();
  }

  // Exactly one, or the highlight and the announcement disagree.
  await expect(group.getByRole("radio", { checked: true })).toHaveCount(1);
});

test("choosing a theme applies it to the document", async ({ page }) => {
  await page.goto("/");

  await choose(page, "Dark");
  await expect(page.locator(ROOT)).toHaveAttribute("data-theme", "dark");

  await choose(page, "Light");
  await expect(page.locator(ROOT)).toHaveAttribute("data-theme", "light");
});

test("the choice survives a navigation and a reload", async ({ page }) => {
  await page.goto("/");

  await choose(page, "Dark");
  await expect(page.locator(ROOT)).toHaveAttribute("data-theme", "dark");

  // A navigation, which re-runs the provider.
  await page.goto("/pricing");
  await expect(page.locator(ROOT)).toHaveAttribute("data-theme", "dark");

  /*
    And a reload, which is the one that matters.

    The theme is applied by a blocking script in `<head>` before the first
    paint, so the correct mark is painted in the first frame rather than after
    hydration. If that script broke, the page would flash the wrong theme and
    then correct itself — and this assertion would still pass, because it runs
    after load. What it does catch is the theme being lost entirely.
  */
  await page.reload();
  await expect(page.locator(ROOT)).toHaveAttribute("data-theme", "dark");

  // And the control agrees with the document.
  await expect(
    page
      .getByRole("radiogroup", { name: "Colour theme" })
      .first()
      .getByRole("radio", { name: "Dark" }),
  ).toHaveAttribute("aria-checked", "true");
});

test("system mode follows the operating system", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/");

  await choose(page, "System");
  await expect(page.locator(ROOT)).toHaveAttribute("data-theme", "dark");

  // The point of keeping a third state rather than a two-way switch: it
  // follows the system changing, live, without anybody touching the control.
  await page.emulateMedia({ colorScheme: "light" });
  await expect(page.locator(ROOT)).toHaveAttribute("data-theme", "light");
});

test("the admin sign-in screen carries the theme too", async ({ page }) => {
  // Ground rule 7 is "both themes everywhere", and the login screen sits
  // outside the admin shell — which is exactly the sort of place a theme
  // provider gets left out of.
  await page.goto("/admin/login");

  await expect(page.locator(ROOT)).toHaveAttribute("data-theme", /light|dark/);
});

/**
 * The hero samples its wordmark once, not for ever.
 *
 * `AssembleScene` rasterises "APKA VISSION" to a 2D canvas and reads the pixels
 * back to find the points its fragments fly into. That is expensive and it is
 * meant to happen once, when the font finishes loading.
 *
 * It happened continuously. `lines` defaulted to a fresh `["APKA", "VISSION"]`
 * on every render and was a dependency of the effect that does the sampling;
 * the effect set state, the state caused a render, the render built a new
 * array, and the effect ran again. Measured on 2026-08-31: **2,320 renders and
 * 1,160 rasterisations in the seven seconds after load**, with nothing clicked.
 *
 * Nothing failed. The page looked right, every unit test passed, the build was
 * clean — it simply had no idle main thread left. That is why a synthetic click
 * on the theme control "dispatched and never resolved" about once in fifteen
 * (see `choose` above), and why changing theme on the deployed site could stop
 * the tab dead with Chrome's "Page Unresponsive": the theme change asks a
 * saturated thread for a view transition and four colour re-reads on top.
 *
 * Counting canvases is how this is caught without instrumenting the component:
 * one `sampleText` is one `createElement("canvas")`. A handful is the scene
 * setting itself up. Hundreds is the loop.
 */
test("the hero does not re-rasterise its wordmark on a loop", async ({ page }) => {
  await page.addInitScript(() => {
    let canvases = 0;
    const create = document.createElement.bind(document);
    document.createElement = function (tag: string, ...rest: unknown[]) {
      if (String(tag).toLowerCase() === "canvas") canvases += 1;
      return create(tag, ...(rest as []));
    } as typeof document.createElement;
    (window as unknown as { __canvases: () => number }).__canvases = () => canvases;
  });

  await page.goto("/");
  await page.waitForTimeout(5_000);

  const count = await page.evaluate(
    () => (window as unknown as { __canvases: () => number }).__canvases(),
  );

  // Comfortably above what a settled page needs and far below a loop, so this
  // fails on the defect and not on a slow machine.
  expect(count).toBeLessThan(25);
});
