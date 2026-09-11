# Where everything stands

> **What is still to do now lives in [../PENDING.md](../PENDING.md)**, updated
> 2026-09-11 — start there. The most urgent item on it is that five of the six
> demos render no content at all, which every check in this file was green
> through.

**One page, updated 2026-08-31.** How much of each project is built, how much of
it has actually been tested, and what is left. Read this first; the reasoning
behind any line of it is in [estate-status.md](estate-status.md).

Every number here is counted from something — a phase table, a test run, a query
against the database. None of it is typed from memory. That rule exists because
a number typed from memory was wrong in this very file two days ago, was
believed, and was repeated to the owner.

---

## 1. The nine projects

| Project | Port | Built | Unit tests | Browser tests | Left to do |
|---|---|---|---|---|---|
| **Company website** | 3000 | **80%** | 259 ✅ | 220 ✅ | Phase 4 — launch. Almost none of it is code |
| **Internal panel** | 3100 | **100%** | 47 ✅ | 4 ✅, 4 skipped | Nothing in code |
| **Task tracker** | 3200 | **100%** | 37 ✅ | 49 ✅, 13 skipped | Nothing in code |
| **Clinic demo** | 3300 | **100%** | 27 ✅ | 42 ✅ | Nothing |
| **Restaurant demo** | 3400 | **100%** | 27 ✅ | 42 ✅ | Nothing |
| **School demo** | 3500 | **100%** | 27 ✅ | 42 ✅ | Nothing |
| **Property demo** | 3600 | **100%** | 27 ✅ | 42 ✅ | Nothing |
| **CRM demo** | 3700 | **100%** | 27 ✅ | 42 ✅ | Nothing |
| **Store demo** | 3800 | **83%** | 48 ✅ | 52 ⏳ never run | **One SQL file** — §3 |

**The whole estate: 13 of 17 phases, about 76%.** Three of the four that remain
are not developer work at all — a domain, a lawyer, and content. The only code
left in the plan is inbound email threading, and it cannot be written before the
domain exists.

---

## 2. What has been tested, and what that does not mean

### Tested by a machine ✅

| | |
|---|---|
| **Typecheck, lint, unit tests, production build** | Nine projects, four checks each — **36 of 36 pass** |
| **Unit tests** | **526 in total**, all green |
| **Browser tests** | **430 written**, **378 green**, 17 skipped, 52 never run |
| **The database, asked directly** | `verify:estate`, `check:effects`, `check:demos`, `check:queries`, `check:schema`, `check:policies` |

**All of it again, on a different computer.** Everything above was first measured
on the machine it was built on, where a passing check can be a fact about that
machine rather than about the code. On 2026-08-31 the eight pushed repositories
were cloned onto a second one and re-run from nothing:

| | |
|---|---|
| **The four checks** | Eight projects — **32 of 32 pass** |
| **Unit tests** | **478**, all green: 259 + 47 + 37 and 27 for each of five demos. With the store's 48, the 526 above |
| **Browser tests** | **220 green** on the company site, **42 green** on each of five demos, **12 green** on the tracker's admin screens |
| **The database** | `verify:estate` 46 applied, 0 pending · `check:demos` and `check:queries` fully green · `check:effects` red on the store's two rows and nothing else |

That run is what found the four new defects in §5, and the split between them is
worth keeping. Two are artefacts of a second machine being a different machine —
different folder names, a colder dev server — and would never have appeared
here. The other two are the same render loop, which was in the code all along,
on the deployed site, in front of anyone who changed the theme. A fresh machine
did not cause it; it just took a run that nobody expected to pass to go and look
at why one had been failing all along.

### Not tested at all ❌

**Nobody has clicked through any of this.** Not one screen of the six demos, not
the estate screens, not the store. The suites check what they were told to
check; a page can be ugly, confusing or subtly wrong in ways none of them would
notice.

**The store has never run against a real database.** Its schema is applied and
its rows are not, so not one of its pages has ever rendered real data.

**The 17 skipped tests** all wait on the same thing: a signed-in session for the
owner's own account, which is deliberately not a password in a file.

**A real phone, a screen reader, and email deliverability** remain unproven, and
none of the three can be proven from this machine.

---

## 3. What is waiting on the owner

### One SQL file — five minutes

```
demo-ecommerce/supabase/migrations/20260902000003_demo_shop_content.sql
```

Everything else is applied: `npm run verify:estate` says **49 applied, 0 still
to run**, and `control` and `demo_shop` are both in the exposed-schema list.

