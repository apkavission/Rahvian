# The whole estate, checked — 2026-09-02

Nine applications, one database, eight schemas. This is what exists, what was
verified, what was wrong, and what only the owner can do.

**The short answer to the question that prompted it:** ten SQL files are
waiting. Every one has been executed against the live database inside a
transaction and rolled back, so they are known to parse and run — what has not
happened is the commit, because applying schema changes is the owner's, in the
Supabase editor, as it is everywhere in this estate. They are listed in §5.

---

## 1. What exists

| | Application | Port | Its own progress |
|---|---|---|---|
| 1 | Company website and super admin | 3000 | [PROGRESS.md](PROGRESS.md) — 80% of block A |
| 2 | Internal panel | 3100 | `portal/docs/PROGRESS.md` — 24 of 24 |
| 3 | Task tracker | 3200 | `tracker/docs/PROGRESS.md` — 32 of 32 |
| 4 | Clinic demo | 3300 | `demo-clinic/docs/PROGRESS.md` — 100% |
| 5 | Restaurant demo | 3400 | `demo-restaurant/docs/PROGRESS.md` — 100% |
| 6 | School demo | 3500 | `demo-school/docs/PROGRESS.md` — 100% |
| 7 | Property demo | 3600 | `demo-realestate/docs/PROGRESS.md` — 100% |
| 8 | CRM demo | 3700 | `demo-crm/docs/PROGRESS.md` — 100% |
| 9 | **Store demo** | 3800 | `demo-ecommerce/docs/PROGRESS.md` — 83%, waiting on its SQL |

**The whole estate is thirteen of seventeen phases, about 76%.** Of the four
that remain, three are not developer work — a domain, a lawyer, and content. The
only code left in the plan is inbound email threading, and it cannot be built
before the domain exists.

**A correction from 2026-08-30.** That day's version of this file said ten of
fifteen planned demo sites were not built. They were: the spec's Block C is five
demo applications with three variants each, and five times three is the fifteen.
All fifteen had existed since 2026-09-01. It is recorded rather than quietly
deleted because it is exactly the failure the counting rule exists to prevent —
a number read from memory, believed for two days, and repeated into a summary.

---

## 2. What was built this session

### The online store — a sixth demo, on 3800

The one demo that transacts. The other five end at an enquiry: somebody asks, the
panel answers. A shop cannot stop there, and a demo where the basket is a picture
is a brochure.

Three shops in one application — **Kora Label** (clothing), **Voltway**
(electronics), **Daily Basket** (grocery) — with 18 products across 9
collections, sizes, colours, stock counts and discount codes.

What makes it worth having:

- **The basket is a row in Postgres**, keyed by a cookie, so it survives a
  reload, a second tab, and a phone going to sleep on the checkout page. Those
  are the three things that actually happen to a shopping basket and none of
  them is survived by state held in a browser.
- **Stock really comes down.** The whole checkout is one database function
  holding the stock check, the coupon check and the price snapshot in a single
  transaction where they cannot half-happen. `for update` on the product rows is
  the point of it: a second checkout for the last item waits rather than both
  succeeding.
- **Money is paise, as an integer, and no total is ever stored.** Both totals
  are views — nothing to go stale, no second copy of the truth. The one
  deliberate exception is the price copied onto each order line, which is not a
  cache but a record of what the customer agreed to pay.
- **A coupon that fails says why.** Expired, switched off, used up, and basket
  too small are four different sentences. "Invalid code" when the real answer is
  "spend ₹200 more" loses a sale for no reason at all.
- **Three roles, where the other demos have two.** A shop has a job that is
  neither owner nor administrator: the person who packs orders. They move an
  order along and cannot change a price — not because they are not trusted, but
  because a pricing mistake made while packing is one nobody is looking for.
- **No card details are collected anywhere**, and a browser test asserts it.

### Phase 10 — the super admin

The one phase of Block C that had never started, and the cost was paid daily:
eight panels opened by hand, and "has anybody written in today" answered by
signing into six demos in turn, which meant it was mostly not answered.

- **An application registry.** `control.applications` is now the authority on
  what the estate consists of. The Users screen reads its tick boxes from it
  rather than from a hardcoded array — which is where it had already drifted
  twice.
- **One inbox.** Every enquiry and every message from every application, newest
  first, assembled from the registry at call time rather than from a hand-written
  union. A demo added next month appears without anybody editing that screen. It
  carries a name, a line of what they said and where it came from — deliberately
  no phone numbers and no addresses, because those stay in the application that
  owns them.
- **An estate dashboard** that says which application's schema is actually there
  and how much is in each. A missing schema answers "not reachable" rather than
  raising, so one broken application does not stop the other eight being
  reported.
- **An append-only audit log.** Nothing updates a row and nothing deletes one;
  every insert goes through a definer function, so an application may add to the
  log and may not tidy it. It is empty today, and the screen says that means
  nothing has been recorded rather than that nothing has happened.

