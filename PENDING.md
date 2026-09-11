# What is left to do

**One page, and the only one to read first.** Updated 2026-09-11. Every number
here was counted from the code or asked of the database on that date — none of
it is typed from memory. Where something has not been verified, it says so.

Nothing in this file or in this work goes anywhere but this machine: no memory
service, nothing published, nothing sent.

- The reasoning behind the finished work is in
  [docs/plans/2026-09-10-demos-dynamic-and-design.md](docs/plans/2026-09-10-demos-dynamic-and-design.md)
- Where the whole estate stands is in [docs/STATUS.md](docs/STATUS.md)

---

## 1. Start here: five demos are rendering no content

**This is the most urgent thing on the page, and it is invisible to every check
that exists.**

When the logo columns were added on 2026-09-03, the three named joins that read
them — `light:media!variants_logo_light_id_fkey` and its two siblings — were
pasted onto **every** `.select()` in `src/lib/variants.ts`. Those foreign keys
exist on `variants` alone, so PostgREST answers every other query with

```
Could not find a relationship between 'services' and 'media'
```

and each function falls back to its empty array. The site renders its empty
states — no services, no people, no reviews, no questions, no menu — while the
rows sit in the database.

Counted on 2026-09-11, by walking each `.select()` and reading the `.from()`
above it:

| Demo | Joins in the file | On tables that do not have them |
|---|---|---|
| clinic | 4 | **0** — fixed 2026-09-11 |
| restaurant | 8 | **5** |
| school | 8 | **5** |
| real estate | 8 | **5** |
| CRM | 8 | **5** |
| store | 12 | **9** |

**The fix**, per demo: in `src/lib/variants.ts`, every query whose `.from()` is
not `variants` selects `"*"` and nothing else. The three `variants` queries keep
the join — and gain `hero:media!variants_hero_image_id_fkey(storage_key, alt)`
when §3 is done. The clinic's version of that file is the model.

**Then prove it**, because typecheck, lint, 143 unit tests and 59 browser tests
were all green while the clinic was empty:

```
npm run dev
node scripts/shoot-site.mjs      # and look at the pictures
```

### And two demos have duplicated rows

Both content migrations were applied twice on the restaurant, so its page asks
each question and answers it twice, and shows six reviews that are three.
Asked of the database on 2026-09-11:

| Schema | testimonials (rows/unique) | faqs (rows/unique) |
|---|---|---|
| demo_clinic | 9 / 9 | 15 / 15 |
| **demo_resto** | **18 / 9** | **24 / 12** |
| demo_school | 9 / 9 | 12 / 12 |
| demo_estate | 9 / 9 | 12 / 12 |
| demo_crm | 9 / 9 | 12 / 12 |
| demo_shop | 12 / 12 | 16 / 16 |

The clinic was de-duplicated by keeping the earliest copy of each
`(variant_id, quote)` and `(variant_id, question)`, ordered by `created_at` then
`id` so the result does not depend on which row the planner reaches first.
Nothing references these rows by id.

---

## 2. What is left in the clinic

The clinic is the model for the other five, and two of its four parts are only
half done. Measured 2026-09-11.

| | State | How it was measured |
|---|---|---|
| **Dynamic from the panel** | **done** | `check:copy` 9/9, `check:website` 13/13 |
| **Responsive** | **done** | The suite runs 6 widths × 6 pages — 60 tests. The hero measured at 390/768/1280/1920: no sideways scroll, heading inside the band at every width |
| **Design and layout** | **home page only** | The six inner pages are on their original layout |
| **Animation** | **home page only** | `data-reveal` and `enter` counted per file: home page 8 and 6; every inner page **0 and 0** |

### The six inner pages

`/services`, `/doctors`, `/reviews`, `/questions`, `/contact`, `/book` read
their title and opening line from the business, and nothing else about them has
changed. Somebody clicking the menu leaves the redesigned home page and lands
on the old, plain site — which is the most visible gap left, because the menu is
the first thing a prospect clicks.

What the home page has that they do not:

- a band at the top — a **shorter** one than the home page's, so the page below
  it is still reachable
- cards with the price-forward footer, the monogram avatars, the chips
- the section rhythm: `py-16 md:py-20`, alternating `bg-surface` bands, the
  `rule-accent` heading with its intro on a 62ch measure
