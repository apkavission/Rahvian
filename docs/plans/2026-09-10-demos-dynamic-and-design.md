# The six demos: everything editable, and a design worth selling

**Started 2026-09-10.** The owner's instruction, in his words: the demos are what
gets shown and what sells, so every one of them needs its own design and layout
— *"crm alag h, real state alag h, ecommerce alag h"* — and the panel must let
the website's name and logo be changed. Nothing about a demo should be typed
into the code.

Nothing in this plan leaves this machine. No file is published anywhere, no
memory service is written to, and no new SQL has to be pasted into Supabase.

---

## 1. What is already dynamic, and what is not

Read from the code on 2026-09-10, not from memory.

| Thing | Stored in | Editable in the panel? |
|---|---|---|
| Logo, light and dark | `variants.logo_light_id` / `_dark_id` | **Yes** — Brand |
| Share card | `variants.og_image_id` | **Yes** — Brand |
| "The logo already says the name" | `variants.logo_shows_name` | **Yes** — Brand |
| Search title and sentence | `variants.meta_title` / `_description` | **Yes** — Brand |
| Services, staff, reviews, questions, menu, pages, pictures | own tables | **Yes** |
| Who may see the demo | `variants.visibility` | **Yes** — Businesses |
| **Business name** | `variants.business_name` | **No** |
| **Internal name, industry label** | `variants.name`, `industry_label` | **No** |
| **Tagline, description** | `variants.tagline`, `description` | **No** |
| **Phone, WhatsApp, email, address, hours, map** | `variants.contact` (jsonb) | **No** |
| **Both palettes — seven colours each** | `variants.theme` (jsonb) | **No** |
| **Corner radius** | `variants.theme.radius` | **No** |
| **Heading and body typeface** | `variants.theme.headingFont` / `bodyFont` | **No — and not applied at all** |
| **Light or dark by default, and whether the toggle shows** | `variants.default_mode`, `allow_mode_toggle` | **No** |
| **Labels and industry toggles** | `variants.features` (jsonb) | **No** |

**Every row of the bottom half already has a column.** The schema was written
for all of it; what is missing is a screen and a server action. So this needs no
migration, and the owner has nothing to paste into Supabase for it.

**One of them is worse than not editable.** `theme.headingFont` and
`theme.bodyFont` are stored, validated by `readTheme()`, covered by a unit test
— and never reach the page. `layout.tsx` hardcodes Inter and Sora, and
`themeCss()` emits no font variable. A value can be saved and change nothing,
which is the kind of dynamic that is worse than static.

---

## 2. Phase A — the Website screen

One new super-admin screen per demo, at `/admin/website`, with the existing
Brand editor folded into it as one of its sections, and `/admin/branding`
redirecting there so nothing that links to it breaks.

| Section | Fields |
|---|---|
| **Identity** | Business name · internal name · industry label · tagline · description |
| **Logo & search** | The existing Brand editor, unchanged |
| **Colours** | Both palettes, seven colours each, with a live preview of a card, a button and a band in both modes at once |
| **Type & shape** | Heading and body typeface from a fixed pairing list · corner radius · default mode · whether the toggle shows |
| **Contact** | Phone · WhatsApp · email · address · map query · weekday, Saturday and Sunday hours |
| **Words & toggles** | The booking button's label, and each demo's own feature switches |

**Why a fixed list of typefaces rather than a text field.** `next/font` self-hosts
at build time from a static call, so a font named in a database row cannot be
fetched — a free text field would accept "Fraunces" and silently render Inter,
which is the same failure as the two dead columns above. The pairs are declared
in `src/lib/fonts.ts`, loaded in the root layout, and the row stores a key. An
unknown key falls back to the default pair, so a hand-edited row is a plain
site rather than a broken one.

**Colours get a preview, and it is not decoration.** The commonest way a
palette goes wrong is a value only ever checked in one mode — §5 of STATUS.md
records it happening to the estate's own applications for a fortnight. Both
modes side by side, updating as the input changes, is what makes that visible
before it is saved.

**Super admin only**, like Brand and Businesses: a name and a palette decide
what every future prospect sees, not what this week's content says.

---

## 3. Phase B — six designs, not one

Each demo gets its own layout and character. Shared plumbing — the theme
variables, the loader, the panel shell — stays in step; the public pages do not.