### The clone button

"Cloning a business from the panel" sat on all five demos' not-done lists with
the same one-line explanation. It is now a button on the Businesses screen in all
six, and the walk lives in the database — one transaction, because a copy done in
six round trips leaves half a business behind the first time a connection drops,
and half looks finished.

It does not copy enquiries, messages or share links: those belong to the business
that received them. The copy arrives switched off and link-only, carrying the
original's words until somebody edits them — which is exactly when nobody should
be able to find it.

### Browser tests for every demo

The one phase missing in all of them. **42 tests each**, at desktop and phone
widths, and 52 for the store. They check the half nobody would report: a link
that still works after being closed, a link-only business reachable by typing its
address, three variants sharing a heading, a page that scrolls sideways on a
phone, a dark-mode choice that does not survive a reload.

**210 of them are green.** The store's 52 cannot run until its schema exists.

### Wide screens

All three older applications capped their content at 1280px and stopped. On the
1600px and 1920px monitors this is actually used on, that left a third of the
width empty while the task board scrolled and the enquiry table truncated.

Two steps up — 90rem above a 1600px viewport, 100rem above 1920 — and prose is
untouched, because `.measure` caps body copy at 68ch whatever the container
does. Steps rather than a fluid width: a layout that is never twice the same
cannot be checked.

---

## 3. What was actually wrong

Four things, and three of them were invisible to every check that existed.

### Every demo panel asked for the clinic's access key

`demo-restaurant`, `demo-school`, `demo-realestate` and `demo-crm` were all
forked from the clinic, and `auth.ts` in every one still read:

```ts
if (!(data.app_access ?? []).includes("clinic")) return null;
```

So an account carrying only `clinic` could open all five panels, and an account
carrying `crm` and not `clinic` could open none of them — **including its own.**
The database still refused to hand over any rows, because `is_admin()` in each
schema asks for the right key; what broke was the application's own guard, which
is the one that decides whether the screen renders at all.

Exactly the same shape as the dashboard-query bug found two days earlier: the
thing the fork had to change was a string in the middle of a file, and nothing
failed when it was not changed. The fix stops that string being loose — `APP_KEY`
now sits in `lib/supabase/constants.ts` beside `DB_SCHEMA`, the file every fork
already has to edit, with the two values that must agree next to each other.

### A checkbox that did something other than what it said

The company admin offered an application called **"Task tracker"**. The task
tracker does not read that column at all — it decides who may sign in by looking
for a row in `portal.staff`. What that checkbox actually unlocked was the
**property demo**, whose `is_admin()` asks for exactly that value.

It did something real and told the owner it did something else, which is the
worst of the three possible states. The value is unchanged and only the label
corrected — renaming it would have quietly revoked the property demo from every
account that already had it. The task tracker now has no entry at all, because a
switch that changes nothing is worse than an absent one.

### A 500 on every page of the company site

Making the build output directory overridable — so a verification build could run
without disturbing a dev server — had a consequence nothing would predict.
**Tailwind v4 discovers its own sources and skips whatever git ignores.**
`/.next/` was ignored; the new `.next-verify` was not. So Tailwind scanned the
compiled build output, pulled class-shaped strings out of it, and emitted CSS
containing a raw control character:

```
Error: Parsing CSS source code failed — Unexpected token Delim('\u{e}')
```

Typecheck, lint and 259 unit tests all stayed green through it. What found it was
`curl` against the running dev server.

### Four demos were not repositories

`demo-restaurant`, `demo-school`, `demo-realestate` and `demo-crm` had no `.git`
at all — no history, nothing to commit. Beyond that, Turbopack infers the
workspace root by walking up until it finds a lockfile, and with no repository
boundary to stop it, it found a stray `package.json` in the home directory left
by an unrelated install. All nine now pin `turbopack.root` to themselves, and all
nine are repositories with **nothing committed**.

---

## 4. What was run, and what it said

Every one of these can be run again, which is the point of them.

```
cd services && npm run verify:estate    every migration in every project
cd services && npm run check:effects    the policy and seed ones, by their effects
cd services && npm run check:demos      each demo schema, asked as an anonymous visitor
cd services && npm run check:queries    every panel query, run on its own schema
cd portal   && npm run check:schema     23 things the code reads, by name
cd portal   && npm run check:policies   13 rules, tested by planting real rows
```

**Static checks, nine projects, four each — typecheck, lint, unit tests and a
production build. All nine pass all four.**

Unit tests: 259 on the company website, 47 in the panel, 37 in the tracker, 27 in
each of five demos, 48 in the store.

**Browser suites:**