This one file failed on paste with `ERROR: 42P01: relation "a" does not exist`,
and **the file was never wrong.** Postgres strips `--` comments before it looks
for strings, so an apostrophe in a comment is nothing to it — but the editor
splits statements before stripping comments, treats that apostrophe as the start
of a string literal, swallows several hundred lines of real SQL up to the next
one, and resumes reading SQL in the middle of an English sentence. The first
word it finds becomes a table name:

```
-- ...a real customer's words is a lie with a signature on it.
                      ^opens                    ^closes   →  relation "a"
```

The school demo's content file failed the same way on 2026-08-30 with
`relation "the"`. **Every apostrophe in every `--` comment across all 51
migration files is now a typographic quote instead** — 182 of them. The prose
reads identically and there is nothing left for a splitter to trip on.

**Check it worked, rather than assuming:**

```
cd services && npm run check:effects
```

Two lines in it are red right now and go green the moment that file runs:
*demo_shop has 3 businesses* and *the store has stock on its shelves*. That check
exists because `verify:estate` cannot see a content migration at all — a file of
`insert` statements creates nothing a catalogue can be asked about, which is how
the store ended up with a schema, working functions, a clean verification, and
not one row in it.

### Then, in this order

1. `cd demo-ecommerce && npm run gen:types` — the store's types are hand-written
   from the migration, because a generator cannot read a schema that does not
   exist. Until this runs, its type safety is a claim about the SQL rather than
   about the database.
2. `cd demo-ecommerce && npx playwright test` — 52 tests that have never run.
3. Tick the six demos on your own account: **Users → Applications**.
4. `cd tracker && node e2e/save-admin-session.mjs`, and the same in `portal` —
   un-skips the 17. A session saved anywhere in the estate serves the rest:
   these cookies are scoped to `localhost` without a port, so the one the
   company site's own suite writes to `services/e2e/.auth/owner.json` can simply
   be copied to `tracker/e2e/.auth/admin.json`, and the tracker's admin screens
   go green — 12 of them, verified this way on 2026-08-31 with no password read
   from anywhere.
5. **On a machine that is not the one this was built on**, write
   `.env.test.local` in `portal` and `tracker` first. It holds
   `PORTAL_TEST_CLIENT_EMAIL` / `_PASSWORD` and `TRACKER_TEST_EMPLOYEE_EMAIL` /
   `_PASSWORD` — the two accounts that exist only for testing, and the only
   passwords in this estate that belong in a file at all. It is git-ignored, so
   it does not travel with a clone, and without it both suites fail at sign-in
   on an undefined password: 65 tests that look broken and are merely locked.
6. Walk the screens. Each project has its own `docs/testing.md`.

---

## 4. What is not built, said plainly

| | Why |
|---|---|
| **Phase 4 — launch** | A domain, three accounts, email deliverability, a lawyer on the legal pages, and your own biography |
| **Half of phase 5** — inbound email threading | Needs the domain first |
| **Phase 15** — WhatsApp Cloud API | Needs Meta business verification and a dedicated number |
| **Phase 16** — growth content | Blog posts, cost estimator, profile PDF. After launch |
| **Photographs, everywhere** | Nine applications running on type, colour and layout. Every `media` table is empty, and a stock photograph of a smiling stranger would make these look like every other template |
| **`control.note` calls** | The audit log is built and empty, because no action writes to it yet. Share links, clones, role changes and account changes all should |
| **A seventh demo** | Six exist, one more than the plan asked for. Whether to add another is a decision to take after somebody has been shown these |

---

## 5. The defects fixed on 2026-08-31

Most of them were invisible to every check that existed, which is the reason
each one is written down rather than just corrected.

The first is in a class of its own. It was live on the deployed site, it had
been there since the hero was built, and **every check in §2 passed while it
ran** — 259 unit tests, a clean build, and a browser suite that had already
been rewritten to work around its symptom without anyone recognising it as one.

