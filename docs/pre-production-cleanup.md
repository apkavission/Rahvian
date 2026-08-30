# Before this goes to production

Everything in this repository that should be **fixed, deleted or rotated**
before the site is live, with the evidence for each. Written 2026-08-28 from an
actual scan of the code, the dependencies, the database and a production build
— not from memory.

**How to use it:** work down the sections in order. Section 1 is defects, and
the site should not go live with any of them open. Sections 2 to 5 are things
that are merely dead — none of them breaks anything today, and all of them cost
somebody time later, because dead code is read by every person who arrives
after you and believed by all of them.

**What has been done since**, all of it verified afterwards with the full test
suite rather than assumed:

| | |
|---|---|
| §1.2 | Lint clean — 11 problems to none |
| §1.3 | The `middleware` deprecation; `THREE.Clock` turns out not to be ours |
| §3.1 | Five scaffold SVGs deleted, including Next.js's and Vercel's logos; root `README.md` rewritten |
| §4 | Five unused dependencies removed |

**What is left in the list is left on purpose.** Everything still open either
needs a decision that is the owner's — which of two options fixes the soft 404,
whether to drop six unused columns, whether component tests are coming — or is
an account action nobody but the owner can take.

---

## Added 2026-08-28, while filling the site with content

### A real enquiry sits in the database

One lead, from `kumarnitish4383@gmail.com`, named "Nitish Kumar", with a message
that says it is a test and asks to be ignored. It was submitted through the
public contact form on purpose — it is what proved the form, the row and both
emails work end to end. **Delete it from the Enquiries screen before launch**,
or the first thing the real inbox shows is a test.

There is a matching row in `form_submissions`. Deleting the lead is what the
screen offers; the submission row is the audit trail of the same event and can
be left.

### `EMAIL_TO_ADMIN` in `.env.local` points at a Gmail address

It is `kumarnitish4384@gmail.com`, which is one of the two addresses the owner
named for testing. That is correct for a developer machine and **wrong for
production**: the deployed environment must set it to the mailbox the business
actually reads, `info@apkasaathi.com`.

This file is local only and is never deployed, so nothing leaks — but the same
key exists in the hosting environment and has to be set there deliberately.

### Nitish Kumar's biography was written for him, not by him

The About page now carries a profile with a description that was drafted to fill
the screen. It is factual as far as it goes, but **it is somebody else's words
about a real person**, which is not a thing to leave on a live site. Read it and
rewrite it in the first person's own voice, or shorten it to what is plainly
true.

### The portfolio has two entries, both our own

Deliberate, and not a gap to be filled by inventing client work. Both are
`inhouse`, both are real: the product and this website. When client projects are
added, they need the client's agreement before their name appears.

### Testimonials are empty, and that is correct

The screen exists as of 2026-08-28; the table does not have a row in it. Nothing
was invented, because a testimonial is a real person's words and the table says
so — `testimonials_require_consent` refuses to publish one without recorded
consent. **Do not seed this table to make the page look fuller.**


## 1. Defects — do not launch with these open

**Both of the defects that were code are fixed.** What is left in this section
is one deprecation belonging to a dependency, and one status-code leak inside
the admin. Everything else in this document is a decision or an account action —
and everything to do with launch itself moved to [launch.md](launch.md).

### ~~1.1 A record that does not exist answers 200, not 404~~ — fixed 2026-08-28

Every made-up record address — `/services/anything`, `/portfolio/anything`,
`/blog/anything`, `/case-studies/anything`, `/blog/category/anything` — now
returns a real **404**, confirmed in a production build. Real addresses still
return 200 and the not-found page still renders with its own title and heading.

**The loader did not move.** It is a standing instruction and it stays: the two
`loading.tsx` files are byte-identical to what they were.

**How.** The page cannot fix this — a route-level `loading.tsx` flushes the
shell before the page reaches `notFound()`, and a status cannot be changed once
bytes have been sent. So the check moved into the proxy, which runs before any
response begins: `src/lib/content/slugs.ts` holds the live slugs for the five
record routes, and an address that is not among them is rewritten to a path with
no route — which Next already answers with the styled not-found page **and a
real 404**, the behaviour `/this-page-does-not-exist` has always had.

Three properties it was built with:

- **It costs nothing on any other request.** Five string comparisons, and
  everything else returns before a network call exists. Measured: the home page,
  `/pricing` and a real service page all still serve in 60ms.
- **It fails open.** If the lookup errors or times out, the request is let
  through — and a stale list is preferred to no list. The failure this prevents
  is a dead address answering 200; the failure it must never create is a live
  one answering 404.
- **One fetch, not twenty.** Requests arriving together share the in-flight
  lookup, and the answer is cached for a minute.

**This is Option B from the version of this section written earlier the same
day.** Option A — `dynamicParams = false` plus a Vercel deploy hook — is the
better shape and could not be built: the hook needs a Vercel account, and
without it new content would 404 until the next redeploy. Option B has a small
request-time cost and needs nothing that does not exist.