- `data-reveal` on each heading block and each card, with `--i` for the stagger
- a better layout for the two forms, on `/book` and `/contact`

And then `check:motion` has to be pointed at all seven routes rather than the
home page alone, because a reveal that hides content is the one way animation
breaks a page and it has to be checked per page.

### One decision that is not mine to make

Seven labels on the home page are still literals: **"Your first visit",
"Opening hours", "Where to come", "Experience", "You will see", "Treatments"**
and the three day names. On the inner pages: **"Nothing listed yet."**, "Nobody
listed yet.", "Ask us something", "Send a message", and the demonstration
notice.

These name the layout rather than say anything about the business, and making
all forty editable would be a panel nobody finishes filling in. It is left as a
question rather than assumed either way.

---

## 3. What every other demo needs, in order

The five demos already have, verified on 2026-09-11 with `check:website` 13/13
each: the **Website screen** (identity, 14 colours in both modes, 8 theme
presets, 6 typeface pairings, radius, default mode, contact, labels), **fonts
reaching the page**, and the **`dark:` variant fixed** so an explicit theme
choice swaps the logo and the icons.

They do **not** have any of the following. Do them in this order, one demo at a
time, finishing one before starting the next.

### 3.1 The content-query fix — §1. Nothing else matters until the pages have content on them.

### 3.2 `variants.copy`, so the words come out of the code

One migration per schema, the clinic's
`supabase/migrations/20260911000010_home_copy.sql` with the schema name changed.
Apply it **through a direct connection**, not the SQL editor — see §5.

Then port, from the clinic:

- `src/lib/copy.ts` and `copy.test.ts` — **rewrite the defaults for that
  industry.** These are the strings the site shows when nobody has edited it,
  and they have to be sentences that demo's businesses could actually keep. A
  restaurant does not promise "sterilisation you can watch".
- `readCopy` into `src/lib/variants.ts`, `copy` onto the `Variant` interface
- `saveCopy` in `src/lib/actions/website.ts`, and the **Words on the site** tab
- the six inner pages reading `copy.pages.<page>`
- `scripts/check-copy.mjs`, and the `check:copy` script in `package.json`

Per-demo differences that have to be got right rather than copied:

| Demo | Port | Schema | Reserved slugs (its own route folders) | The main button's default |
|---|---|---|---|---|
| restaurant | 3400 | `demo_resto` | book, contact, menu, people, questions, reviews | Book a table |
| school | 3500 | `demo_school` | book, contact, courses, people, questions, reviews | Book a campus visit |
| real estate | 3600 | `demo_estate` | book, contact, people, properties, questions, reviews | Book a viewing |
| CRM | 3700 | `demo_crm` | book, contact, features, people, questions, reviews | Start a trial |
| store | 3800 | `demo_shop` | cart, checkout, contact, order, people, questions, reviews, shop | — (reads no feature toggles) |

**The schema is never the folder name.** `demo_restaurant` and `demo_realestate`
do not exist. Read it from `src/lib/supabase/constants.ts` rather than typing
it — §5.

### 3.3 The banner hero

- migration: `20260911000020_hero_media.sql`, schema name changed
- `src/components/site/hero.tsx`, the `.hero-*` block in `globals.css`, and the
  `--ink` pair in `themeCss()` — §5 says why that last one is not optional
- `saveHero`, `uploadHero`, `clearHero` and the **First screen** tab
- `scripts/make-hero.mjs` — and **change `BUSINESS_TYPE`-equivalent composition
  for the industry**: a restaurant's banner should not be the clinic's balls and
  rings. The rule that carries over is the composition rule, not the drawing:
  everything inside the middle 70%, the left third calm.
- `scripts/check-hero.mjs`

### 3.4 The home page, rebuilt for that industry

This is the part that must **not** be a copy. The owner was explicit: *"crm alag
h, real state alag h and ecommerce alag h"*. What carries over is the method —
a layout is a sequence of answers, and the first screen answers the five
questions somebody actually arrives with. What those five questions are differs:

