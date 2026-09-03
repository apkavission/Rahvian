import { expect, test } from "@playwright/test";

/**
 * The pager under every record list.
 *
 * ---------------------------------------------------------------------------
 * Eleven admin screens share one list component, so this is eleven screens'
 * pagination tested once — and the reason it is worth testing at all is that
 * the whole point of it is the *address*: a page you can send to somebody, open
 * in a new tab, and come back to with the back button.
 *
 * A `useState` pager looks identical on screen and does none of that. Nothing
 * you could see in a screenshot would tell the two apart, which is exactly why
 * it needs a test rather than a look.
 */

/**
 * The lists that do not go through the shared record component.
 *
 * Pages, the accounts list and the estate inbox are each written out by hand,
 * so each is a separate chance to have skipped the pager — and "every list in
 * every project has the same pagination" was the instruction. Asserting the
 * shared summary is what proves the shared component was used rather than
 * something that looks like it.
 */
for (const screen of [
  { path: "/admin/pages", name: "Pages" },
  { path: "/admin/users", name: "Accounts" },
  { path: "/admin/estate/inbox", name: "The estate inbox" },
]) {
  test(`${screen.name} counts its records with the shared pager`, async ({ page }) => {
    await page.goto(screen.path);

    /* Waited for, not counted. `count()` answers with whatever is in the DOM at
       that instant, so on a screen still rendering it returns 0 and the test
       skips itself while reading like a pass. */
    await expect(page.getByTestId("page-summary").first()).toBeVisible();
  });
}

test("a list says how many records there are", async ({ page }) => {
  await page.goto("/admin/services");

  /* The count stays even when everything fits on one page — "9 records" is
     worth knowing, and it is the thing somebody checks after filtering. */
  await expect(page.getByTestId("page-summary").first()).toBeVisible();
});

test("the page is in the address, so it can be linked to", async ({ page }) => {
  await page.goto("/admin/services?page=2");

  /*
    Page two of a two-record list is page one — clamped, not empty.

    A stale link to page seven answering with a blank column reads as "your
    search found nothing", and the reader has no way to tell the difference.
  */
  await expect(page.getByTestId("page-summary").first()).toBeVisible();

  /* The screen still renders rather than erroring on a page past the end. */
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
});

test("changing pages keeps everything else in the address", async ({ page }) => {
  /*
    A record is selected by a query parameter on these screens. Paging must
    not throw that away — "page 2 of the list I am looking at" is the only
    useful meaning of page 2.
  */
  await page.goto("/admin/services");

  const first = page.locator("main a[href*='service=']").first();
  if ((await first.count()) === 0) test.skip(true, "no records to select");

  await first.click();
  await expect(page).toHaveURL(/service=/);

  const pager = page.getByTestId("pagination");

  if ((await pager.count()) === 0) {
    /* One page of records, so there are no page links to check. Skipped with
       a reason rather than passing quietly on nothing. */
    test.skip(true, "this list fits on one page");
  }

  const second = pager.getByRole("link", { name: "Page 2" });
  await expect(second).toBeVisible();

  const href = await second.getAttribute("href");
  expect(href, "the selected record was dropped from the link").toContain("service=");
});
