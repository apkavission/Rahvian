# The browser harness

`npm run test:e2e`

It starts the dev server if one is not already running, walks the public site
in Chromium, and reports. Nothing here needs a password, a database write, or
an account — which is why it can be run on any machine that can run the site.

## What it covers

| Spec | What it pins |
|---|---|
| `public-pages.spec.ts` | Every public route answers 200, has exactly one `<h1>`, and carries a title and a description. Plus: a missing address is a real 404, and every raster image on the home page declares its width and height |
| `responsive.spec.ts` | **Nothing scrolls sideways** on any public page at 360, 390, 768, 1024, 1280 or 1440 — the automatable half of [responsive-rules.md](../docs/responsive-rules.md). Plus the mobile menu opening, navigating and closing |
| `admin-guard.spec.ts` | Every admin address turns into the login screen when signed out, and carries where it was going. Plus: the panel is `noindex` whatever the site-wide switch says |
| `seo.spec.ts` | `robots.txt`, the sitemap and the meta tags **agree with each other** — in whichever state the crawl switch is in. Plus canonicals, one Organization graph, and a social card that is a real image |

## What it deliberately does not cover

**The admin click-through.** Signing in needs the test account's password,
which is not in `.env.local` and never will be — `scripts/create-admin.mjs`
will not reset one either. The full list of what to click, screen by screen, is
in [testing.md](../docs/testing.md), and it is run by a person in one pass at
the end. That is the owner's decision, taken 2026-08-28.

When the password does arrive, the shape to add is a `setup` project that signs
in once and saves `storageState`, with the admin specs depending on it. Not
before: a suite that skips half of itself by default is a suite whose green
means nothing.

**The words on the page.** Nothing here asserts a heading's text. Every page is
assembled from database rows the owner is about to fill in, and a suite that
has to be edited each time a sentence is reworded is a suite that gets deleted.

**Whether a picture is cropped.** A machine can check that an image declares
its size; it cannot check that it looks right. The no-upscale rule is on the
click-through list with a deliberately small file, because that is the only way
to see it.

## Notes

- **The dev server, not a production build.** `next build` prerenders every
  page against the live database and takes minutes. What these specs assert is
  identical either way.
- **An already-running server is reused.** If one is open on port 3000, the run
  uses it rather than failing on a taken port.
- **A different address:** `E2E_BASE_URL=https://… npm run test:e2e`. The
  `webServer` block still tries to start a local one first, so set it only
  against a deployment that is already up.
- **Browsers:** `npx playwright install chromium` once, on a new machine.
