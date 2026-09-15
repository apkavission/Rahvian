# What is left to do

**One page, and the only one to read first.** Updated 2026-09-13. Every number
here was counted from the code, asked of the database, or read off a run on that
date — none of it is typed from memory. Where something has not been verified, it
says so, and §1 is the place it says so loudest.

Nothing in this file or in this work goes anywhere but this machine: no memory
service, nothing published, nothing sent.

- The reasoning behind the finished work is in
  [docs/plans/2026-09-10-demos-dynamic-and-design.md](docs/plans/2026-09-10-demos-dynamic-and-design.md)
- Where the whole estate stands is in [docs/STATUS.md](docs/STATUS.md)

---

## 1. The content queries — fixed and looked at, 2026-09-12

When the logo columns were added on 2026-09-03, the three named joins that read
them — `light:media!variants_logo_light_id_fkey` and its two siblings — were
pasted onto **every** `.select()` in `src/lib/variants.ts`. Those foreign keys
exist on `variants` alone, so PostgREST answered every other query with

```
Could not find a relationship between 'services' and 'media'
```

and each function fell back to its empty array. Five demos rendered their empty
states — no services, no people, no reviews, no questions, no menu — while the
rows sat in the database, and every check was green through it.

**The fix is applied.** Every query whose `.from()` is not `variants` now selects
`"*"` and nothing else; the three `variants` queries keep their joins. Counted by
the script that made the change, on 2026-09-12:

| Demo | Queries fixed | `variants` joins kept |
|---|---|---|
| clinic | — (fixed 2026-09-11) | 3 |
| restaurant | 5 | 3 |
| school | 5 | 3 |
| real estate | 5 | 3 |
| CRM | 5 | 3 |
| store | 9 | 3 |

Each file also carries the note explaining why those queries select `*`, as the
clinic's does.