| Demo | The character it should have |
|---|---|
| **Clinic** | Calm and trustworthy. Reassurance before persuasion: hours, location and a phone number reachable without scrolling |
| **Restaurant** | Appetite. Big type, warm dark ground, the menu as the hero rather than a page behind a link |
| **School** | Institutional and proud. Dates, results, notices; a parent's questions answered in order |
| **Real estate** | The listing is the product. Photograph-led cards, price and area in the first glance, a filter that works |
| **CRM** | A product site, not a business site. What it does, a screenshot-shaped device frame, pricing tiers, integrations |
| **Store** | Commercial. Grid density, price and stock, offer strip, a basket that is always visible |

Each one keeps: seven colour variables from the row, both modes, the 62ch
measure, the reduced-motion rule, and a real empty state for every band whose
table is empty — no stock photograph of a smiling stranger.

---

## 4. Order of work

Per demo, in this order, one demo finished before the next is started:

1. `/admin/website`, its actions and its validation
2. Fonts wired from the row to the page
3. The public redesign
4. `npm run typecheck`, `npm run lint`, `npm test`, `npx playwright test`
5. The numbers written down here, from the run rather than from memory

Clinic first, then restaurant, school, real estate, CRM, store.

---

## 5. Where each demo stands

| Demo | Website screen | Fonts wired | Redesign | Checks, from a run |
|---|---|---|---|---|
| Clinic | **done** | **done** | **done** | typecheck · lint · **178 unit** · build · **60 browser** · **13/13** website · **9/9** copy · **11/11** motion · **10/10** hero |
| Restaurant | **done** | **done** | — | typecheck · lint · **143 unit** · build · **13/13 browser** |
| School | **done** | **done** | — | typecheck · lint · **143 unit** · build · **13/13 browser** |
| Real estate | **done** | **done** | — | typecheck · lint · **143 unit** · build · **13/13 browser** |
| CRM | **done** | **done** | — | typecheck · lint · **143 unit** · build · **13/13 browser** |
| Store | **done** | **done** | — | typecheck · lint · **164 unit** · build · **13/13 browser** |

Filled in from a run, never from intent. Six demos, 78 browser checks, and every
one of them left its demo on the theme it was found with — which the last check
of each run asserts by reading the row back.

**Ported by `services/scripts/port-website-screen.mjs`**, because these six are
forks: `globals.css`, `theme.ts`, `page-editor.tsx`, `branding.ts` and
`form-state.ts` are byte-identical across all six by design, so the screen is
one file copied five times and four things localised — the port, the reserved
route names, the label on the main button, and which feature toggles the demo
actually reads.

**Only the clinic gets the emergency tick box.** Four demos read
`features.bookingLabel` and nothing else; the shop reads no toggles at all, so
it has no section for them. A field that writes a key nothing renders is what
this whole piece of work set out to remove, so the port removes it rather than
copying it.

**The shop's contact is not the others'.** Its `contact.hours` is a single
string, printed whole by its footer and its contact page, and it has no
`mapQuery` column. Three hour boxes and a map field were ported into it and
then taken out: they would have written a shape nothing in that application
reads.

---

## 6. What the clinic found, which was not in the plan

Three defects, none of which any existing check could see.

| | What it was |
|---|---|
| **`dark:` had no connection to the theme toggle** | Tailwind's `dark:` is `prefers-color-scheme` and nothing else. These sites also decide light or dark with `data-theme` on the root, written by the header's toggle. So every `dark:` class answered a different question from every CSS variable beside it: on a machine set to light, a visitor who pressed the toggle got **the dark palette and the light logo** — a light-ink mark on a near-black header. `site-logo.tsx` swaps the two files with `dark:hidden` / `dark:block` and its own comment says a toggle "cannot show the wrong one". It could. Fixed with a `@custom-variant dark` that mirrors exactly what `themeCss()` does, and `check:website` now proves it in a browser set to light |
| **Two font columns that reached nothing** | `theme.headingFont` and `bodyFont` were validated by `readTheme()`, covered by a unit test, and never applied: `layout.tsx` named Inter and Sora in code and `themeCss()` emitted no font variable. A row could say `Fraunces`, save cleanly and render in Sora. `next/font` builds a face at compile time from a literal call, so the fix is a list — `lib/fonts.ts` — and the row stores a key into it |
| **The clinic's production build was broken** | `page-editor.tsx` imported `RESERVED_SLUGS`, a value, out of `lib/pages.ts`, which imports `server-only`. `next dev`, `tsc --noEmit` and `eslint` all pass; only `npm run build` fails. STATUS.md claimed typecheck and lint for the six demos on 2026-09-03 and did not claim a build, which is exactly the gap it fell through. The constant now lives in `lib/reserved-slugs.ts` |