The test that was written **skipped** on the day the defect was found is now a
real assertion, and the suite has no skipped tests left.

### ~~1.1b The same bug weakened the admin's permission boundary~~

Unchanged, and still true: `requireMenu()`'s `notFound()` is served as 200 while
an address with no route is served as 404, so a screen somebody may not open is
distinguishable from one that does not exist. The body is identical either way,
so nothing is disclosed outright.

It is **not** fixed by the above — the proxy cannot know a person's menu without
reading their profile, which is the authorisation boundary it deliberately is
not. Left open, and it is a smaller problem than the public one was: it leaks a
status code to somebody already signed in.

### 1.3 One deprecation left, and it is not ours

**`THREE.Clock`.** Every page with a 3D scene logs `THREE.Clock: This module
has been deprecated. Please use THREE.Timer instead.`

**Nothing in `src/` constructs one** — checked on 2026-08-28; the only `Clock`
in this codebase is a lucide icon on the contact page. The call is
`clock: new THREE.Clock()` inside `@react-three/fiber`'s own store. So there is
no fix to make here: it goes away when that package ships a version using
`THREE.Timer`, and until then the warning is noise from a dependency.

What it does mean is that `@react-three/fiber` and `three` should be upgraded
together and deliberately, rather than by whichever one a routine bump moves
first.

~~**The `middleware` file convention.**~~ **Done 2026-08-28.**
`src/middleware.ts` became `src/proxy.ts` and its exported function was renamed
to match. `config.matcher` and every line of behaviour are unchanged, and the
whole browser suite — all 21 admin redirects, the sign-in, and all sixteen
signed-in screens — passed afterwards. Worth doing early rather than when it
breaks: that file is the first layer of the access model, and an upgrade week is
the wrong week to find that out.

---

## 2. Accounts, secrets and data — rotate and delete

| # | What | Why | Where |
|---|---|---|---|
| 2.1 | **Delete the test account** `kumarnitish4384@gmail.com` | It exists to prove the sign-in flow works and has no reason to survive it. It is a live owner-role account. | Supabase dashboard → Authentication → Users |
| 2.2 | **Rotate the owner's password** | It was printed in a terminal when the account was created. A password that has been shown is a password to change. | Same screen |
| 2.3 | **`ADMIN_PASSWORD` is in `.env.local`** | Put there so the browser tests can sign in, which is legitimate on a development machine and **must never reach a production environment**. Vercel's environment variables are a different list — do not paste `.env.local` into it wholesale. | `.env.local`, and whatever is set on Vercel |
| 2.4 | **Rotate anything ever shown outside `.env.local`** | The Supabase service role key, the R2 credentials, the SMTP password. Rotating is cheap and certain; deciding whether it was exposed is neither. | [privacy-rules.md](privacy-rules.md) has the dashboards |
| 2.5 | **Never run `npm run db:seed` against production** | It is destructive by design: it **deletes every row** of `nav_items`, `faqs`, `process_steps` and a page's `page_sections` before re-inserting the seed data. Run after launch, it would erase everything the owner had entered. | `scripts/seed.mjs` |

---

## 3. Files to delete

### ~~3.1 The scaffold that was never cleaned up~~ — done 2026-08-28

All five SVGs are deleted and the root `README.md` is rewritten.

`public/next.svg` and `public/vercel.svg` were **Next.js's and Vercel's logos,
served from a company site's public folder** at `/next.svg` and `/vercel.svg`,
which is a ground-rule-1 problem as much as a tidiness one. `file.svg`,
`globe.svg` and `window.svg` were scaffold icons. None of the five was
referenced anywhere in `src`, `e2e` or `scripts`. `public/` now contains
`brand/` and nothing else.

The root `README.md` was still create-next-app boilerplate — the first thing
anybody opening this repository read was a paragraph about `create-next-app`
and a set of links to Vercel's documentation. It now says what this project is,
points at the standing rules in `docs/`, and lists every command with what it
actually does — including the warning that `npm run db:seed` is destructive.

### 3.2 Generated directories

None of these is committed — all are in `.gitignore` — but they sit in the
working copy and should not be copied to a server or into a zip:

`.next/` · `test-results/` · `playwright-report/` · `node_modules/` ·
`e2e/.auth/` (a real session cookie for a real account)

### 3.3 The two files the framework writes back

`AGENTS.md` and `CLAUDE.md` are recreated in the repository root by **every**
`next dev` and `next build`. They are in `.gitignore` since 2026-08-28, and
ground rule 1 forbids them in the repository. **Check `git status` before any
commit** — this is a check, not a fix, because they reappear.

### 3.4 One source file nothing imports

`src/lib/supabase/client.ts` — the browser Supabase client. Written for
"realtime subscriptions and interactive admin surfaces", neither of which
exists. Nothing imports it.

Keep it if realtime is coming in the client portal; delete it if the portal will
write its own. Either is fine — what is not fine is nobody knowing which.

---

## ~~4. Dependencies nothing uses~~ — five removed 2026-08-28