**And the looking has been done.** All six demos were installed, started on
their own ports from `com\`, and walked: **42 public pages, every one answering
200 with real content on it and no empty states**. The restaurant's home page
went from 4,475px of half-empty page to a full one, and the five demos that were
rendering nothing now render everything.

### And the restaurant's duplicated rows — removed 2026-09-12

Both content migrations had been applied twice on the restaurant, so its page
asked each question and answered it twice, and showed six reviews that were
three. It was visible the moment the page had content on it at all. Asked of the
database on 2026-09-11, and again after the removal:

| Schema | testimonials (rows/unique) | faqs (rows/unique) |
|---|---|---|
| demo_clinic | 9 / 9 | 15 / 15 |
| **demo_resto** | **18 / 9 → 9 / 9** | **24 / 12 → 12 / 12** |
| demo_school | 9 / 9 | 12 / 12 |
| demo_estate | 9 / 9 | 12 / 12 |
| demo_crm | 9 / 9 | 12 / 12 |
| demo_shop | 12 / 12 | 16 / 16 |

The rule is the clinic's, unchanged: keep the earliest copy of each
`(variant_id, quote)` and `(variant_id, question)`, ordered by `created_at` then
`id` so the result does not depend on which row the planner reaches first.
Nothing references these rows by id. The restaurant's home page lost 648px and
three duplicate cards.

---

## 2. The clinic — finished on 2026-09-12

All four parts are done, and the measurements below are from runs made that day
against a dev server, not from memory.

| | State | How it was measured |
|---|---|---|
| **Dynamic from the panel** | **done** | `check:copy` 9/9, `check:website` 13/13 |
| **Responsive** | **done** | The browser suite, 133 tests, all passing — 6 widths × 7 routes on two devices |
| **Design and layout** | **done** | All seven routes rebuilt and photographed in light and dark, plus the phone |
| **Animation** | **done** | `check:motion` 53/53, over all seven routes, in four states each |

### What was built: Edition 02

The pages were competent and they were not enough — *"itna simple and aacha nhi
lag raha h, client hume kyu dega project"*. A demo is judged in four seconds
against other agencies' demos, and the six pages behind the menu were the plain
site a prospect reached with their first click.

So there is now one design language, in three files, shared by all seven routes:

- **`src/app/globals.css`** — the Edition 02 block: the **aura** (three pools of
  the business's own accent, a ruled hairline grid and a grain, fixed under the
  whole document), `.tile`, `.spot`, `.btn`, `.micro`, `.display-hero`,
  `.page-band`, `.week-dot`, `.quote-glyph`, `.chapter-mark`, and three new
  reveal kinds — `mask`, `draw`, `lift`.
- **`src/components/site/ui.tsx`** — the furniture, once rather than seven
  times: `PageBand` (the shorter band at the top of an inner page), `SectionHead`
  (the numbered chapter, with a rule that draws itself), `Monogram`, `WeekStrip`,
  `Stat`, `Chip`.
- **`src/components/site/motion.tsx`** — the three things a stylesheet cannot
  know: the scroll-progress line, the counters that count up when they are
  reached, and one pointer listener per grid that pools the accent under the
  cursor. All three stand down for reduced motion, and the counter renders its
  final value on the server so a reader with no JavaScript sees the number.

Everything still comes out of the variant, there is still not one photograph,
and nothing on any page can be hidden by the motion — which is what the enlarged
`check:motion` asks, per route, in four states.

**Two traps this cost, both now written into the code:**

- **A grid column is at least min-content, and that is what makes a page scroll
sideways.** `grid-cols-[1fr]` does not mean "one column, any width" — an `auto`
or `1fr` track still refuses to go below the widest unbreakable thing in it. One
input with a long value, one A4 preview beside a form, and the whole document is
wider than the phone: three admin screens were, at 520px, 460px and 379px in a
360px viewport, and every one of them looked fine on a laptop.
`grid-cols-[minmax(0,1fr)]` is the fix, and it has to be said for the
single-column case as well as the wide one.

**A clipped element cannot reveal itself.** The first version of the `mask`
  reveal put `clip-path: inset(0 0 100% 0)` on the observed element. An
  `IntersectionObserver` measures the *visible* rectangle, a fully clipped target
  has none, so it never intersected, never got `data-revealed`, and every section
  heading on the page stayed invisible — while `check:motion` passed, because it
  only asked about opacity. The clip is now on a wrapper and the movement on the
  child, and the check asks about transforms as well.
- **`.tile` walked into the `--ink` trap** that `.card` already had a comment
  about: translucent over the banner hero, it inherited the band's light text and
  printed the price of a first visit near-white on near-white. Both selectors are
  now named in the same rule.

### One known wart — investigated 2026-09-13, and left alone on purpose

In development the reveal script sets `data-revealed` before React hydrates, so
React reports a hydration mismatch. **The fix this page proposed was built, and
it does not work.** Both halves of the sentence matter, which is why this is
written out rather than deleted.

It does not reproduce on an unthrottled machine — every page is clean and the
dev overlay shows nothing, which is why it was dismissed as noise for a while.
Throttle the processor six times and it appears on every inner route. That is
not an artificial condition; it is the laptop a prospect is holding.

Moving the observer into a `<Reveals />` client component, exactly as proposed,
produced the identical warning. The layout hydrates before the page segment
underneath it, so its effect still runs first — and waiting for `window.load`
does not help either, because on a slow machine hydration is still going when
`load` fires. What the move *did* cost was the animation: started that late, the
four-second failsafe wins on a slow machine and the page appears with no
entrance at all. Strictly worse, so it was reverted, and the reasoning now sits
in the layout beside the script so nobody spends the afternoon on it twice.

Making the attribute genuinely React's to write means turning fifty-three bands
across six demos into client components and shipping React for every card on
every page. That is a large, real cost against a warning a production build does
not print, on a mechanism a production build passes **53 of 53** motion checks
on — measured, on a real `next build`, not assumed.

### One decision that is not mine to make

Seven labels on the home page are still literals: **"Your first visit",
"Opening hours", "Where to come", "Experience", "You will see", "Treatments"**
and the three day names. On the inner pages: **"Nothing listed yet."**, "Nobody
listed yet.", "Not the question you had?", "Write to us", "What happens next",
and the demonstration notice.

These name the layout rather than say anything about the business, and making
all forty editable would be a panel nobody finishes filling in. It is left as a
question rather than assumed either way.

---

## 3. Edition 02 across the estate — done, 2026-09-12/13

All six demos now carry the same design system, the same dynamic content layer
and the same checks. None of them looks like another one.

### Its own hand, per demo

| Demo | Its own form | The first screen answers |
|---|---|---|
| clinic | monogram people, week strips, price-forward cards | can I be seen · what will it cost · who will see me · where · can I ring |
| restaurant | a **printed menu** — leaders running from dish to price, on warm paper | what is it like · what is on · what does it cost · can I book · where |
| school | a **ruled fee ledger** — stage, what it covers, a year — and an admissions timeline | which classes · what are the fees · who teaches · how a place is taken |
| real estate | a **board** — price rail, specification codes, a viewing link per row | what is for sale · what it costs · what it is · can I see it · who is selling |
| CRM | a **matrix** — included vs extra, grouped by the rows' own `meta_label` | what it does · what it costs a month · what is included · who builds it |
| store | a **shelf** — price first, old price struck through, stock state | what is in stock · delivery · returns · paying · what is reduced |

### What was built

- **The design layer**: the Edition 02 block in `globals.css`, the base motion
  layer, `components/site/motion.tsx`, `components/site/ui.tsx`, and the
  layout's chrome — the reveal observer, the aura, the grain, the scroll
  progress and a pinned header.
- **`variants.copy`** (migration `20260912000010`, five schemas): every heading,
  intro and promise on every page, read through `lib/copy.ts`. **Two bands, one
  shape**: the content band is `catalogue` and the people band is `people` in
  all five, with the trade's word carried as a *label* in `PAGE_KEYS` — which is
  why one reader, one panel screen and one check serve a restaurant and a school
  without either reading like the other.
- **The banner** (migration `20260912000020`): `hero_image_id` and
  `hero_video_url`, the `Hero` component, the `.hero-*` block, and the `--ink`
  pair in `themeCss()` — see §5 for why that last one is not optional. Every
  demo has a banner drawn for its own trade by its own `make-hero.mjs`: plates
  seen from above, ruled paper and a protractor, building masses, a rising
  series, folded cloth. The composition rule is the clinic's — everything inside
  the middle 70%, the left third calm — the drawing is not.
- **The panel**: *First screen* and *Words on the site*, with `saveCopy`,
  `saveHero`, `uploadHero` and `clearHero` behind them.
- **Structured data**: `lib/seo.ts` per demo with its own `BUSINESS_TYPE` —
  `Restaurant`, `School`, `RealEstateAgent`, `SoftwareApplication`, `Store`. The
  shop's is written rather than ported: it emits a `Product` per row with a
  price in the major unit and an `availability` read off the stock column, which
  is the field a shop is actually judged on. **Both refusals carry over and are
  asserted by tests**: no `aggregateRating` while the reviews are labelled as
  examples, and no `openingHoursSpecification` parsed out of free text.
- **The checks**: `check:copy`, `check:hero` and `check:motion` in every demo,
  each pointed at its own routes and port.

### Measured, not remembered

Every number below is from a run on 2026-09-13, not from memory.

| Demo | typecheck | lint | unit | `check:copy` | `check:hero` | `check:motion` |
|---|---|---|---|---|---|---|
| clinic | ok | ok | 178 | 9/9 | 10/10 | 53/53 |
| restaurant | ok | ok | 161 | 9/9 | 10/10 | 53/53 |
| school | ok | ok | 161 | 9/9 | 10/10 | 53/53 |
| real estate | ok | ok | 161 | 9/9 | 10/10 | 53/53 |
| CRM | ok | ok | 161 | 9/9 | 10/10 | 53/53 |
| store | ok | ok | 182 | 9/9 | 10/10 | 53/53 |

`check:motion` walks all seven routes of each demo in four states — freshly
loaded, scrolled to, reduced motion, and with the reveal switched off — which is
294 route-states across the estate. `check:copy` types a stamped heading into
the real panel, reads it back off the public page, and puts the business back as
it found it.

**Three things those runs found**, all now fixed and worth keeping written down:

- **The observer and the check disagreed by eighty pixels.** The reveal's
  `rootMargin` held a band back until it was 8% clear of the fold; the check
  calls anything with 80px showing "visible". On the school's fee ledger that
  was a card a reader could read sitting at opacity 0. The margin is 2% now.
- **A sold-out card is dimmed on purpose**, and the check read 70% opacity as a
  reveal that never arrived. The card says `data-dimmed` and the check skips it —
  better than teaching a motion check about clothes.
- **An empty basket had no page.** It returned a bare line of grey text, which
  reads as a site that has broken rather than a basket that is empty. It gets
  the same band as a full one.

### What is left here

- **The `noindex` question.** Every demo is still `noindex`, and since
  2026-09-12 they are also public and linked from the company's own site. The
  original reason — a demo outranking the real business it was built for — does
  not apply to invented businesses. It is a decision, not an oversight; §4 has
  the same note.
- ~~**`gen:types` is the second opinion, not the source.**~~ Settled on
  2026-09-13 by running it everywhere and diffing. All six demos derive
  `database.ts` from the generated file, so there is nothing to drift; only the
  portal and the tracker keep a hand-written copy. The tracker's agreed. **The
  portal's did not, and neither did the generated file it is checked against** —
  see §6.

---

## 4. The company site and the panels

### Done

- **The demos are on the website, and they open.** `control.public_demos()`
  (migration `20260912000010`) returns the businesses switched to **Open to
  anybody** on the estate screen and nothing else — no ids, no links, no
  openings — and it is the one function in `control` that `anon` may execute.
  A `demo_grid` section reads it live and shows a card per demo with the
  businesses inside it named; it is on `/` under the services grid and on
  `/portfolio` under the project grid, and the owner can move or re-word it from
  the panel. All eighteen active businesses were switched to public through the
  panel's own switch, so the change went through `asOwner()` and the estate's
  record rather than an UPDATE. `setDemoVisibility` expires the `demos` tag with
  `updateTag`, so the site follows the switch immediately.

  **Two things that cost time and are worth knowing.** `grant execute` is not
  enough on its own — without `grant usage on schema control to anon` PostgREST
  answers "permission denied for schema control" and the grid renders its empty
  state, which reads as "nothing has been opened yet". And in this version of
  Next, `revalidateTag` schedules a revalidation and takes a lifetime profile;
  the one that expires a tag now, from a Server Action, is `updateTag`.

- **The admin rail lists every screen it has.** Six screens had no link in it —
  the estate's three, the blog's categories, the enquiry sources — and the rail
  scrolled with no sign that it did, so the whole estate group sat below the
  fold on a 900px screen. Children in `components/admin/nav.ts` (no new
  `MenuKey`, so no migration and nothing to grant), a pure-CSS scroll shadow,
  and `e2e/routes.ts` corrected — it had never listed `/admin/letterhead`.

- **The admin stopped scrolling sideways on a phone.** Three screens were wider
  than the screen at 360px — `/admin/seo` at 520px, `/admin/letterhead` at
  460px, `/admin/estate/demos` at 379px — and all three had the same cause: a
  grid column is `auto` by default, which means *at least min-content*, so one
  long input value or an A4 preview beside a form makes the whole page wider
  than the phone. `minmax(0, 1fr)` on the single-column case is the fix, and the
  A4 preview now scrolls inside its own box rather than widening the document.
  The responsive suite went from 5 failures to **152 passing**.

- **The home page prints.** A scroll-driven reveal has no progress where there
  is no scrolling, so the bands at the foot of the page stayed on their first
  keyframe for anything that renders without scrolling. Measured: a reader who
  scrolls sees **0 of 50** reveals invisible — the effect works — but a printer,
  a PDF, a screenshot service or a crawler at a tall viewport saw **8 of 50**
  invisible, all of them at the foot where the FAQ and the closing call to
  action live. One `@media print` rule, the same one the demos carry.

### Left

- **The `noindex` question, which is a decision rather than a task.** Every demo
  is still `noindex`, and since 2026-09-12 they are also public and linked from
  the company's own site. The original reason — a demo outranking the real
  business it was built for — does not apply to invented businesses. Turning it
  off would put six industry demos into search results; leaving it on keeps them
  a thing we send. Nobody has decided.

- **One known wart, dev-only.** The reveal script sets `data-revealed` before
  React hydrates, so the dev overlay reports a hydration mismatch on every demo.
  The production build is clean and the reveals work. The fix is to start the
  observer from a client effect while the inline script keeps adding `js-reveal`
  and its four-second failsafe — a change to a mechanism now verified 53/53 in
  six applications, which is why it has not been made for a warning nobody but a
  developer sees.

---

## 5. The portal and the tracker — done, 2026-09-13

They had the palette, the typeface and the mark and nothing else: two rails and
two headers in flat white, thirty-two screens each opening with a bare `h1`, and
no motion anywhere. Working software that looked like a template.

### Not a paste of Edition 02, and the reason matters

The obvious move was to lift the demos' layer — aura, grain, numbered chapters,
headings rising out of a mask — and put it behind the sign-in. It would have
been wrong.

**A marketing page is read once; an application is read every day.** Grain under
a paragraph somebody skims for eight seconds is texture. Grain under a table
somebody reads for eight hours is dirt on the screen. A heading that animates
into place is a pleasure the first time and a delay the fortieth. And a scroll
reveal in an application means a table whose rows are invisible until scrolled
to — the exact bug the demos took two attempts to get right, reintroduced
somewhere it would be worse.

So the decoration is confined to the chrome, which nobody reads, and the working
surface is left clean:

- **`chrome-rail`** — a wash of the brand down the first 240px of the rail and a
  one-pixel lit edge. Take it away and the screen goes flat, which is the test
  for whether a background is doing anything.
- **`chrome-bar`** — the header blurs what passes under it rather than hiding it.
- **`chrome-field`** — two very large, very faint fixed radial washes behind the
  page. At this opacity you cannot point at them.
- **`scroll-hint` / `scroll-thin`** — the same pure-CSS scroll shadow the company
  panel got. The tracker's rail carries six groups; on a 720px laptop the last
  two are below the fold, and a rail with no scrollbar and no shadow looks
  exactly like a rail with nothing else in it.
- **`rail-link`** — the active item was an inset box-shadow that blinked from one
  item to the next with nothing in between. Now one bar travels, drawn by a
  scaling pseudo-element the compositor can carry.
- **`PageHead`** — section eyebrow, title, one sentence, actions. Thirty-two
  screens wrote their own heading and no two agreed on where the button went.
  The short rule under the title draws itself once on arrival and is the only
  motion on a working surface anywhere in either application.
- **`page-enter`** — one fade and six pixels of rise for the whole screen, 320ms,
  on the shell rather than on thirty-two pages. A navigation reads as a page
  opening rather than a page being swapped.
- **`panel` / `panel-link` / `stat`** — 153 ad-hoc card surfaces across the two
  applications collapsed onto one, and a card you can click now answers the
  pointer with one pixel of lift.

### Two things the work found on its way past

- **The portal's dashboard was the worst screen in either application**, and the
  content was not the problem. Four cards stacked in one column down the left of
  a 1440px window, so on a normal morning — one unanswered request, nothing else
  — signing in showed a single small box above eight hundred pixels of empty
  grey. It looked broken. It was working exactly as designed and saying "one
  thing needs you", which is good news badly told. It now opens with a strip of
  four figures and puts the cards in a grid that fills the width it was given.
- **`ConfirmProvider` was nested inside itself** on the tracker's client branch:
  two contexts, two portals and two escape-key listeners for one dialog.

### The suite was lying, and it had been for a while

The tracker's browser suite failed **10 of 139** before any of this, on five
different screens each run, always at the widest viewport — the signature of
flaky CSS, and read that way for a while. It was not CSS.

The admin session is borrowed from the company site's `owner.json`, whose cookie
lasts a year and whose access token lasts an hour. By the afternoon it is always
expired, so the first request each worker makes refreshes it — and Supabase
rotates the refresh token on every refresh. Of three workers starting from the
same expired token, one gets a session and two are holding a token that has just
been revoked. They were bounced to `/login`, and the spec measured a signed-out
page as though it were the screen.

`auth.setup.ts` now spends the borrowed session once, in one browser, before any
project starts, and saves what comes back. Three further failures were selectors
matching both the rail and the thing they meant; they are scoped now. **131 pass,
1 fails** — a two-browser realtime chat notification test that fails identically
at `HEAD` and is nothing to do with any of this.

### Measured, not remembered

`check:screens` is new in both applications and runs the real sign-in: every
screen an admin can reach, at 360px and in the dark theme, checked for sideways
overflow, for text too near its own background to read (WCAG AA), and for a 200.

| | typecheck | lint | unit | screens | browser |
|---|---|---|---|---|---|
| `clientPortal` | clean | clean¹ | 66 | 14/14 | 38 pass, 1 skip |
| `taskTracker` | clean | clean | 65 | 20/20 | 131 pass, 1 pre-existing fail |

¹ One pre-existing warning in `src/types/conformance.ts`, untouched.

**Two versions of `check:screens` were wrong before it was right**, and both
would have got real screens "fixed":

1. It scraped three numbers out of the computed colour. The new chrome is built
   on `color-mix()`, whose computed value is `oklab(0.999994 0.0000455 0.00002 /
   0.88)` — white at 88% — and three numbers read from that as 0–255 describe
   near-black. It reported every item in the tracker's header unreadable at
   2.0:1. Colours are now resolved by painting them on a 1×1 canvas.
2. It then took the nearest ancestor with a background and laid it over white.
   In the dark theme a `bg-surface-2/60` table head — dark at 60% — became light
   grey, and white text on it was reported at 4.2:1. The whole stack of
   backgrounds is now painted in order, outermost first.

A check that is confidently wrong is worse than no check, because it is the kind
of wrong that gets acted on.

---

## 6. The checks themselves — 2026-09-13

Everything in §5 was about two applications. This section is about the tools
that were supposed to be watching all nine, and were not.

Nothing here was found by reading. Every item is something that appeared the
moment a check was actually run to the end, which several of them had not been
for weeks.

### The store's browser suite had never run. It failed 49 of 119.

`docs/STATUS.md` had it at 83% with "one SQL file" outstanding. The SQL was
applied — `check:effects` says *demo_shop has 3 businesses* and *the store has
stock on its shelves* — so the page was simply stale. The suite was the real
gap, and running it found two faults, both of them **fixes the clinic already
had and the other five had never been given**:

- **`page.goto("/")` then reading `page.url()`.** The bare address answers 200
  and sends the browser on, and under a streaming render that second step lands
  after the navigation settles. The slug came out empty, so every page was
  requested as `//shop` — which a browser reads as the *host* `shop`, and the
  failure says `net::ERR_ABORTED at http://shop/` rather than anything about the
  demo. One `waitForURL`, now in all six.