**And one check that lied.** The first `check:website` read the palette off `/expired`
and reported a working feature as broken: every demo is link-only and the owner
is not exempt, so the site opens only through a share link. It mints one for an
hour and deletes it. That is the third time in this estate that a check has
called correct behaviour a failure.

**And then a fourth, which cost something.** The port wrote each demo's schema
into its copy of the check from the folder name — `demo_restaurant`,
`demo_realestate` — and neither exists. The real names are `demo_resto` and
`demo_estate`. A service client connects happily to a schema with no tables in
it, so the link could not be minted, the site answered with the expired screen,
and the run reported *"the site opens through its share link: FAIL"* and *"the
row could not be written back"* — two working features called broken, **and the
restaurant demo left on a colour nobody chose**, because the restore was the
thing that failed. It was put back by hand from what the run had printed before
it changed anything.

The fix is not a corrected string. `check-website.mjs` now reads `DB_SCHEMA`
out of `src/lib/supabase/constants.ts` — whose own comment says it is the value
a fork gets wrong — and **exits before writing anything** if that schema cannot
be read. A check that mutates has to be able to put things back, so failing to
read is now the one failure that stops the run instead of being recorded and
carried past.

---

## 7. The company's name, 2026-09-11

Not part of this plan when it was written, and it arrived in the middle of it:

> apne company ka naam jo h RAHVIAN TECHNOLOGIES PRIVATE LIMITED ye mila h to
> ye use karna h … apka saathi wala hata dena … sab project me dekh lena

**`Rahvian` → `Rahvian`**, legal name **Rahvian Technologies Private
Limited**, the loader's two halves **RAHVIAN + TECHNOLOGIES**, and the tagline
kept. 100 files and 191 occurrences across the nine projects; 22 rows in the
live database, by `scripts/rename-to-rahvian.mjs`. The **Rahvian product is
removed** — its page, its promo band, both menu entries, its portfolio piece,
its seed data and its route.

Three things were left alone on purpose. One `leads` row still names the old
company, because the consent text stored with an enquiry records what that
person agreed to under the name the company had at the time — a record, not a
label. The two applied migrations that carry the old name are a record of what
ran, so the new name is in a new migration instead, which changes only the
column defaults a fresh install would read. And the logo: the mark is a letter
**A**, for Apka, and the name inside it is vector outline rather than text, so
it cannot be renamed at all. The owner is supplying a new one.

---

## 6. The clinic, done first and properly

The owner's instruction, after the port: *"pahle ek demo ka to sahi se karo sab
kuch"* — one demo, all of it, before the next. And then the standard it has to
meet: *"best design, layout and theme and full dynamic chaiye, har ek chej kuch
bhi static mat karna"*.

### Two bugs found by photographing the pages, which no test does

**The clinic rendered no content at all, on every business.** Every query in
`lib/variants.ts` carried the three named joins that read the logo columns —
`light:media!variants_logo_light_id_fkey` and its siblings — because they were
pasted onto all eight `.select()` calls when the logo feature was built on
2026-09-03. Those foreign keys are on `variants` alone, so PostgREST answered
five of those queries with

    Could not find a relationship between 'services' and 'media'

and each function fell back to its empty array. The site showed its empty
states while 18 services, 9 doctors, 18 reviews and 30 questions sat in the
database. Typecheck, lint, 143 unit tests and 59 browser tests were all green
through it.

**Every review and question was duplicated.** Both content migrations had been
applied twice, so the page asked "Will it hurt?" and answered it, twice in a
row, and showed six reviews that were three reviews. `testimonials` went 18 → 9
rows and `faqs` 30 → 15, keeping the earliest copy of each.

### The home page, rebuilt around what somebody is actually asking