| | What it was |
|---|---|
| **The hero re-rendered for ever, and took the tab with it** | `AssembleScene` defaults `lines` to a fresh `["APKA", "VISSION"]` on every render, and `SceneMount` never passes one. That array was a dependency of the effect that rasterises the wordmark: the effect set state, the state re-rendered, the render built another array, and the effect ran again. Measured on the dev server, from load, with nothing clicked: **2,320 renders and 1,160 rasterisations in seven seconds**, each one a 640×320 text raster and a `getImageData` readback. The page still looked right — it simply had no idle main thread left, so an input dispatch was swallowed roughly once in fifteen, and a theme change, which asks that thread for a view transition on top, stopped the tab dead with Chrome's **"Page Unresponsive"** on `services-jet.vercel.app`. Fixed by keying the effect on the words rather than on the array holding them. Click on the theme control: **never returned → 25ms**; main thread: **saturated → 70% idle** |
| **A flake that was a bug wearing a flake's clothes** | `playwright.config.ts` justified `retries: 1` with an input dispatch that "occasionally never resolves… roughly once in fifteen", and listed *a WebGL render loop* among four explanations **tested and ruled out**. `e2e/theme.spec.ts` drives the theme control with the keyboard for the same reason, calling it an open question. Both were describing the row above. It was a React render loop, not a WebGL one, which is how it survived being looked for. The keyboard workaround and the retry can both be reconsidered now |
| **A racing assertion in the tracker** | `expect(await columns.count())` is asked once and answered once, so it landed while the board still read "Loading" and counted 0 of an expected 5. Every other assertion in that file retries by itself. Now `expect.poll`, which keeps the "at least five" that `toHaveCount` would have to give up |
| **Four estate scripts that only ran on one computer** | `verify:estate`, `check:effects`, `check:demos` and `check:queries` opened `c:/Users/kumar/portal/.env.local` by absolute path. On a second machine every one died on ENOENT before asking the database a single question, and the failure read like a broken script rather than a wrong path. They now resolve the estate relative to the repository and match each project by any name it has been cloned under — `portal` or `clientPortal`, `demo-crm` or `demo_CRM` — via `scripts/estate.mjs`. A project that is on none of them is reported absent by name instead of skipped in silence, which is what kept the store's absence honest rather than invisible. The same fix was needed in the portal's and tracker's `auth.setup.ts` |
| **Every forked demo panel asked for the clinic's key** | `auth.ts` in four demos still read `includes("clinic")`. An account with `crm` and not `clinic` could not open its own panel; one with `clinic` could open all five. `APP_KEY` now sits beside `DB_SCHEMA` in the one file every fork has to edit |
| **A tick box that did something else** | The company admin offered "Task tracker". The tracker does not read that column at all — what the box actually unlocked was the property demo. Label corrected, value left alone so nobody lost access |
| **A 500 on every page of the company site** | Tailwind v4 finds its own sources and skips what git ignores. An unignored build directory got scanned and produced CSS containing a control character. Typecheck, lint and 259 unit tests stayed green through it; `curl` found it |
| **Apostrophes in `--` comments** | Two migrations that were never wrong, failing on paste. §3 |

---

## 6. What changed on 2026-09-03, and the one thing that was wrong

### The leak, found and closed

Every demo was switched to **link-only** earlier in the day, and `check:door`
proved the application turned an uninvited visitor away. It did. The database
did not.

```
curl "$SUPABASE_URL/rest/v1/courses?select=*"   -H "apikey: $PUBLISHABLE_KEY" -H "Accept-Profile: demo_school"
```

That request — carrying nothing but the key every browser is handed, which can
be read straight out of any page of the one demo that is currently public —
returned rows from **all six schemas**. Fifty-one `*_public_read` policies asked
only whether a row was *finished*:

```
variants_public_read   using (is_active)
courses_public_read    using (status = 'published')
```

Not one of them asked *who is asking*, because they were written when every demo
was public and there was no such thing as a visitor to turn away. Closing the
demos changed the question and left the answers alone.

**The fix.** The share token now travels to PostgREST in an `x-share-token`
header, set by `supabase/server.ts` from the cookie the door already writes, and
three functions per schema — `visitor_token()`, `admitted_variant()`,
`may_see(variant)` — let a policy ask the same question `can_view` asks. All
fifty-one policies were amended rather than rewritten, by a `DO` block that names
each one it touches. `media_public` got `security_invoker`: a view runs as its
owner, so it was an unlocked door beside a locked one.

**`npm run check:leak`** is the proof, and it is a check rather than a story. It
reads every public table with the browser's own key, fails if a closed demo
gives back anything, then mints a link, opens exactly one business with it, and
watches the same token stop working once the link is gone.

### The panel, made whole

The demo panels had five menu entries in front of a database holding
testimonials, questions, a navigation menu, an inbox and a picture library —
every one of them rendered on the public site, none of them reachable by the
person whose site it is.

| New screen | What it does |
|---|---|
| **Enquiries** | Everything sent through the forms, unread at the top |
| **Testimonials** | Add, edit, publish, remove — a draft stays off the site |
| **Questions** | The same, for the things people ask |
| **Menu** | The links across the top, reordered one place at a time |
| **Pages** | Pages a business writes for itself, built from bands |
| **Pictures** | The library, with alt text, and no delete for a file in use |
| **Brand** | A logo for light and for dark, the share card, and the search words |

The shop keeps its own combined Content screen; it does not get a second
Testimonials or Questions screen for rows it already edits.

**Pages** are `pages` + `page_sections` — rows, not a JSON blob, so they order,
join to a picture and answer to a policy like everything else here. Four
layouts, and a slug checked against that demo's own route folders before saving,
because a page saved at `/contact` would be stored, published, listed in the
panel and never rendered.