- **`head meta[name="robots"]`.** Next streams metadata into the body and lets
  React hoist it, so in development it is a child of `<body>` and in production
  it is in `<head>`. The selector named `head`, so the test claiming *"the demo
  is never indexed"* failed — a failure asserting the demos are indexable, which
  is the one thing that test exists to be trusted about. Dropped the parent.

All six suites now run: **133 each** for clinic, restaurant, school, property and
CRM; **119** for the store.

### A verification build turned a clean lint into 7,470 problems

`next.config.ts` honours `NEXT_DIST_DIR` so a production build can be made
without overwriting the manifest the dev server is reading — but only `.next` was
in eslint's ignore list. One verification build and eslint reported 395 errors
and 7,075 warnings, every one of them inside a bundle nobody wrote. `.next-*/**`
is ignored in all nine projects now.

### `check:routes` was reporting 13 security violations that did not exist

Every `!!` was in the admin column, and the answer was always `login`. There was
no admin: `PORTAL_TEST_STAFF_EMAIL` is not set on this machine, so that person
silently became "signed out", and every screen they were supposed to reach read
as a screen that refused somebody it should have let in.

A check that cannot run has to say so. A person with no credential now gets a
column of `no login`, is judged neither way, is **named at the foot of the run**,
and keeps the exit code dirty — because a green check that checked three of four
people is a green check nobody should trust. The file already made this argument
about servers that were not running; it had not been applied one level up.

