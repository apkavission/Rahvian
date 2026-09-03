import { expect, test } from "@playwright/test";

/**
 * The logo and banner studio.
 *
 * ---------------------------------------------------------------------------
 * **This one downloads files, and that is still read-only.** The rule for this
 * suite is that it must not change the company's content — one Supabase project,
 * no staging copy. Nothing here writes a row: the studio is entirely a browser
 * tool, and the files land in a temporary directory Playwright throws away.
 *
 * Downloading is also the only thing worth testing hardest. A preview that
 * looks right and a file that is empty, mis-sized or has the on-screen guide
 * baked into it are all failures nobody sees until a client has the file.
 */

test("it draws five designs from a name", async ({ page }) => {
  await page.goto("/admin/studio");

  await expect(page.getByRole("heading", { name: "Logo & banners", level: 1 })).toBeVisible();

  await page.locator("main input[placeholder='Smile Care Dental']").fill("Smile Care Dental");

  const designs = page.locator("main section:has-text('Five designs') svg[data-studio='logo']");

  /* Waited for, not counted. `count()` answers with whatever is in the DOM at
     that instant, so on a screen still rendering it returns 0 and a test built
     on it skips itself while reading like a pass. */
  await expect(designs.first()).toBeVisible();
  await expect(designs).toHaveCount(5);
});

test("refresh gives designs nobody has seen", async ({ page }) => {
  await page.goto("/admin/studio");
  await page.locator("main input[placeholder='Smile Care Dental']").fill("Kora Label");

  const labels = () => page.locator("main ul li button p.font-medium").allInnerTexts();

  const first = await labels();
  expect(first.length, "five are offered").toBe(5);

  await page.getByRole("button", { name: /Show me five more/ }).click();

  /*
    A different set, not a redraw of the same one.

    The old tool arranged one fixed shape five ways, so every client got the
    same logo — "unique nahi hai" was exactly right. Every design now comes from
    a seed, and a refresh is a new seed.
  */
  await expect.poll(async () => (await labels()).join("|")).not.toBe(first.join("|"));
});

test("more like this holds the family and moves the rest", async ({ page }) => {
  await page.goto("/admin/studio");
  await page.locator("main input[placeholder='Smile Care Dental']").fill("Kora Label");

  /* Choose the first, then ask for more like it. */
  await page.locator("main ul li button").first().click();

  const kept = await page.locator("main ul li button p.font-medium").first().innerText();

  await page.getByRole("button", { name: /More like this/ }).click();

  await expect(
    page.getByRole("heading", { name: "More like the one you kept" }),
  ).toBeVisible();

  const variations = await page.locator("main ul li button p.font-medium").allInnerTexts();
  expect(variations.length).toBe(5);

  /*
    Something changed, and it is still recognisably related. The exact family
    label can differ inside one family — a polygon variation is "4-sided" or
    "6-sided outline" — so what is asserted here is that five arrived and the
    screen says what it is doing. `generate.test.ts` pins the rule itself.
  */
  expect(variations.join("|")).not.toBe(Array(5).fill(kept).join("|"));
});

test("the preview follows the design that was chosen", async ({ page }) => {
  await page.goto("/admin/studio");
  await page.locator("main input[placeholder='Smile Care Dental']").fill("Kora Label");

  const preview = page.locator("main section:has-text('How it looks') svg").first();
  await expect(preview).toBeVisible();

  const before = await preview.innerHTML();

  /* The last of the five, so it is certainly not the one shown by default. */
  await page.locator("main ul li button").nth(4).click();

  await expect.poll(async () => preview.innerHTML()).not.toBe(before);
});

test("the sizes it offers are the ones that get downloaded", async ({ page }) => {
  await page.goto("/admin/studio");
  await page.locator("main input[placeholder='Smile Care Dental']").fill("Kora Label");

  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download Browser tab, 32 by 32" }).click();

  const file = await download;

  /* The name says what it is, and the numbers in it are the numbers on the
     button — a favicon that is silently 512 pixels is a favicon nobody notices
     is wrong until the tab looks blurry. */
  expect(file.suggestedFilename()).toBe("kora-label-favicon@32x32.png");
});