### The logo, reaching the site

`variants.logo_light_id`, `logo_dark_id` and `og_image_id` had been in the
schema since it was written, all null, because there was no bucket and no
screen. Both now exist. The header draws the mark — both files, with CSS
choosing, so a theme toggle cannot show the wrong one — and prints the business
name beside it only when the lockup does not already say it.

`metaTitle` and `metaDescription` reach the page, with the business name and
tagline as fallbacks, and the share card uses the uploaded picture. Demos stay
`noindex` whatever their visibility says: these carry a prospect's name, and a
demo that outranks the business it was built for takes months to undo.

### Measured, not asserted

| | |
|---|---|
| **Browser tests** | **359 green** across the six demos with the gate in place — 59 + 60 + 60 + 60 + 60 + 60 |
| **Typecheck and lint** | Six demos, clean |
| **`check:leak`** | Five closed demos show a stranger nothing; a live link opens one business; a dead one opens none |
| **`check:panel`** | Signs in as the owner, opens all eight panel reads in all six schemas, writes a page with a band, reads it back, deletes it, and checks the band went too |
| **`check:loaders`** | Every route covered, and **247 forms** that all use the fact that they are saving |
| **`check:copies`** | 56 copied files across the estate, in step |

### Still open

**Nothing is open to the public any more.** The clinic demo's three businesses
— cardiology, dental and eyecare — were deliberately opened from the estate
screen at 05:54 on 2026-09-03 and closed again the same day, on the owner's
instruction, through `control.set_demo_visibility` so the audit log names both
changes. `check:leak` now reports all six schemas showing a stranger nothing.

**Closing them found a bug in the check, not in the gate.** With the clinic
closed, `check:leak` picked the first closed schema and asked it for one live
link — unordered, and filtering only on "not revoked, not expired". It got the
clinic's `Manager` link, which has used 2 of its 2 views, and reported `a link
should open one business, not 0`. The database was right: `admitted_variant()`
checks `max_views`, and a spent link opens nothing. The check now filters for it
too. A check that calls correct behaviour a failure is the expensive way round,
and this is the second one this week — `check:demos` had the same shape.

**The shop's hand-written schema is gone.** `demo_ecommerce/src/types/database.ts`
carried 627 lines copied out of a migration, with a note saying to switch to
generated types once the migrations were applied. They had been. It is derived
now, like the other five.

---

## 7. Git

All nine repositories are committed on `main`, authored as
**Apka Vission &lt;apkavission@gmail.com&gt;**, each pointed at its GitHub remote.

**Eight of the nine have been pushed**, and the proof is that they were cloned
onto a second computer on 2026-08-31 and every check in §2 was re-run there.
`demo_ecommerce` was not pushed and is therefore not on that machine at all —
which is why the store is absent from the numbers above rather than failing in
them. This paragraph said "nothing has been pushed" until that clone happened.

Before committing, every file git would include was
scanned against the real values in the local `.env` files: no key, password or
token appears in any of them.

**That scan missed a live token, and the reason is worth keeping.** It compared
committed files against the values in `.env`, so it could only ever find a
secret that was *also* in an `.env` file. `portal/e2e/.auth/client.json` and
`staff.json` are Playwright session state, and each holds a real
`sb-…-auth-token` cookie — an access token and a **refresh token**, which can be
exchanged for new access tokens until it is revoked. Neither is in any `.env`,
so the scan had nothing to match them against and passed. `services` and
`tracker` git-ignore `e2e/.auth/`; the portal did not, and the two files were
committed and pushed. They are untracked and ignored as of 2026-08-31, **but
they remain in that repository's history**, so the tokens need revoking — a
password change on either test account invalidates its refresh tokens — and the
history rewritten or the repository treated as having leaked. The lesson is that
a scan which looks for known secrets cannot find an unknown one; what catches
this class is asking what a file *is*, not whether it matches a list.

What also appears, in documentation, is the
company's own email addresses, the two test Gmail accounts and the Supabase
project URL — the last is public by design, the first two are a decision worth
making deliberately if these repositories are public.

| Repository | Project |
|---|---|
| `apkavission/services` | services |
| `apkavission/clientPortal` | portal |
| `apkavission/taskTracker` | tracker |
| `apkavission/demo_clinic` | demo-clinic |
| `apkavission/demo_restaurant` | demo-restaurant |
| `apkavission/demo_School` | demo-school |
| `apkavission/demo_RealState` | demo-realestate |
| `apkavission/demo_CRM` | demo-crm |
| `apkavission/demo_ecommerce` | demo-ecommerce |