| | Result |
|---|---|
| Company website | **218 passed, 1 flaky** — `/admin/account` answered something other than 200 once and passed on retry. It was re-run afterwards by hand three times and answered correctly every time; the suite was running while nine production builds compiled on the same machine, which is contention rather than a defect. Said here rather than rounded up to 219 |
| Task tracker | **49 passed, 13 skipped** |
| Internal panel | **4 passed, 4 skipped** |
| Clinic, restaurant, school, property, CRM | **42 passed each — 210 in total** |
| Store | 52 written, cannot run until its schema exists |

The 17 skipped tests all wait on the same thing: a signed-in session for the
owner's own account, which is deliberately not a password in a file.

**One caveat worth writing down**, because it will happen again: a production
build run while that project's dev server is up can fail for a reason that is not
a defect. The build type-checks `.next/dev/types`, which the dev server is
regenerating underneath it, and the error reads `Cannot find name page`. Build
with the dev server stopped, or accept a re-run.

---

## 5. What only you can do

### 1. Run ten SQL files — about fifteen minutes

**The first five in this order**, because each depends on the one before:

| | File | What it does |
|---|---|---|
| 1 | `demo-ecommerce/supabase/migrations/20260902000001_demo_shop_foundation.sql` | The store's schema |
| 2 | `demo-ecommerce/supabase/migrations/20260902000002_demo_shop_security.sql` | Its policies, its three roles, the checkout function |
| 3 | `demo-ecommerce/supabase/migrations/20260902000003_demo_shop_content.sql` | Three shops of stock |
| 4 | `demo-ecommerce/supabase/migrations/20260902000004_demo_shop_clone.sql` | The store's clone button |
| 5 | `services/supabase/migrations/20260902000018_control_estate.sql` | The super admin: registry, inbox, audit log |

**Then five more, in any order.** Each is one function and nothing depends on
them — they are what puts the clone button on the older demos:

```
demo-clinic/supabase/migrations/20260831000005_demo_clinic_clone.sql
demo-restaurant/supabase/migrations/20260901000004_demo_resto_clone.sql
demo-school/supabase/migrations/20260901000004_demo_school_clone.sql
demo-realestate/supabase/migrations/20260901000004_demo_estate_clone.sql
demo-crm/supabase/migrations/20260901000004_demo_crm_clone.sql
```

**Then one line that is not a migration.** A schema Supabase is not serving
answers `Invalid schema` to every request, however full of rows it is:

```sql
alter role authenticator set pgrst.db_schemas =
  'public, graphql_public, company, portal, control,
   demo_clinic, demo_resto, demo_school, demo_estate, demo_crm, demo_shop';
notify pgrst, 'reload config';
```

Two schemas are new in that list: `control` and `demo_shop`. To undo the whole
thing: `alter role authenticator reset pgrst.db_schemas;`

**Then check it worked**, rather than assuming:

```
cd services && npm run verify:estate     # should say 0 still to run
cd services && npm run check:effects
cd services && npm run check:demos
cd demo-ecommerce && npm run gen:types   # the store's types, from the real schema
cd demo-ecommerce && npx playwright test # its 52 browser tests
```

### 2. Tick the demos on your own account — two minutes

Company website admin → **Users** → your account → **Applications** → tick all
six demos → save.

Every demo panel refuses an account that does not carry that demo. Right now that
is everybody including you, which is correct and looks exactly like a broken
panel if you were not expecting it. **The Store demo box only appears after step
1** — that list is read from the registry now.

### 3. Sign in once for the browser tests — one minute each

```
cd tracker && node e2e/save-admin-session.mjs
cd portal  && node e2e/save-admin-session.mjs
```

A browser opens; sign in as yourself; it saves the session and closes. That
un-skips the 17 tests.

### 4. Then walk the screens

Each project has its own click-through list, and the order is your own rule:
build until nothing is left but this, then walk it once, on something finished.

| | |
|---|---|
| Company website | [testing.md](testing.md) |
| Internal panel | `portal/docs/testing.md` |
| Task tracker | `tracker/docs/testing.md` |
| Each demo | `demo-*/docs/testing.md` |

Start with the store's, because it is the only application in the estate that has
never been run against a real database.

---

## 6. What is not built, said plainly

**Phase 4 — launch.** A domain, three accounts, email deliverability, a lawyer on
the legal pages, and your own biography. Almost none of it is code:
[owner-checklist.md](owner-checklist.md).

**Half of phase 5 — inbound email threading** over Cloudflare Email Routing.
WhatsApp click-to-chat and outbound email both work. This needs the domain.

**Phases 15 and 16 — WhatsApp Cloud API and growth content.** Both wait on things
outside this machine: Meta business verification, and a launched site.

**Photographs, everywhere.** Nine applications running on type, colour and
layout. There is a `media` table in every schema and nothing in any of them. That
is a content job, and a stock photograph of a smiling stranger would make these
look like every other template.

**A seventh demo.** Six exist, which is one more than the plan asked for. Whether
there should be more is a decision to take after somebody has been shown these.

**Anything committed or pushed, anywhere.** Nine repositories, all with
uncommitted work. That stays yours.