test("the SVG comes out at the artwork's own size, not at nothing", async ({ page }) => {
  await page.goto("/admin/studio");
  await page.locator("main input[placeholder='Smile Care Dental']").fill("Kora Label");

  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: /The SVG/ }).click();

  const file = await download;

  /* An SVG has no chosen pixel size, so the file name takes its dimensions from
     the viewBox. When that was not done the download was called `@0x0.svg`,
     which reads as a broken export. */
  expect(file.suggestedFilename()).toMatch(/^kora-label-master@\d+x\d+\.svg$/);
  expect(file.suggestedFilename()).not.toContain("@0x0");
});

test("a banner is drawn at the size the platform asks for", async ({ page }) => {
  await page.goto("/admin/studio?tool=banner");

  await page.getByRole("button", { name: /LinkedIn banner/ }).click();

  const art = page.locator("main div.overflow-x-auto svg[data-studio='banner']").first();
  await expect(art).toBeVisible();

  /* 1584×396 is LinkedIn's, and getting it wrong produces a blurry upload
     rather than an error — which is why the number is asserted rather than
     trusted. */
  await expect(art).toHaveAttribute("viewBox", "0 0 1584 396");
});

test("things on a banner can be added and taken off", async ({ page }) => {
  await page.goto("/admin/studio?tool=banner");

  const layers = page.locator("section:has-text('What is on it') li");
  await expect(layers).toHaveCount(1);

  await page.getByRole("button", { name: "Panel", exact: true }).click();
  await expect(layers).toHaveCount(2);

  await page.getByRole("button", { name: "Remove" }).first().click();
  await expect(layers).toHaveCount(1);
});

test("it says when something has been dragged off the edge", async ({ page }) => {
  await page.goto("/admin/studio?tool=banner");

  const canvas = page.locator("main div.overflow-x-auto svg[data-studio='banner']").first();
  await expect(canvas).toBeVisible();

  const box = await canvas.boundingBox();
  expect(box, "the canvas is on screen").not.toBeNull();

  /*
    Drag the headline out to the right.

    This is the whole point of the guidance: the person is looking at the banner
    at a third of its real size, so a word past the edge is a thing they cannot
    see and the file certainly has.
  */
  await page.mouse.move(box!.x + box!.width * 0.4, box!.y + box!.height * 0.5);
  await page.mouse.down();
  await page.mouse.move(box!.x + box!.width * 1.4, box!.y + box!.height * 0.5, { steps: 12 });
  await page.mouse.up();

  await expect(
    page.locator("section:has-text('What to look at')").getByText(/runs off the edge/),
  ).toBeVisible();
});

test("it stays quiet about a banner with nothing wrong with it", async ({ page }) => {
  await page.goto("/admin/studio?tool=banner");

  /* A tool that warns about correct work is a tool people stop reading, so the
     default state has to be clean. */
  await expect(page.getByText(/Nothing is wrong with this one/)).toBeVisible();
});

test("the guide that helps on screen never reaches the file", async ({ page }) => {
  await page.goto("/admin/studio?tool=banner");

  /* On screen it is drawn — that is the whole point of it. */
  const shown = page.locator("main div.overflow-x-auto svg[data-studio='banner']");
  await expect(shown).toBeVisible();
  expect(await shown.innerHTML()).toContain("dasharray");

  /*
    In the node the download serialises, neither the guide nor the selection
    outline nor the invisible boxes that make layers draggable. A dotted
    rectangle baked into something somebody uploads is the obvious way a
    preview aid becomes an embarrassment.
  */
  const exported = page.locator("main div.sr-only svg[data-studio='banner']");
  const markup = await exported.innerHTML();

  expect(markup).not.toContain("dasharray");
  expect(markup).not.toContain("transparent");
});