A layout is a sequence of answers. The old page opened with a headline and a
panel of three facts, then five bands of cards; the questions band alone was
five questions and five answers stacked open, and the page measured **7,900
pixels on a phone**.

| | |
|---|---|
| **The first screen answers five questions** | Can I be seen · what will it cost · who will I see · where is it · can I ring now. The first visit's price, the hours as a table, the address with a Maps link, and the telephone as a button beside Book — because a clinic's most-used action is a call, from a phone, by somebody in discomfort |
| **A reassurance strip** | Four promises under the fold, each one a claim the business makes about itself — so each one is editable, and taking all four off removes the strip |
| **Monograms, not avatar placeholders** | There are no photographs anywhere in this estate, and a grey silhouette says "missing image" in a way that initials in the brand colour do not |
| **The questions are an accordion** | `<details>`, no JavaScript: keyboard-operable, announced correctly, working before hydration. The page is now **3,987 pixels** on a desktop and a fraction of 7,900 on a phone |
| **A pinned action bar on phones** | Call and Book, and it reserves the height it covers so it never sits on the footer's legal line |

### And nothing on it is written into the code

`variants.copy` (jsonb, one migration, applied through a direct connection
rather than pasted — see §5 on what the SQL editor does to an apostrophe) holds
five headings, five sentences and the promises. `lib/copy.ts` supplies a
default for every slot, so **an empty column is a finished page**, and the panel
shows those defaults as placeholders — which is how somebody learns what a field
is for without being handed an empty screen.

The promises are **replaced, not merged**: a clinic that deletes "sterilisation
you can watch" must not have it filled back in from the defaults, because that
would put a claim on the page somebody deliberately took off it. An empty list
is honoured as empty; only an absent value falls back.

### Measured, from a run

| | |
|---|---|
| `npm run typecheck` · `lint` | clean |
| `npm test` | **154** unit tests, including 11 on the copy reader |
| `npx playwright test` | **61** browser tests |
| `npm run build` | clean |
| `npm run check:website` | **13 of 13** — a preset writes fourteen colours, the theme saves, the site's accent matches, the typeface reaches the page, `dark:` follows an explicit choice, and the demo is left on the theme it was found with |
| `npm run check:copy` | **8 of 8** — a heading and a promise typed into the panel appear on the public page, the band they replaced is gone, and the column is restored byte-for-byte |
| Pictures | `docs/screens/` — seven routes, light and dark, plus a phone |

### Still static in the clinic, said plainly

**The six inner pages still carry their own headings in code** — `/services`
opens with "What we do" and a paragraph about pricing, and `/doctors`,
`/reviews`, `/questions`, `/contact` and `/book` do the same. Only the home page
reads its words from the business.

**The structural labels are also literals**, deliberately: "Your first visit",
"Opening hours", "Where to come", "Experience". Those are furniture — they name
the layout rather than say anything about the business — and making all forty
editable would be a panel nobody finishes filling in. Worth a decision rather
than an assumption.

---

## 7. Motion, and the last of the static words

### The animation, and the one way it breaks a page

Two kinds, because they are not the same thing. An **entrance** runs once on
load and belongs to the first screen, which is already in front of somebody. A
**reveal** runs as a band scrolls up and belongs to everything below the fold.
Using an entrance for both is what produces a page whose fourth band animated
three seconds before the reader reached it.

**No JavaScript and no observer.** The reveals are scroll-driven CSS —
`animation-timeline: view()` — behind an `@supports`, so a browser that has it
gets the motion and one that does not gets the content, immediately. An
IntersectionObserver would mean a client component per band and a flash of
hidden content before hydration.

**Nothing may leave content invisible**, which is the only way animation
actually breaks a page: a reveal that starts at `opacity: 0` and waits for
something that never comes is not "looks wrong", it is "the section is not
there", and it fails worst for the people most likely to be on an older browser
or asking for reduced motion. `check:motion` asks the question in four states —
loaded, scrolled, reduced-motion, and with scroll animation switched off
entirely — and **9 of 9** pass.

### Two things the checks found, and both were mine

**A band at the fold was drawn at a tenth of its opacity.** The first range was
`cover 12% cover 42%`, measured against the whole scrollport, so a strip sitting
at the bottom edge of the first screen was mid-reveal before anybody had
scrolled: a page that looked half-painted on arrival. Ranges now run on `entry`
and finish by 30%, and the strip under the hero was moved into the load
sequence, where it belongs.