Then the fourth person was given a password, so the check could actually ask:
`admin.test@apkavission.test`, a test-only account on the reserved `.test` TLD
that can never receive mail, written to the git-ignored `.env.test.local`. **All
four columns, fourteen routes, every one correct.**

### `check:policies` died on "could not sign in as undefined"

The same missing-credential story with a worse message. Its loader took the
first `.env.test.local` it could open, and the credentials it needs live in two
files by design — the client's in the portal's, the employee's in the tracker's.
For a long time that was harmless, because the only readable file on this
machine was the tracker's, which carries both. The moment the portal got its own
file holding just the client, the employee's password vanished. It merges now.
**13 policy checks, all holding.**

### `check:demos` said "All five demos" and meant it

The store was never added to the list, so this check covered five of six while
printing a sentence that read as a complete pass. Its private table is `orders`:
a stranger reading those would be reading other people's names, addresses and
baskets — the worst of the six to leave unasked. Added, and the closing line
counts the list instead of stating a number. **All 6, correct.**

### `check:queries` matched queries to tables by counting

It collected every `.select()` in a dashboard and paired them *by position*
against `[enquiry, "messages", "share_links"]`. That worked exactly as long as
every dashboard was the same three queries in the same order, because they were
all cut from one template. The store's is five, so its product columns were
asked of `share_links` and its basket columns of `orders`, and the check
reported three broken queries when all five were fine. It reads `.from()` now.
**Six demos, twenty queries, all sound.**

