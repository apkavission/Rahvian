import { expect, test } from "@playwright/test";
import { PUBLIC_ROUTES } from "./routes";

/**
 * Text is readable, in both themes, on every public page.
 *
 * Two standing rules meet here and neither was checked by anything. Ground rule
 * 8 is "both themes everywhere", and the accessibility pass on 2026-08-27
 * recorded contrast as "measured, not eyeballed" — measured **once**, by hand,
 * which is a state that rots the moment a colour token moves.
 *
 * **The whole suite otherwise runs in one theme.** Everything else here loads a
 * page in whatever the default is, so a rule that only breaks in dark has
 * nothing looking at it. This is the one spec that visits both.
 *
 * WCAG AA is the bar: 4.5:1 for body text, 3:1 for large text — 24px, or 18.66px
 * when bold. That is the same threshold the design tokens were chosen against,
 * so this is checking that the tokens are still being used rather than
 * re-litigating them.
 */

/** Relative luminance, per WCAG. */
const CONTRAST_HELPERS = `
  function parse(colour) {
    const m = colour.match(/rgba?\\(([^)]+)\\)/);
    if (!m) return null;
    const parts = m[1].split(/[,\\s/]+/).filter(Boolean).map(Number);
    if (parts.length < 3 || parts.some(Number.isNaN)) return null;
    return { r: parts[0], g: parts[1], b: parts[2], a: parts.length > 3 ? parts[3] : 1 };
  }

  function luminance({ r, g, b }) {
    const channel = (v) => {
      const c = v / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    };
    return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
  }

  function ratio(a, b) {
    const l1 = luminance(a);
    const l2 = luminance(b);
    return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
  }

  /*
    The background a piece of text is actually drawn on.

    Walking up until something opaque is found, because almost every surface in
    this design is transparent or a translucent tint over the one beneath it —
    taking the element's own background-color would compare text against
    rgba(0,0,0,0) on nearly every element and pass everything.
  */
  function backgroundOf(element) {
    for (let node = element; node; node = node.parentElement) {
      const colour = parse(getComputedStyle(node).backgroundColor);
      if (colour && colour.a >= 0.95) return colour;
    }
    return parse(getComputedStyle(document.body).backgroundColor) ?? { r: 255, g: 255, b: 255, a: 1 };
  }
`;

async function measure(page: import("@playwright/test").Page) {
  return page.evaluate(`(() => {
    ${CONTRAST_HELPERS}

    const results = [];

    for (const element of document.querySelectorAll("p, h1, h2, h3, h4, a, li, span, button, label, td, th, figcaption")) {
      // Only elements that actually paint text of their own.
      const text = [...element.childNodes]
        .filter((n) => n.nodeType === 3)
        .map((n) => n.textContent.trim())
        .join("")
        .trim();
      if (!text) continue;

      const style = getComputedStyle(element);
      if (style.visibility === "hidden" || style.display === "none") continue;
      if (Number(style.opacity) < 0.99) continue;

      const box = element.getBoundingClientRect();
      if (box.width === 0 || box.height === 0) continue;

      const colour = parse(style.color);
      if (!colour || colour.a < 0.95) continue;

      const size = parseFloat(style.fontSize);
      const weight = Number(style.fontWeight) || 400;
      const large = size >= 24 || (size >= 18.66 && weight >= 700);

      results.push({
        text: text.slice(0, 40),
        tag: element.tagName.toLowerCase(),
        ratio: Math.round(ratio(colour, backgroundOf(element)) * 100) / 100,
        needs: large ? 3 : 4.5,
        size,
      });
    }

    return results;
  })()`) as Promise<
    { text: string; tag: string; ratio: number; needs: number; size: number }[]
  >;
}

/** Set the theme the way the site itself does, before anything paints. */
async function useTheme(page: import("@playwright/test").Page, theme: "light" | "dark") {
  await page.addInitScript(
    ([key, value]) => window.localStorage.setItem(key as string, value as string),
    ["as-theme", theme],
  );
}

for (const theme of ["light", "dark"] as const) {
  test.describe(`in the ${theme} theme`, () => {
    for (const route of PUBLIC_ROUTES) {
      test(`${route.path} has readable text`, async ({ page }) => {
        await useTheme(page, theme);
        await page.goto(route.path);

        // The blocking script in <head> sets this before the first paint; if it
        // has not, every measurement below would be of the wrong theme.
        await expect(page.locator("html")).toHaveAttribute("data-theme", theme);

        /*
          Measured twice, and only a failure present in **both** readings is
          reported.

          The first version of this spec failed once on `/case-studies` in dark
          with a set of footer links at 2.59:1 — and passed six times in a row
          when re-run, while a direct measurement of those same links gave
          7.88:1. So the reading was of a state the page passes through rather
          than one it rests in, and the cause is not understood: `data-theme` is
          stamped by the blocking head script and, checked with a mutation
          observer, never changes afterwards.

          What is certain is that a contrast failure that is real does not go
          away in three hundred milliseconds. Two agreeing readings is the
          assertion; a single one was a coin toss, and a spec that fails once in
          twenty teaches people to re-run it rather than read it.

          Written down rather than tuned away: docs/testing.md carries this as
          an open question.
        */
        const first = await measure(page);
        expect(first.length, "nothing measurable was found on the page").toBeGreaterThan(5);

        await page.waitForTimeout(300);
        const second = await measure(page);

        const stillFailing = second
          .filter((item) => item.ratio < item.needs)
          .filter((item) =>
            first.some(
              (earlier) =>
                earlier.text === item.text &&
                earlier.tag === item.tag &&
                earlier.ratio < earlier.needs,
            ),
          );

        expect(
          stillFailing.map((f) => `${f.tag} "${f.text}" ${f.ratio}:1 needs ${f.needs}:1`),
          `${route.path} in ${theme}`,
        ).toEqual([]);
      });
    }
  });
}

test("the focus ring is visible against the surface it sits on", async ({ page }) => {
  /*
    Named in testing.md as unmeasured: text contrast was checked by hand, a
    focus outline never was. It is the one piece of colour a keyboard user
    depends on completely, and it is invisible to anybody testing with a mouse.
  */
  await page.goto("/contact");

  await page.keyboard.press("Tab");
  await page.keyboard.press("Tab");
  await page.keyboard.press("Tab");

  const focused = await page.evaluate(`(() => {
    ${CONTRAST_HELPERS}

    const element = document.activeElement;
    if (!element || element === document.body) return null;

    const style = getComputedStyle(element);
    const ring = parse(style.outlineColor) ?? parse(style.borderColor);
    if (!ring) return null;

    return {
      tag: element.tagName.toLowerCase(),
      width: parseFloat(style.outlineWidth) || 0,
      ratio: Math.round(ratio(ring, backgroundOf(element)) * 100) / 100,
      shadow: style.boxShadow !== "none",
    };
  })()`) as { tag: string; width: number; ratio: number; shadow: boolean } | null;

  expect(focused, "nothing took focus after three tabs").not.toBeNull();

  /*
    3:1 is the WCAG threshold for a non-text indicator. A ring drawn with a
    box-shadow instead of an outline is accepted as visible without measuring
    the shadow's colour — this site uses a ring shadow on several controls, and
    a false failure here is worse than no check, because it is the kind that
    gets the whole spec disabled.
  */
  if (!focused!.shadow) {
    expect(focused!.ratio, `the focus ring on <${focused!.tag}> is ${focused!.ratio}:1`).toBeGreaterThanOrEqual(3);
  }
});