**A whole section is the wrong unit to animate.** `.reveal` was on five
`<section>` elements, each about a thousand pixels tall, so a heading was faded
while the reader was looking straight at it. It is on the heading blocks now —
about a hundred pixels, done before they are read.

And once, the check was wrong rather than the page: it asked about every
animated element and called six service cards four screens down a failure for
waiting. It now asks the question a reader would — *is anything I can see
invisible?* — measured on visible height, not mere intersection.

### The six inner pages

`/services`, `/doctors`, `/reviews`, `/questions`, `/contact` and `/book` each
carried their own title and opening line as literals. They read
`copy.pages.<page>` now, defaulted **word for word off the pages as they were
written**, so turning it on changed nothing anybody could see.

They are deliberately **separate slots from the home page's bands**: the home
page says "What we do" over six cards and a link to the rest, while `/services`
*is* the rest and opens by explaining how the prices work. A business that wants
them identical can type them identical; one that does not would otherwise have
no way to differ. Each page defaults on its own, so renaming one does not blank
the other five — which is what a single merged object would have done.

The panel's tab is now **Words on the site**: five bands, six pages, and the
promises with their icon pickers. `check:copy` types into three of them and
finds all three on the public site, including an inner page, then restores the
column byte-for-byte.

### What is still a literal, and why

The structural labels — "Your first visit", "Opening hours", "Where to come",
"Experience", "You will see", "Treatments". They name the layout rather than say
anything about the business, and making all forty editable would be a panel
nobody finishes filling in. Worth a decision rather than an assumption.

---

## 8. The banner hero, and the scroll trigger

### The animation now waits, which is what was asked for

*"animation scroll pe lago na, warna wo pahle hi ho jata h."* He was right, and
the mechanism was wrong. `animation-timeline: view()` ties an animation's
**progress** to the scroll position, which gives two failures and no setting
that avoids both: a short range finishes while the band is still arriving, so
the movement is over before the reader gets there; a long range draws a band
that is half in view at half its opacity, so a page nobody has scrolled looks
half-painted.

What was wanted is a **trigger**. One `IntersectionObserver`, inline in
`[variant]/layout.tsx` so the class it needs is added before first paint, and a
CSS transition rather than an animation — a transition cannot be left stuck
half-way, and it answers to the reduced-motion rule already in the stylesheet.

`check:motion` asks the question directly now: **the last band on the page is
at opacity 0 before anybody scrolls, and 1 after** — 11 of 11.

### Three bugs, all mine, all found by looking

**The observer revealed everything at once.** It measured each band by hand —
`getBoundingClientRect().top` against the viewport height — and ran on
`DOMContentLoaded`, before the stylesheet had been applied. Every element
measured as though it were at the top of the page, including one 3,233 pixels
down a 3,987-pixel page. The hand measurement is gone: an observer measures
after layout and cannot make that mistake.

**Every screenshot came out blank below the hero.** The camera walked the page
with `for (let y = 0; y < document.body.scrollHeight; y += step)` — and
`scrollHeight` read before the webfonts arrive is roughly `innerHeight`, so the
loop ran once and exited. It took a bisect to find, because it was flaky: with
enough delay before it, the same code worked. Both the camera and
`check:motion` now wait for two consecutive equal heights and then walk until
they are actually at the bottom.

**`check:copy` failed on a feature that was working.** It read the body text the
instant the page loaded, which is a page nobody has scrolled — so the band it
had just edited was not there to find. It walks the page first now, the way a
reader does.

### The banner

`variants.hero_image_id` and `hero_video_url`, one migration, applied through a
direct connection. Three states: a **video** if the business has one, a
**banner** if it has a picture, and — the ordinary case, because every `media`
table in this estate is empty — a **wash built from that business's own seven
colours**. Not a placeholder: a finished hero that a palette change restyles,
and the day a banner is uploaded it appears with nothing deployed.

No stock photography. A smiling stranger in a waiting room is what makes a demo
look like every other template, and it is the one thing a business cannot keep
when the site becomes theirs.