### `check:door` contradicted itself in its last sentence

With all six demos running and answering, three lines below its own list of the
six it had just reached and found ungated, it ended: *"no demo was running.
Start one and run this again."* There is no door because the door was
deliberately removed on 2026-09-12. It says that now, and exits clean.

### The portal's schema types were 520 lines behind the database

`conformance.ts` compares the hand-written `database.ts` against the generated
one column by column, and it had been passing — against a generated file that
was itself missing **fourteen tables and five columns**. Regenerating it is what
made the check able to see anything. It then named, correctly, five columns the
database has and the type did not: `last_seen_at`, `date_of_birth`, `joined_on`
and `designation_key` on `staff`, and `last_seen_at` on `client_users`. A query
selecting any of them would have got `never` back.

**A conformance test is only ever as honest as the thing it conforms to.** All
six demos and the tracker were checked the same way and had no drift at all.

### Two findings that are the owner's to settle, not mine

`check:privileges` reports both, and neither is a code fault — they are facts
about a real person's access, so nothing was changed:

- **Rahul Kumar is `developer` in the portal and `admin` on the website.** That
  grants the whole estate, everybody's salary slips included, while every
  tracker screen calls them a developer.
- **The same account is on the staff list and is also a client user**
  ("8683081955"), so every rule of the form "staff or client" matches them
  twice.

