import { expect, test } from "@playwright/test";
import { CONTENT_ROUTES, MISSING_SLUGS, PUBLIC_ROUTES, SERVICE_ROUTES } from "./routes";

/**
 * Every public page answers, and says what it is.
 *
 * The cheapest specs in the suite and the ones most likely to catch a real
 * break, because every page on this site is assembled at request time from
 * database rows: a renamed column, a section type dropped from the registry or
 * a query that starts returning null does not fail a type check and does not
 * fail a build — it fails here, or it fails in front of a visitor.
 *
 * Deliberately shallow. What is asserted is that the page rendered, has exactly
 * one first-level heading, and carries a title and a description. Asserting the
 * *words* would be asserting the content of a database the owner is about to
 * fill in, and a suite that has to be edited every time a heading is reworded
 * is a suite that gets deleted.
 */

const ROUTES = [
  ...PUBLIC_ROUTES,
  ...CONTENT_ROUTES,
  ...SERVICE_ROUTES.map((path) => ({ path, name: `Service ${path}` })),
];

for (const route of ROUTES) {
  test(`${route.path} renders`, async ({ page }) => {
    const response = await page.goto(route.path);

    expect(response?.status(), `${route.path} should answer 200`).toBe(200);

    /*
      Exactly one `<h1>`, not at least one.

      A page with two is a page where a section is rendering a heading level it
      should not, which is the most common way an otherwise correct page becomes
      unreadable to a screen reader — and it is invisible on screen, because
      both are styled by class rather than by tag.
    */
    await expect(page.locator("h1")).toHaveCount(1);
    await expect(page.locator("h1")).toBeVisible();

    await expect(page).toHaveTitle(/.+/);

    const description = page.locator('head meta[name="description"]');
    await expect(description).toHaveAttribute("content", /.+/);
  });
}

test("an address that matches no route answers 404", async ({ page }) => {
  // Not a redirect to the home page: a 404 is what tells a search engine to
  // drop the address, and a soft 404 keeps a dead link indexed for months.
  const response = await page.goto("/this-page-does-not-exist");
  expect(response?.status()).toBe(404);
});

/**
 * A record that does not exist answers 404 — since 2026-08-28.
 *
 * It answered **200** for months: the page renders the not-found view, but a
 * route-level `loading.tsx` flushes the shell before the page reaches
 * `notFound()`, and a status cannot be changed once bytes have been sent. That
 * is a soft 404 — Google keeps the address indexed and re-crawls it for months,
 * and every slug the owner ever renames leaves one behind.
 *
 * The loader stays; it is a standing instruction. The check moved into the
 * proxy instead, which runs before any response begins. This test was written
 * skipped, on the day the defect was found, and un-skipped on the day it was
 * fixed.
 */
test("a record that does not exist answers 404", async ({ page }) => {
  for (const path of MISSING_SLUGS) {
    const response = await page.goto(path);
    expect(response?.status(), `${path} should be a real 404`).toBe(404);
  }
});

test("a missing record shows the not-found page, not a blank one", async ({ page }) => {
  // The status is asserted above; this is the other half — somebody who lands
  // on a dead link should be told what happened and shown a way out.
  for (const path of MISSING_SLUGS) {
    await page.goto(path);
    await expect(
      page.getByText(/not found/i).first(),
      `${path} should show the not-found page`,
    ).toBeVisible();
  }
});

test("the header and footer are on every page", async ({ page }) => {
  await page.goto("/pricing");

  // Both read their links from `nav_items`, so an empty menu renders an empty
  // header rather than failing — which is exactly the failure worth catching.
  await expect(page.getByRole("navigation", { name: "Main" })).toBeVisible();
  await expect(page.locator("footer")).toBeVisible();
});

test("every image on the home page declares its size", async ({ page }) => {
  /*
    The half of image-rules.md a machine can check.

    Width and height on the element are what stop the page reflowing as
    pictures load, and their absence is the single most common cause of a
    layout shift score that costs the Lighthouse budget in ground rule 5. What
    a machine cannot check here is whether the picture is cropped — that is on
    the click-through list, with a deliberately small file.
  */
  await page.goto("/");

  const images = page.locator("main img");
  const count = await images.count();

  for (let index = 0; index < count; index += 1) {
    const image = images.nth(index);
    const src = (await image.getAttribute("src")) ?? `image ${index}`;

    // An SVG has no intrinsic pixel size to declare and is exempt by the same
    // rule that exempts it from the no-upscale check.
    if (src.endsWith(".svg")) continue;

    await expect(image, `${src} should declare a width`).toHaveAttribute("width", /\d+/);
    await expect(image, `${src} should declare a height`).toHaveAttribute("height", /\d+/);
  }
});

test("both public forms render their fields, labelled", async ({ page }) => {
  /*
    Written when the two forms stopped carrying their own copy of `Field` and
    adopted the shared one on 2026-08-28. A label that stops being tied to its
    input is invisible on screen and total to somebody using a screen reader,
    so `getByLabel` is the assertion: it resolves through the accessibility
    tree, which is the thing the shared component exists to get right.
  */
  await page.goto("/contact");
  for (const label of [/your name/i, /email/i, /message/i]) {
    await expect(page.getByLabel(label).first()).toBeVisible();
  }

  await page.goto("/request-a-quote");
  for (const label of [/your name/i, /email/i, /tell us about the project/i]) {
    await expect(page.getByLabel(label).first()).toBeVisible();
  }

  // The long field is a textarea and spans the form; it was the one field with
  // a layout exception before the move, so it is the one worth naming.
  await expect(page.getByLabel(/tell us about the project/i)).toHaveJSProperty(
    "tagName",
    "TEXTAREA",
  );
});