**The scrim is load-bearing.** Contrast over a photograph cannot be measured in
advance — the words are one colour and the banner is whatever was uploaded — so
a gradient scrim is what lets the headline be promised readable over a bright
waiting room and a dark one. `overlay: "none"` is the one setting that can
produce an unreadable hero, and the panel says so beside it.

**And it leaked once.** The band replaces `--text` and `--muted` with light
values so its own words read over the picture, and the white card inside the
first screen inherited them: the price of a first visit printed near-white on
near-white, in the one place a prospect looks first. The palette is now also
published as `--ink` — the same colours under a name no band shadows — and a
card inside the band asks for them back. `theme.test.ts` asserts it.

`check:hero` is what proves the state nothing else exercises: it makes a
banner from the business's own palette, puts it on, checks the layer covers,
the scrim is drawn, the headline is light ink, the band is tall enough to read
as a banner, and that "strong and centred" is what the panel chose — then
deletes the file, the media row and the column, and asserts the business was
left as it was found. **10 of 10.**

---

## 9. The banner, the demo panels, and search

### The demo panels were never broken

*"mene ek link banaya kisi demo ka to us demo ka admin chalna chaiye."* It
does. One sign-in opened the clinic's panel and the restaurant's, including
`/admin/website` and `/admin/links` — checked in a browser, not assumed. Two
things were true at once and only one of them was a fault:

**The dev servers were stopped.** All of them but the clinic's, by me, when the
machine had 53 node processes on it and every command was timing out. A panel on
a port with nothing listening does not open, and that is the whole of what was
happening.

**And the estate screen offered no way in.** It is the screen that decides who
may open a demo, it already knows every demo's address from
`control.applications.base_url`, and it linked only to the public site. It now
offers both doors per business — the site and its panel — which is what was
actually missing.

Worth knowing rather than discovering: **the panel is not behind the share
link.** A link admits a visitor to one business's public pages; the panel
answers to the account, so it opens for a colleague with that demo in their
access list and nobody else. The owner's account has all six keys. On
`localhost` one sign-in serves every demo because cookies ignore the port; on
separate domains each demo needs its own.

### A banner that is made, not bought

`npm run make:hero` draws one from the business's own seven colours and puts it
on: shaded balls, a ring seen at an angle, a vignette, and two per cent of grain
because a gradient with none in it bands visibly on an eight-bit screen.

"3D" is honest about itself — there is no scene and no renderer. These are
circles shaded the way a sphere is shaded: a radial gradient offset toward one
light, a terminator opposite it, a rim where the light wraps the edge, and a
contact shadow beneath. Drop any one and it reads as a circle.

**"Fits every screen" is a composition rule, not a size.** The band crops with
`object-fit: cover`, so every form sits inside the middle 70% — a 9:16 crop
still contains all of them — and the left third is left calm, because that is
where the headline sits and detail under type is what makes a hero unreadable.
Measured at 390, 768, 1280 and 1920: no sideways scroll, the headline inside the
band at every width.

### Search, and the two things it refuses to say

The meta title, description, share card and `robots.txt` were already here and
already editable. What was missing was structured data — the block an SEO person
looks for. `lib/seo.ts` emits one graph: the clinic, its six treatments with
prices, the five questions it answers, the three people who work there. Every
field derived from a row.

**No `aggregateRating`.** The reviews on these demos are labelled, on the page,
as examples written for a demonstration. Turning three invented quotes into
"4.7 from 3 reviews" would put a fabricated trust signal into a search result —
the commonest piece of structured-data fraud, and one Google issues manual
penalties for.

**No `openingHoursSpecification`.** The hours are free text somebody typed —
"9:30 am – 8:00 pm", "Emergencies only". Parsing that into machine times means
guessing, and a wrong closing time in structured data sends somebody to a locked
door. The hours are on the page, in words, where they are true.

**And it stays `noindex`**, which is not a contradiction. A demo that outranked
the business it was built for would take months to undo. This is what a real
site inherits the day one of these becomes it — same panel, same fields, same
block, one line removed — and what a prospect's own SEO person is shown when
they ask what we do about search.

Read off the live page: `MedicalClinic, FAQPage, ItemList` · price range
₹300 – ₹35,000 · 6 offers · 5 questions · 3 people · no rating · no machine
hours · still `noindex`.
