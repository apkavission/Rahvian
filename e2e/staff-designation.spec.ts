import { expect, test } from "@playwright/test";

/**
 * A title is not a permission.
 *
 * ---------------------------------------------------------------------------
 * These two lived in one field, so giving somebody the title "Senior Developer"
 * meant inventing a role — and a role is what every menu and every policy
 * reads. Two people doing identical work at different seniorities had to either
 * share a title or be given different access to get one.
 *
 * What this checks is that the form now says both, separately, and that the
 * list of titles is the master list rather than words typed into a page.
 */

test("the staff panel asks for a role and a designation, separately", async ({ page }) => {
  await page.goto("/admin/users");

  /*
    The panel only appears once somebody is selected — it is about one person.

    Waited for, not counted. `count()` answers with whatever is in the DOM at
    that instant, so on a screen still rendering it returns 0 and this skipped
    itself — reporting "no accounts to select" on a screen that has four. A
    skip that reads like a pass is worse than a failure, because nobody looks.
  */
  const firstPerson = page.locator("main a[href*='account=']").first();
  await expect(firstPerson).toBeVisible();
  await firstPerson.click();

  const role = page.locator("#portal-role");
  const designation = page.locator("#portal-designation");

  await expect(role).toBeVisible();
  await expect(designation).toBeVisible();

  /*
    Two controls, not one relabelled. If a later change ever merges them again,
    this is what fails — and it fails here rather than as somebody being given
    admin access because they were promoted.
  */
  await expect(designation).not.toHaveAttribute("name", "role_key");
});

test("the titles come from the master list, and one of them is none", async ({ page }) => {
  await page.goto("/admin/users");

  const firstPerson = page.locator("main a[href*='account=']").first();
  await expect(firstPerson).toBeVisible();
  await firstPerson.click();

  /* Waited for, not counted. `count()` answers with whatever is in the DOM at
     that instant, so on a panel still rendering it returns 0 and this skipped
     itself — a skip that reads like a pass. */
  const designation = page.locator("#portal-designation");
  await expect(designation).toBeVisible();

  const options = await designation.locator("option").allInnerTexts();

  /*
    Seeded titles, read through `control.designations()`. A hard-coded list in
    the page would pass a test that only counted options, so this names one
    that is in the database.
  */
  expect(options.join(" | ")).toContain("Technical Lead");

  /* Somebody can work here before anybody decides what to call them, and a
     blank is better than a wrong one. It is also how a wrong title is taken
     off. */
  expect(options[0]).toMatch(/no designation/i);
});
