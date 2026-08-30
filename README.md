# Apka Vission — company website

The services site, admin panel and client portal for **Apka Saathi Private
Limited**, trading as Apka Vission.

Everything on the public site is database-driven and editable from the admin
panel — the copy, the images, the menus, the pricing, the SEO and the switch
that opens the site to search engines. Nothing on it is hardcoded in a
component.

---

## Where to start

**Read [`docs/README.md`](docs/README.md) first.** It names the standing rules
that bind every screen in this project, and they are not optional — images,
responsiveness, loading, privacy, and what may and may not be committed.

Then [`docs/PROGRESS.md`](docs/PROGRESS.md), which is the living state of the
work: what is built, what is next, and every decision with the reason it was
made.

| | |
|---|---|
| **What the owner has to do** | [`docs/owner-checklist.md`](docs/owner-checklist.md) |
| **Before this goes live** | [`docs/pre-production-cleanup.md`](docs/pre-production-cleanup.md) |
| **What is tested and what is not** | [`docs/testing.md`](docs/testing.md) |

---

## Running it

```bash
npm ci
cp .env.example .env.local     # then fill it in — see the notes in that file
npm run dev
```

The public site is on `/`, the admin on `/admin`.

| Command | What it does |
|---|---|
| `npm run dev` | Development server |
| `npm run build` | Production build; prerenders every page against the live database |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm test` | Unit tests (Vitest) |
| `npm run test:e2e` | Browser tests (Playwright) — see [`e2e/README.md`](e2e/README.md) |
| `npm run db:types` | Regenerate `src/types/database.ts` from the live schema |
| `npm run db:seed` | Seed initial content. **Destructive** — never run against production |
| `npm run db:backup` | Take a backup by hand. The nightly one is `/api/cron/backup` |
| `npm run admin:create` | Create the first admin account on a fresh database |

---

## How it is put together

| | |
|---|---|
| **Framework** | Next.js, App Router, TypeScript |
| **Database** | Supabase — one project, seven schemas, row-level security on every table |
| **Storage** | Cloudflare R2, private. Files are served through the app, never straight from the bucket |
| **Email** | SMTP, sent from the server |
| **Styling** | Tailwind, with the design tokens in `src/app/globals.css` |

**Content is cached indefinitely under tags and cleared explicitly on save.**
That is what lets every page be static and every word of it still be editable
without a deploy. A write that forgets to invalidate serves stale content
forever with nothing failing to say so, which is why `src/lib/cache/tags.ts`
is the only place a tag may be named.

**Three layers decide who sees what**, and the weakest of them is the one you
can see: the proxy turns anonymous requests away from `/admin`, `requireMenu()`
answers 404 for a screen not in that person's menu, and row-level security
refuses the rows underneath both.

---

Private repository. All rights reserved.
