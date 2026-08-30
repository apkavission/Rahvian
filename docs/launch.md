# Launch — everything held back for later

**Owner's instruction, 2026-08-28: "production ka cheez baad me karenge."** So
this is where it all sits. Nothing in this file is blocking anything in the
build; the site is finished and tested locally without any of it.

**One file, on purpose.** Launch work used to be spread across three documents
and a phase table, which is how a checklist ends up half-remembered. This is the
list. [owner-checklist.md](owner-checklist.md) is the same ground written for
the owner in plain language, screen by screen; this is the operational version.

---

## Nothing here is waiting on a developer

That is the whole shape of what is left, and it is worth saying before the list:
**every item below needs an account, a payment, a legal opinion, or content that
does not exist yet.** The last piece of code that launch needed — the soft 404 —
was finished on 2026-08-28.

---

## 1. Accounts and the domain

| # | What | Why it blocks launch |
|---|---|---|
| 1.1 | **Choose and buy the domain** | Everything else keys off it. `NEXT_PUBLIC_SITE_URL` drives canonicals, the sitemap, robots.txt and every Open Graph URL; the placeholder is `apkasaathitech.com` |
| 1.2 | **Vercel account**, then connect this repository | There is no deployment at all today — the site runs locally |
| 1.3 | **Mail sender account** (Resend or another SMTP) | Enquiry emails have nowhere to go |
| 1.4 | **SPF, DKIM and DMARC on the sending domain** | Without them mail sends *successfully* and lands in spam, with nothing reporting a failure. **This is the one that fails silently** |
| 1.5 | **Cloudflare Turnstile keys** | Both are blank, so the public forms have no spam protection whatsoever |

Supabase and Cloudflare R2 are already done and verified.

## 2. Environment on Vercel

Set these on the deployment. **`.env.local` is not the list to paste** — two of
its entries must never reach production.

| Variable | Note |
|---|---|
| `NEXT_PUBLIC_SITE_URL` | The real domain |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | As local |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only. Never prefixed `NEXT_PUBLIC_` |
| `R2_*` (four) | As local |
| `SMTP_*`, `EMAIL_FROM`, `EMAIL_TO_ADMIN` | From 1.3 |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY` | From 1.5 |
| `IP_HASH_SALT` | A fresh random string. Without it lead IP hashes are unsalted |
| `REVALIDATE_SECRET` | A fresh one, not the local value |
| `CRON_SECRET` | A fresh one. Vercel Cron sends `Authorization: Bearer $CRON_SECRET`; without it the scheduled jobs fall back to `REVALIDATE_SECRET` |
| ~~`ADMIN_EMAIL`, `ADMIN_PASSWORD`~~ | **Must not be set in production.** They exist locally so the browser tests can sign in |

## 3. Accounts and secrets to clean up first

| # | What | Where |
|---|---|---|
| 3.1 | **Delete the test account** `kumarnitish4384@gmail.com` — a live owner-role account that exists only to prove sign-in works | Supabase → Authentication → Users |
| 3.2 | **Rotate the owner's password** — it was printed in a terminal when the account was created | Same screen |
| 3.3 | **Rotate anything ever shown outside `.env.local`** — the service role key, the R2 credentials, the SMTP password | Each provider's dashboard |

## 4. Content, before anybody sees it

All of it through the admin panel, all of it described screen by screen in
[owner-checklist.md](owner-checklist.md).

- Contact details in Settings — phone, WhatsApp, address, CIN, GST, social links
- Technologies ticked on each of the seven services (a block that has never
  rendered on any service page, because no service names one)
- The real portfolio items and case studies — both pages work and are empty
- Team, and the images: eleven image fields across seven screens

## 5. Legal, before the site is indexed

- **A lawyer reads the privacy policy and the terms.** Both are written and
  neither has been read by anybody qualified.
- **DPDP Act 2023**: a consent notice, a retention policy, and a way for
  somebody to ask for their data to be erased. None of the three is a
  developer's decision to make on the company's behalf.

## 6. Deploy day, in order

1. Deploy, with section 2 set.
2. Point the domain at it; check `NEXT_PUBLIC_SITE_URL` matches exactly.
3. Verify mail end to end — send a real enquiry, confirm it arrives and is not
   in spam.
4. Confirm the two scheduled jobs ran: `/api/cron/keep-alive` at 03:00 and
   `/api/cron/backup` at 03:30. `npm run db:backup -- --list` shows the bucket.
5. `E2E_BASE_URL=https://… npm run test:e2e` against the deployed site.
6. `E2E_BASE_URL=https://… npm run check:weight`, then a real Lighthouse pass on
   a real handset — the byte budget is measured, the score in ground rule 5 is
   not.
7. Work down the click-through list in [testing.md](testing.md) once.
8. **Last of all**: open the site to search engines at `/admin/seo`. It asks for
   confirmation, and both the meta tags and robots.txt follow within seconds.

## 7. Optional, and each one is a decision

Not needed to launch. Listed so they are decisions rather than oversights.

| What | The decision |
|---|---|
| Six database columns nothing reads | `seo_defaults.ga_measurement_id`, `gsc_property`, `default_og_image_id`, `nav_items.icon`, `badge_text`, `services.body`, and the `redirects` table. Dropping them is a migration — see [pre-production-cleanup.md](pre-production-cleanup.md) §5 |
| `src/lib/supabase/client.ts` | Nothing imports it. Keep it if the client portal will use realtime; delete it if the portal writes its own |
| The `@testing-library` group, `jsdom`, `@vitejs/plugin-react` | Installed for component tests that were never written. They go when somebody decides those are not coming |
| axe-core in the browser suite | Would find more than the sixteen accessibility checks written by hand. It is a new dependency, so it is the owner's call |
| A blog byline | Needs `team_members` to become a public-safe author source, or an `author_name` column. Posts publish under the company's name until then |
| A `/products` index | In the specification's route list. Needs a product row holding category, operating system and a store link — facts nobody holds yet |

---

## What is already done, so nobody redoes it

- **Both scheduled jobs are written, verified and configured.** `vercel.json`
  carries the keep-alive at 03:00 and the backup at 03:30. `npm run db:backup`
  is the same backup by hand, for when the application will not run.
- **The soft 404 is fixed** — a made-up record address returns a real 404,
  confirmed in a production build.
- **The site is tested**: 224 unit tests and 205 browser tests, all green, plus
  a page-weight budget. What is *not* automated is the admin click-through,
  which is a person's job and is booked for after the build is declared
  complete.