| Demo | What the first screen has to answer |
|---|---|
| **restaurant** | What is it like inside · what is on the menu · what does a meal cost · can I book tonight · where is it |
| **school** | Which board and which classes · what are the fees · what were the results · when do admissions open · where is it |
| **real estate** | What is for sale near me · what does it cost per square foot · is it ready or under construction · can I see it this week · who is selling |
| **CRM** | What does it do · what does it cost a month · can I try it free · does it work with what I already use · who else uses it |
| **store** | What is in stock · what does delivery cost and when · can I return it · is paying safe · what is on offer now |

Then: the promises strip, the price-forward cards, the accordion, the pinned
action bar on phones, and the scroll reveal.

### 3.5 Structured data

`src/lib/seo.ts` and `seo.test.ts`, with **`BUSINESS_TYPE` changed** —
`Restaurant`, `School`, `RealEstateAgent`, `SoftwareApplication`, `Store`. Every
one of them has fields of its own worth emitting: a restaurant has `servesCuisine`
and `menu`, a store has `Product` offers with `availability`, a school has
`ItemList` of courses.

**The two refusals carry over unchanged, and they are the point of that file:**
no `aggregateRating` while the reviews are labelled as examples, and no
`openingHoursSpecification` built by parsing free text. Both are asserted by
tests, not left to a comment.

And every demo stays `noindex`. That is not a contradiction — a demo that
outranks the business it was built for takes months to undo. This is what a real
site inherits the day one of these becomes it.

### 3.6 Then the checks, per demo

```
npm run typecheck && npm run lint && npm test && npm run build
npx playwright test
npm run check:website && npm run check:copy && npm run check:motion && npm run check:hero
node scripts/shoot-site.mjs        # and look
```

---

## 4. The company site and the panels

Not started, and smaller than it sounds.

- **`services`** — the estate screen now offers each demo's panel as well as
  its site. The company site's own home page has not been looked at with the
  same eye as the clinic's, and it is the one page in the estate that is
  actually indexed, so its structured data matters more than any demo's.
- **`portal` and `tracker`** — they took the new palette, the new typeface and
  the new mark. Their layouts have not been touched.

---

## 5. Six traps, all of which have already cost time

Read this before starting. Every one of them is something that looked fine and
was not.

**The schema is not the folder name.** `demo_resto`, not `demo_restaurant`;
`demo_estate`, not `demo_realestate`. A service client connects happily to a
schema with no tables in it, so the symptom is not an error — it is a check
reporting two working features as broken while leaving a demo in a colour nobody
chose. Read `DB_SCHEMA` out of `src/lib/supabase/constants.ts`, whose own comment
says it is the value a fork gets wrong.

**The SQL editor breaks migrations that are not wrong.** It splits statements
before stripping `--` comments, so one apostrophe in a comment swallows several
hundred lines and resumes reading SQL mid-sentence — `relation "a" does not
exist`. Apply migrations through a direct `pg` connection instead:
`scripts/estate.mjs` gives the client. `verify:estate` reads the migration files
and checks the objects exist, so a migration applied this way is still counted.

**A `server-only` module cannot give a value to a client component.** A type
crosses that line for free; a `const` fails the production build while
`next dev`, `tsc --noEmit` and `eslint` all stay silent. `RESERVED_SLUGS` lives
in its own file for this reason.

**A killed dev server leaves a broken `.next`.** The symptom is a server that
starts and never answers, or routes that hang for ever. `cmd /c rmdir /s /q
.next` and start again — `rm -rf .next` in Git Bash takes minutes on Windows.

**Before the webfonts land, the page is a fraction of its height.** Any script
that walks the page — a screenshot, a motion check — must wait for two
consecutive equal `scrollHeight` readings first. Without it a walk decides it is
already at the bottom, breaks on its first turn, and the pictures come out as a
hero and four screens of blank. It is flaky, so it passes often enough to be
believed.

**A band that replaces `--text` leaks into the cards inside it.** The banner
hero sets light text so its own words read over a photograph, and the white card
in the first screen inherited it — the price of a first visit printed near-white
on near-white. `themeCss()` publishes the palette a second time as `--ink`,
which no band shadows, and a card inside the band asks for that back.

---

## 6. How to keep this page honest

Update it in the same commit as the work. When something here is finished, move
it into the plan document with the numbers from the run that finished it — and
if a number cannot be produced from a run, write down that it was not measured
rather than a number that sounds right.

The rule this estate learned the hard way: **a number typed from memory was
wrong in `STATUS.md`, was believed, and was repeated to the owner.**