---

## 7. Eight traps, all of which have already cost time

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

**A clipped element cannot reveal itself.** An `IntersectionObserver` measures
the element's *visible* rectangle. Put `clip-path: inset(0 0 100% 0)` on a
heading as its resting state and it has no visible rectangle, so it never
intersects, never gets the attribute that would unclip it, and stays invisible
for ever — on a page where every other band reveals correctly, and with a motion
check that passes because it was only asking about opacity. Clip a wrapper and
move the child inside it; ask about transforms as well as opacity.

**A band that replaces `--text` leaks into the cards inside it.** The banner
hero sets light text so its own words read over a photograph, and the white card
in the first screen inherited it — the price of a first visit printed near-white
on near-white. `themeCss()` publishes the palette a second time as `--ink`,
which no band shadows, and a card inside the band asks for that back. It caught
`.tile` too, the day `.tile` was added — so the rule names both classes, and the
next surface class will have to be added to it.

---

## 8. How to keep this page honest

Update it in the same commit as the work. When something here is finished, move
it into the plan document with the numbers from the run that finished it — and
if a number cannot be produced from a run, write down that it was not measured
rather than a number that sounds right.

The rule this estate learned the hard way: **a number typed from memory was
wrong in `STATUS.md`, was believed, and was repeated to the owner.**