`package.json` went from 19 runtime dependencies to **14**. Each was verified
unused by an import-specific search of `src`, `e2e` and `scripts` — not a bare
text search, which matches `prefers-reduced-motion` and `components/motion/`
and would have kept `motion` forever.

| Removed | Why it was there, and why it is not needed |
|---|---|
| `motion` | The scroll reveal was rewritten as pure CSS (`animation-timeline: view()`) and nothing has imported the package since |
| `@react-three/drei` | The three scenes use `@react-three/fiber` and `three` directly |
| `react-hook-form` | Every form on this site uses `useActionState` and a Server Action |
| `@hookform/resolvers` | Only useful with the above |
| `@aws-sdk/s3-request-presigner` | The bucket is private and files are served through `/media/[...slug]`, so nothing is ever presigned |

**Verified after removal**, not before: `tsc` clean, `npm run lint` clean,
`npm run build` compiles, 173 unit tests and 152 browser tests pass.

### Still there, deliberately

`@testing-library/jest-dom`, `@testing-library/react`,
`@testing-library/user-event`, `@vitejs/plugin-react` and `jsdom` are installed
and used by nothing — component tests were planned and never written. They are
the one group here with a plausible future, so they stay until somebody decides
component tests are not coming.

**`react-dom` must not be removed.** Nothing imports it by name and it is
required.

## 5. Database columns and tables nothing reads

None of these breaks anything. Each is a place where somebody will one day fill
in a value and wonder why nothing happened.

| Column / table | Status |
|---|---|
| `seo_defaults.default_og_image_id` | **Redundant, not unfinished.** `app/(site)/opengraph-image.tsx` already gives every route a card and fifteen routes override it with their own. Setting `openGraph.images` would suppress all fifteen. Deliberately not on the SEO form. |
| `seo_defaults.ga_measurement_id` | Nothing reads it. Analytics is not installed, and [privacy-rules.md](privacy-rules.md) says it is not added without the owner's word. |
| `seo_defaults.gsc_property` | Nothing reads it. Verification is done with the meta tag, which is on the form. |
| `nav_items.icon`, `nav_items.badge_text` | Nothing renders them — not the header, the dropdown, the mobile panel or any footer list. Deliberately not on the navigation form. |
| `services.body` | The long-form column. No page renders it. |
| `redirects` table | **Nothing reads it at all.** `CACHE_TAGS.redirects` described it as "read by middleware", and nothing ever did; the comment was corrected on 2026-08-28 to say so. Either the redirect layer gets built or the table goes. |

Dropping any of these needs a migration, which is the owner's to run. Listed
here so the decision is a decision.

---

## 6. Deploy-time checklist

Not cleanup, but the things that must be true on the day:

- [ ] `NEXT_PUBLIC_SITE_URL` set to the real domain — it drives canonicals, the
      sitemap, robots and every Open Graph URL.
- [ ] `ADMIN_PASSWORD` and `ADMIN_EMAIL` **not** set in the production
      environment.
- [ ] SPF, DKIM and DMARC on the sending domain **before** the first real send.
      Without them enquiry emails send successfully and land in spam, and
      nothing reports a failure.
- [ ] Turnstile keys — **the owner has to create these**, Cloudflare dashboard
      → Turnstile → add a site. Both are blank today, so the public forms have
      no spam protection at all.
- [ ] `SUPABASE_ACCESS_TOKEN` — **the owner**, Supabase dashboard → Account →
      Access Tokens. Only needed for `npm run db:types`, not at runtime.
- [ ] `IP_HASH_SALT` set, or lead IP hashes are not salted.
- [ ] `REVALIDATE_SECRET` set, or the cache invalidation endpoint is open.
- [ ] Turnstile keys set, or the public forms have no spam protection.
- [x] ~~A nightly backup~~ — **built and scheduled 2026-08-28.**
      `/api/cron/backup` runs nightly at 03:30 (`vercel.json`); `npm run
      db:backup` is the same job by hand, for when the application will not run.
      Both write `backups/YYYY-MM-DD.json.gz`; only the scheduled one prunes.
      Verified live. Not `pg_dump`: neither this machine nor a Vercel function
      has that binary.
- [x] ~~A daily keep-alive~~ — **built 2026-08-28.** `/api/cron/keep-alive`,
      scheduled in `vercel.json` for 03:00 daily. Refuses an unauthenticated
      caller, which a browser test asserts.
- [ ] **Set `CRON_SECRET` on Vercel**, or the keep-alive falls back to
      `REVALIDATE_SECRET` and Vercel Cron's own header will not be accepted.
- [ ] Run `npm run test:e2e` against the deployed site with `E2E_BASE_URL`.
- [ ] Run `npm run check:weight` against the deployed site, and then a real
      Lighthouse pass on a real handset — the byte budget is measured, the
      score in ground rule 5 is not.
- [ ] Work down the click-through list in [testing.md](testing.md) once.
- [ ] **Last of all:** open the site to search engines at `/admin/seo`.
      Everything else in [owner-checklist.md](owner-checklist.md) comes first.
