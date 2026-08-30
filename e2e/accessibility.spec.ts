import { expect, test } from "@playwright/test";
import { CONTENT_ROUTES, PUBLIC_ROUTES } from "./routes";

/**
 * The accessibility rules a machine can actually check.
 *
 * [testing.md](../docs/testing.md) has carried "a screen-reader run-through of
 * the mobile menu and the FAQ accordion" as unfinished for weeks, and it still
 * does — nothing here replaces hearing it. What these specs do is take the
 * mechanical half off that list so the human half stays short and is about
 * judgement rather than about counting alt attributes.
 *
 * **No new dependency.** An axe-core integration would find more, and it would
 * also be a package nobody chose — `docs/privacy-rules.md` is explicit about
 * that. Everything below is asserted through Playwright's own accessibility-tree
 * queries and plain DOM checks, which covers the failures that actually occur
 * in this codebase: a control with no name, an image with no `alt`, a heading
 * level skipped, a landmark duplicated.
 *
 * Adding axe is a good idea and it is the owner's call, not this file's.
 */

test.describe("every public page", () => {
  /*
    The empty pages and the filled ones.

    `CONTENT_ROUTES` is here because of a failure this spec produced on
    2026-08-28: a category archive skipped from `h1` to `h3` as soon as a post
    was published under it, and the empty version of that page had passed every
    run before. A structural check on a page with no content in it is a check
    on a page nobody visits.
  */
  for (const route of [...PUBLIC_ROUTES, ...CONTENT_ROUTES]) {
    test(`${route.path} is structurally sound`, async ({ page }) => {
      await page.goto(route.path);

      // A document with no language is a document a screen reader pronounces
      // in whatever voice it happened to be using.
      await expect(page.locator("html")).toHaveAttribute("lang", /.+/);

      // Exactly one main landmark. Two is worse than none: "skip to main"
      // becomes ambiguous and landmark navigation lands somewhere arbitrary.
      await expect(page.getByRole("main")).toHaveCount(1);

      /*
        Every image declares `alt`, even if it is empty.

        Empty is a legitimate answer — it marks a picture as decorative, which
        is exactly right for the ones this site draws behind headings. What is
        never right is the attribute being absent, because then a screen reader
        falls back to reading the file name aloud.
      */
      const images = page.locator("img");
      for (let i = 0; i < (await images.count()); i += 1) {
        const image = images.nth(i);
        const alt = await image.getAttribute("alt");
        const src = (await image.getAttribute("src")) ?? `image ${i}`;
        expect(alt, `${src} has no alt attribute`).not.toBeNull();
      }

      /*
        No positive tabindex anywhere.

        A positive value moves an element out of document order in the tab
        sequence, and one of them reorders the whole page for everybody
        navigating by keyboard. `-1` and `0` are fine and both are used here.
      */
      const positive = await page.evaluate(() =>
        [...document.querySelectorAll("[tabindex]")]
          .map((element) => Number(element.getAttribute("tabindex")))
          .filter((value) => value > 0).length,
      );
      expect(positive, "an element has a positive tabindex").toBe(0);

      /*
        Heading levels do not skip on the way down.

        h1 followed by h3 tells somebody navigating by heading that a level is
        missing and leaves them looking for it. Going back up any distance is
        fine and normal — that is a new section, not a gap.
      */
      const levels = await page.evaluate(() =>
        [...document.querySelectorAll("h1,h2,h3,h4,h5,h6")].map((h) =>
          Number(h.tagName[1]),
        ),
      );

      for (let i = 1; i < levels.length; i += 1) {
        expect(
          levels[i] - levels[i - 1],
          `${route.path} jumps from h${levels[i - 1]} to h${levels[i]}`,
        ).toBeLessThanOrEqual(1);
      }
    });
  }
});

test("every control on the busiest form has an accessible name", async ({ page }) => {
  /*
    The quote form, because it is the longest and the one an enquiry actually
    comes through. A control with no name is announced as "edit text, blank" —
    the person can hear that a field exists and not what it wants.
  */
  await page.goto("/request-a-quote");

  const unnamed = await page.evaluate(() => {
    const controls = [...document.querySelectorAll("input, select, textarea")];

    return controls
      .filter((control) => {
        if (control.getAttribute("type") === "hidden") return false;

        const id = control.getAttribute("id");
        const labelled =
          (id && document.querySelector(`label[for="${CSS.escape(id)}"]`)) ||
          control.closest("label") ||
          control.getAttribute("aria-label") ||
          control.getAttribute("aria-labelledby");

        return !labelled;
      })
      .map((control) => control.getAttribute("name") ?? control.tagName);
  });

  expect(unnamed, `these controls have no label: ${unnamed.join(", ")}`).toEqual([]);
});

test("the skip link is the first thing a keyboard reaches, and it works", async ({
  page,
}) => {
  await page.goto("/");

  // One Tab from the top of the document.
  await page.keyboard.press("Tab");

  const skip = page.getByRole("link", { name: /skip to content/i });
  await expect(skip).toBeFocused();

  // It is hidden until focused, which is what makes it acceptable to put a
  // link nobody asked for at the top of every page.
  await expect(skip).toBeVisible();

  await skip.press("Enter");
  await expect(page).toHaveURL(/#main$/);

  // And focus actually lands in the main region rather than the URL merely
  // changing — which is the half of a skip link that is usually broken.
  const landed = await page.evaluate(() => document.activeElement?.id);
  expect(landed).toBe("main");
});

test("the FAQ accordion is operable from the keyboard and announces its state", async ({
  page,
}) => {
  /*
    Named in testing.md as one of the two things needing a screen-reader pass.
    This does not replace that: it checks the machinery a reader depends on —
    a real button, a correct `aria-expanded`, and a panel it points at that
    exists. Whether the announcement is *understandable* still needs ears.
  */
  await page.goto("/pricing");

  /*
    Held by a selector that does not change when the state does.

    The first version of this used `getByRole("button", { expanded: false })`,
    which stops matching the moment the button opens — so the locator silently
    re-resolved to a *different* question and the assertion failed against a
    button nobody had pressed. A locator whose meaning changes under the test
    is a test that reports on the wrong element.
  */
  const buttons = page.locator('[aria-controls^="faq-panel-"]');
  await expect(buttons.first()).toBeVisible();

  // The first panel opens on arrival — a closed accordion reads as an empty
  // section — so the second question is the one that starts collapsed.
  const question = buttons.nth(1);

  const controls = await question.getAttribute("aria-controls");
  expect(controls, "an accordion button controls nothing").toBeTruthy();
  await expect(page.locator(`#${controls}`)).toHaveCount(1);
  await expect(question).toHaveAttribute("aria-expanded", "false");

  // Opened from the keyboard, not with a click.
  await question.press("Enter");
  await expect(question).toHaveAttribute("aria-expanded", "true");

  // And the one that was open closes, because only one is open at a time —
  // which a screen reader is told through the same attribute.
  await expect(buttons.first()).toHaveAttribute("aria-expanded", "false");

  await question.press("Enter");
  await expect(question).toHaveAttribute("aria-expanded", "false");
});
