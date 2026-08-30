import { expect, test as setup } from "@playwright/test";
import { STORAGE_STATE } from "./routes";

/**
 * Sign in once, and save the session for the admin specs.
 *
 * `.env.example` has carried `ADMIN_EMAIL` and `ADMIN_PASSWORD` since the
 * beginning, for exactly this — "so end-to-end tests can sign in without
 * anyone typing a password from memory". They are filled in on this machine,
 * which means the admin click-through was never as blocked as
 * [testing.md](../docs/testing.md) said it was. That has been corrected there.
 *
 * The password is read from `.env.local` and never printed, never written into
 * a report, and never put in a failure message. What is saved is the session
 * cookie, in `e2e/.auth/`, which is git-ignored.
 *
 * **The specs that use this session only read.** They open screens and look at
 * them. Nothing creates, saves or deletes, and the reason is the shape of this
 * project rather than caution for its own sake: there is one Supabase project
 * and no staging copy, so a suite that wrote to it would be a suite editing the
 * company's real content on every run. The writes stay on the human
 * click-through list, where somebody can see what they changed and change it
 * back.
 */
setup("sign in", async ({ page }) => {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;

  // Skipped rather than failed. A machine without the credentials should still
  // get a green run of everything else, and a red one here would say "the
  // admin is broken" when it means "this laptop has no password".
  setup.skip(
    !email || !password,
    "ADMIN_EMAIL and ADMIN_PASSWORD are not set in .env.local — the signed-in specs need them.",
  );

  await page.goto("/admin/login");

  await page.getByLabel(/email/i).fill(email!);
  await page.getByLabel(/password/i).fill(password!);
  await page.getByRole("button", { name: /sign in/i }).click();

  // The dashboard, not just "somewhere that is not the login screen": a failed
  // sign-in re-renders the login form, and a URL assertion alone would pass on
  // it if the address happened not to change.
  await page.waitForURL(/\/admin(?!\/login)/, { timeout: 30_000 });
  await expect(page.getByRole("navigation", { name: "Admin" })).toBeVisible();

  await page.context().storageState({ path: STORAGE_STATE });
});
