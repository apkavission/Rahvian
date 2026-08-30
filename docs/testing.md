# Testing — what exists, and what has never been checked

**Last updated: 2026-08-28.**

This file exists because "verified" was being used to mean two different things.
`tsc`, `npm run build` and a route returning 307 prove the code compiles and the
guard is wired. They prove nothing about whether a button does what its label
says. Both are written down here, separately, so neither gets mistaken for the
other.

**How this file is used — the owner's decision, 2026-08-28.** The click-through
list is **written as each screen is built and run in one pass at the end**, not
screen by screen as they land. So every entry below is added the day the code is
written, while what needs checking is still fresh, and none of it is ticked off
until the build is finished. What that means in practice:

- Nothing here is a to-do that is overdue. It is a script waiting for its run.
- Every new screen adds a row to "What has never been checked" the same day.
- When the build is done, this file is the test plan. Working down it once is
  the pass.
- Until then, `PROGRESS.md` says "not yet opened in a browser" for anything that
  has not been, in those words.

---

## What runs today

| Command | What it actually checks |
|---|---|
| `npm run typecheck` | Types. Nothing about behaviour. |
| `npm run lint` | ESLint. **Clean since 2026-08-28** — it reported 11 problems in 7 files for weeks, and all of them are fixed or exempted with a stated reason. |
| `npm run build` | Every route compiles and every prerendered page renders against the live database. |
| `npm test` | Vitest. **224 tests, thirteen files.** |
| `npm run check:weight` | Page weight against a **production** build — 225 KB of JavaScript over the wire on every public page today, budgets 350 KB and 700 KB. Needs `npm run build && npm run start` first; it is not part of the e2e suite because that runs against `next dev`, where the numbers are about the dev server. |
| `npm run test:e2e` | Playwright, in a real Chromium. **205 tests, eight spec files** — the public site, the responsive rule at six widths, the guard on every admin address, the SEO layer, and **all sixteen admin screens signed in**. About two minutes. **No skipped tests** since 2026-08-28, when the soft 404 was fixed and its test became a real assertion. |

### The thirteen test files

| File | What it pins |
|---|---|
| `src/lib/media/image-file.test.ts` | The image header parser, against bytes assembled in the test plus the four committed brand SVGs and the apple touch icon read off disk. Everything in [image-rules.md](image-rules.md) is measured against what it returns. |
| `src/lib/media/image-fields.test.ts` | The declared sizes and the no-upscale rule, including the two shape-free gallery fields — where a portrait file must be accepted without a warning, and the same file in a framed field must still get one. |
| `src/lib/media/gallery.test.ts` | The gallery document both galleries store. Above all the round trip: what the form writes has to be what the page reads, or a picture is saved and never appears — a failure that looks exactly like the save having worked. |
| `src/lib/auth/menu.test.ts` | Which screens a role plus a person's two arrays resolve to. |
| `src/lib/records/navigation.test.ts` | The four navigation shape helpers: which rows an arrow swaps, which links may be a parent, that a link with a dropdown is offered none, and that a cleared parent round-trips as absent rather than as the string `"null"`. |
| `src/lib/search/sources.test.ts` | The command palette's descriptors: the address every kind of result opens at, the words on a row, and what is stripped out of a query before it is put into a PostgREST `or` filter. |
| `src/lib/media/usage.test.ts` | What the media delete dialog says a file is used as. The coverage half compares the hand-written list against every `references company.media(id)` in the migrations — and found seven missing, including the favicon. |
| `src/lib/media/filename.test.ts` | The name an upload is stored under: that a path, a query string or a fragment cannot survive into a bucket key, and that the extension comes from the bytes rather than from what the file was called. |
| `src/lib/records/schemas.test.ts` | The rules a form refuses on — the pricing cross-field rule that mirrors a check constraint, the slug expression asserted literally against the database's own, and the two link patterns that catch a scheme-less address resolving as a relative link. |
| `src/lib/records/mappers.test.ts` | The four content mappers both ways — pricing, FAQs, team, media. A round trip, plus a coverage check that every column in the generated types is either written or named as deliberately not editable. The second is what catches a column added by a migration that no form has ever offered. |
| `src/lib/backup/tables.test.ts` | That the backup's table list covers every table in the generated database types — the failure it guards is a table added by a migration that **silently stops being backed up**, and is only discovered during a restore. |
| `src/lib/backup/retention.test.ts` | Which backups get deleted. The one piece whose failure mode is removing something that should have been kept, and it caught a real off-by-one on its first run: a thirty-day-old backup was being deleted on day thirty rather than day thirty-one. |
| `src/lib/validation/seo.test.ts` | The SEO schema, the title template and the Organization override parser. Three of these rules guard failures that are silent by nature: a template with no `%s` is ignored rather than refused, a pasted `<meta>` tag verifies nothing and says nothing, and an override that is an array spreads into numeric keys and describes no company at all. |

All thirteen are pure functions. What they have in common is that each decides
something a person cannot check by looking — a menu that reorders the wrong row
does not look broken, it looks like the button did nothing.

`vitest.config.ts` was added with the first of them. Before that the `npm test`
script existed with no config behind it, so it collected nothing and reported
success.

### The browser harness — added 2026-08-28

`npm run test:e2e`. It starts the dev server if one is not running, walks the
public site in Chromium, and reports. **No password, no account, no database
write**, which is why it runs on any machine that can run the site — and why it
exists at all: this is the half of the click-through list a machine can do,
separated out so the half that needs a person stays short.

| Spec | Tests | What it pins |
|---|---|---|
| `e2e/public-pages.spec.ts` | 25 | Every public route answers 200, has **exactly one** `<h1>`, and carries a title and a description. Plus a real 404 for a missing address, and every raster image on the home page declaring its width and height |
| `e2e/responsive.spec.ts` | 81 | **Nothing scrolls sideways** on any public page at 360, 390, 768, 1024, 1280 or 1440 — twelve pages by six widths, the automatable half of [responsive-rules.md](responsive-rules.md). Plus the mobile menu opening, navigating and closing behind it |
| `e2e/admin-guard.spec.ts` | 24 | All 21 admin addresses turn into the login screen when signed out, carrying where they were going. Plus the panel being `noindex` whatever the site-wide switch says |
| `e2e/theme.spec.ts` | 5 | The theme control: three modes, a choice applying to the document, surviving a navigation and a reload, system mode following the OS live, and the login screen outside the admin shell carrying a theme too. Written before the provider was refactored, so the refactor had something to answer to. |
| `e2e/contrast.spec.ts` | 27 | Every public page in **both themes**, every element that paints text held to WCAG AA — plus the focus ring, which text contrast checks never covered. The only spec that visits the dark theme at all. |
| `e2e/accessibility.spec.ts` | 16 | The half of accessibility a machine can check: `lang`, one `main`, `alt` on every image, no positive `tabindex`, heading levels that never skip — on every public page. Plus the quote form's labels, the skip link actually moving focus, and the FAQ accordion driven from the keyboard. No new dependency: Playwright's own accessibility queries, not axe. |
| `e2e/seo.spec.ts` | 6 | robots.txt, the sitemap and the meta tags **agreeing with each other**, in whichever state the crawl switch is in. Plus absolute canonicals, exactly one Organization graph, and a social card that is a real image |

**What it deliberately does not do** is assert the words on a page. Every page
is assembled from rows the owner is about to fill in, and a suite that has to be
edited each time a sentence is reworded is a suite that gets deleted. It also
cannot tell whether a picture is cropped — that stays on the list below, with a
deliberately small file, because it is only visible to a person.

**It has found two real bugs so far**, which is the argument for having it: a
soft 404 on every made-up record address, and a **mobile menu that did nothing
on any scrolled page** — on every page of the site, on every phone. The second
is fixed, with two regression guards at 390px. The first needs a decision and is
[pre-production-cleanup.md](pre-production-cleanup.md) §1.1.

**One thing in it is not understood, and is recorded rather than hidden.**
Playwright's synthetic pointer click on a link inside the mobile panel hangs.
The same link navigates correctly from the keyboard and from script — panel
closes, URL changes, no errors — so it is not the menu, but nobody has explained
it. The navigation test uses the keyboard, which also covers a path nothing else
checked. **Tapping that menu on a real phone is on the click-through list
below**, and it is the one item there that could turn into a real defect.

**The first run failed seventeen tests, and none of them was a bug in the
site.** The Next dev server compiles a route the first time it is asked for,
and a browser arriving during that compile is handed a document while it is
still streaming — so an assertion about a `<meta>` tag timed out on pages that
were correct seconds later. Every one of them passed against a warm server. The
fix is `e2e/global-setup.ts`: every route is fetched once, sequentially, before
any browser opens. **A flaky suite is worse than no suite** — its green means
nothing and its red gets ignored — so this was worth fixing properly rather
than by raising a timeout.

Full notes, including what to add the day the test account's password arrives:
[e2e/README.md](../e2e/README.md).

### Verified by hand, once

- **R2 round trip**, 2026-08-27 — a real PNG put, read back byte-for-byte
  identical with its content type and cache header intact, deleted, confirmed
  gone. Run directly against the SDK with the credentials from `.env.local`, so
  it proves the bucket and the keys. It did **not** go through
  `src/lib/storage/r2.ts` or the upload action.
- **Public pages after the card extraction**, 2026-08-27 — `/pricing` still
  renders all six plans with their figures, `/about` still omits the team
  section while `team_members` is empty.
- **The staff guard** — all six new admin routes return 307 to `/admin/login`
  when signed out.

---

## The click-through — done 2026-08-28

**Worked down by hand, in a real browser, signed in as the owner, screen by
screen.** This is the pass the standing rule books for after the build is
declared complete, and it is the first time it has been run.

**A backup was taken first.** `npm run db:backup` — because this pass writes,
and there is one database and no staging copy. Everything created was a
throwaway named `ZZ …`, and every screen was left in the state it started in:
navigation back to 28 seeded links, pricing back to 6 plans, FAQs back to 14
questions, team back to 0, media back to the 4 brand files, portfolio empty.
Checked, not assumed.

### What it found

Three defects, all fixed the same day, and all of them things no automated
check was ever going to notice:

| # | What | Fixed |
|---|---|---|
| 1 | **A refused save wiped what you had typed.** Paste a whole `<meta>` tag into a verification field and the SEO form refuses it correctly — and empties the field, so the message tells you to fix something you can no longer see. The title and description survived because they were controlled for the live preview; one form behaving two ways | All fields controlled |
| 2 | **The navigation preview promised something impossible.** Its copy said "hover a link with a dropdown to open it". The pane is ~450px wide and the header swaps to its phone form below 1024px, so there is no dropdown in there to hover at either pane width | Copy says what the pane shows, and points at the real site |
| 3 | **Renaming a file went through no sanitiser at all.** `../evil.png`, `a/b/c.png` and `no-extension` were all accepted, stored, and put into the served address. `safeFilename` existed and was applied on upload only, so the two paths into one column disagreed about what a name may be | `renamedFilename`, with the extension taken from the stored row — a rename may change what a file is called, never what it claims to be |

Nothing escaped anywhere in #3 — the bucket key is built from the id and a URL
percent-encodes a slash — but a file could lose its extension entirely, and the
sanitiser exists *because* the name is part of a URL.

### What it confirmed

Everything else on the list below behaved. The ones worth naming because they
are hard to get right:

- **The crawl switch.** Warns beside the save button, asks in a dialog, and
  cancelling changes nothing. Flipped for real: `robots.txt` began allowing and
  naming the sitemap, the sitemap filled, and it was put back.
- **The navigation tree.** Arrows move a nested link only among its siblings; a
  link that already has a dropdown is offered no parent at all; moving a parent
  to another menu carried its children; the delete dialog counted them —
  "the 2 links nested under it" — before removing all three.
- **The pricing rule.** Publishing with no price and no custom-quote switch is
  refused against the price field. A duplicate does not carry the highlight.
- **A duplicate team member** carries no LinkedIn and no GitHub.
- **The media screen.** Dimensions read before anything is sent; a 200px file
  flagged; an 8.7MB file refused; alt text required; the file served back
  through the app as `image/png`; and the delete dialog naming the usage —
  *"It is currently the light logo"* — with cancel leaving it untouched.
- **The gallery repeater.** A row with no picture is refused against that row.
  A 1400 × 2400 portrait is accepted with **"1400 × 2400 — wide enough."** and
  no shape warning, which is the `shapeFree` rule doing exactly what it was
  built for. The stored shape is `[{ media_id }]` with no caption key when none
  was typed.

### Still not done by a person

- **A real phone.** Everything above was a desktop browser at various widths.
- **A screen reader.** Unchanged, and still the thing only ears can answer.
- **A non-owner account**, to confirm the command palette returns nothing from
  a screen that person cannot reach. It needs a second account that does not
  exist yet.

### One thing seen and not explained

After saving a gallery, the public page did not show it on the first load,
while the database row plainly held the picture. It was not isolated — the page
may simply have been serving a cached render from before the save — and by the
time it was noticed the throwaway project had been deleted. **Worth re-checking
during the launch pass, with real content**, which is where a stale-cache
problem would actually matter.

---

## Every screen, watched — done 2026-08-28

A second pass, asked for in these words: *"aaram se check karo ek ek karke"*.

The first attempt was the suite run headed, and it was the wrong tool. Playwright
gives every test a fresh context, so **the window opens and shuts once per test**
— 205 times. It passed (204 passed, 1 flaky, exit 0) and it showed the watcher
nothing. A suite is for a machine to read the result of; **watching one is not
the same as looking at the site.**

So: **one window, held open, forty-odd screens, three and a half seconds each.**
Anonymous for the public pages, because a signed-in visitor is not the visitor
being tested; the owner's stored session for the admin. Every screen checked for
the things a per-page assertion does not cover — the status, a single `h1`, a
meta description with something in it, sideways scroll, an image that failed to
decode, images with no `alt` attribute at all, links with no accessible name,
console errors, and any request the page fired that came back 4xx or 5xx.

**Twenty public pages, seventeen admin screens, five addresses that should not
exist — at 1600px and again at 390px. Nothing wrong on any of them.** No broken
image, no empty description, no sideways scroll, no console error, no failed
request, exactly one `h1` each.

### Both problems it reported were the checker's, not the site's

Worth writing down, because both are easy to report as bugs and both would have
been wrong.

**A 404 page is a failed request.** The browser logs `Failed to load resource:
the server responded with a status of 404` for the document itself, and the
checker counted the page's own expected 404 against it. Five missing-page
addresses came back as problems while doing exactly their job. The rule now
excludes the document's own response when that status is the one being asked for.

**`/admin/testimonials` does not exist.** It 404'd because there is no such
screen — testimonials are edited inside a case study, not on their own. The
address came from a hand-typed list, not from `e2e/routes.ts`, which never had
it. **The 404 was the right answer to a question nobody should have asked.**

The lesson is the same one as the theme flash: a check that fails is a claim
about *either* the site or the check, and which one it is has to be established
before it is written down as a defect.

### Still only a machine's look

This pass proves no screen is broken. It does not prove any screen is *good* —
nothing here reads a sentence, judges a layout, or notices that a heading sits
too close to an image. That is still on the list below, and so is a real phone,
a screen reader, and a non-owner account.

---

## Filling the site, and what that found — done 2026-08-28

The owner asked for the site to be filled with real content, entered **through
the admin panel** rather than by a seed script, and then checked on the site at
every size. That is what happened: a real browser, the real forms, the same
validation and the same server actions a person goes through.

**One team profile, two portfolio entries, one case study with four measured
results, four blog posts.** Every one created and published from the screens.

### The point of doing it through the panel

A seed script writes rows. It does not tell you whether the form that is
supposed to produce those rows works. Two things went wrong that a seed script
would have sailed past, and both were mine rather than the panel's:

**A required field's label reads `Name*`.** The asterisk is a span inside the
`<label>`, so it is part of the accessible name and an exact match on the word
alone never matched. Found by printing the labels out of the DOM rather than by
guessing at the selector — the same rule as everywhere else in this file.

**A boolean field's label is the whole sentence.** The switch's label and its
hint live inside one `<label>`, so "Feature this" is a prefix of the accessible
name, not the whole of it. An anchored pattern missed all three switches.

Neither is a defect in the site. Both are worth writing down because they are
how a person automating these forms will fail first.

### What it actually found

**A category archive skipped a heading level.** `/blog/category/[slug]` went
straight from `h1` to `h3` the moment a post was published under it, because the
post card hard-coded `h3` — right on `/blog`, where an `h2` sits above the grid,
and wrong on an archive, where the page heading is the `h1` and nothing sits
between.

**This spec had walked that page on every run for days and passed.** Every
category was empty, so there were no card headings to get wrong. The page's own
source said so, in a comment: *"Every category is empty today."* The failure
appeared within minutes of the first post going in.

Fixed where the mistake was: the card no longer decides its own level, it takes
one. Then heading order was checked on **all twenty-four pages**, the new detail
pages included — every one sound, every one with exactly one `h1`.

And the harness changed so it cannot happen again: `CONTENT_ROUTES` in
`e2e/routes.ts` lists the pages that only exist once something is published, and
both the accessibility spec and the public-pages spec now walk them. **An empty
page is not the page.** A structural check on a page with nothing on it is a
check on a version of the site nobody visits.

**A new menu key 404s for everyone until the roles cache is cleared.** Adding
`testimonials` to the code and to `company.roles` was not enough — the roles
list is read through a tagged cache and the migration changes the table from
underneath it. A dev-server restart did not help either, because that cache is
on disk. Written at the top of the migration now.

### The site, checked with content on it

Every page walked in one browser at 1600px and again at 390px — status, one
`h1`, a meta description, sideways scroll, broken images, missing `alt`, unnamed
links, console errors, failed requests. **Thirty-one pages, both widths, nothing
wrong.**

Then a separate pass on the question that actually matters: **does what was
typed into the panel reach a visitor?** Seventeen assertions — the featured
product on the home page, the profile on About, a feature bullet, a ticked
technology, a measured result, a post body, a tag, a category listing its post.
**Seventeen of seventeen present.**

### Email, sent for real

One enquiry through the public contact form, using only the two addresses the
owner named for testing and no others. The honeypot field was deliberately left
alone.

The lead saved, the row is on the Enquiries screen, and the POST took six
seconds — which is a real SMTP conversation, not a no-op. The mailer logs only
on failure and logged nothing, so both messages left the server: the
notification to the admin address, the acknowledgement to the sender.

**What this does not prove is delivery.** Nothing here can open an inbox. Spam
placement in particular is invisible from this side and stays a launch item —
SPF, DKIM and DMARC are still unset, and they are what decide it.

---

## What has never been checked

### The seven screens, in a browser

Plus one thing that is on every screen rather than being one:

**The command palette**, built 2026-08-28. **Ctrl+K from anywhere**, and the
header trigger, which must print `Ctrl K` on Windows and `⌘ K` on a Mac · type
two letters and watch records arrive under the screens · **type fast** — a word
typed at speed must be one search, and the results must never be the ones for a
shorter prefix · ↑ and ↓ through the whole list including the wrap at both ends
· Enter on a record, which must open that record *selected*, not just its list
screen · Escape, and a click on the backdrop · "View the site", which must open
a new tab and leave the admin where it was · then **sign in as a non-owner with
enquiries taken away and search for a lead by name — nothing may come back**.

| Screen | What to click |
|---|---|
| `/admin/seo` | The banner at the top naming the current state, and its two links · typing in the title and description fields, where the preview and both counts must follow every keystroke · a template with no `%s`, which must be refused with the reason · a whole `<meta>` tag pasted into a verification field, likewise · `[1,2]` in the override box, likewise · **flipping the crawl switch**, which must ask before saving and must say the right thing in each direction · after saving with the site open, `/robots.txt` must allow and name the sitemap, and `/sitemap.xml` must list the pages — then put it back |
| `/admin/navigation` | The menu pills and their counts · **the arrows inside a dropdown** — a nested link must move only among its own siblings and must never swap with the top-level link printed after it · nesting a link under another and back out · moving a parent that has children to another menu, which must carry the children and say how many · the refusal when nesting a link that already has a dropdown · delete on a parent, whose dialog must count what the cascade takes · the preview showing the real header, its dropdown on hover, and the mobile panel at phone width |
| `/admin/pricing` | Create a plan · edit and save · the check-constraint message when publishing with no price and no custom-quote switch · duplicate (highlight must not carry across) · both move arrows · the delete dialog · the preview showing the whole row with drafts marked |
| `/admin/faqs` | The scope pills and their counts · the list filtering · **the bound move action** — arrows must reorder within one page, and the swap must be against what is on screen · create, which should attach to the filtered page · the preview accordion plus the hidden block underneath |
| `/admin/team` | Create · edit and save · duplicate (LinkedIn and GitHub must **not** carry across) · move · the delete dialog · the preview grid with drafts marked |
| `/admin/portfolio` and `/admin/case-studies` | **The gallery repeater**, built 2026-08-28. Add three pictures · reorder them with the row arrows and confirm the public page follows · remove the middle one · save a row with a caption and no picture, which must be refused against that row · a caption typed and then cleared, which must not come back on reload · **a portrait screenshot, which must be accepted with no shape warning** · then delete one of the chosen files from the media library and reload the public page: the picture must drop out of the grid rather than leave a hole |
| **A real phone** | **Tap a link in the mobile menu.** A synthetic pointer click on it hangs in the test harness for reasons nobody has explained, while the keyboard and script paths both work. This is the one item on this list that could be a real defect rather than a check. Also: open the menu after scrolling, which is where it was broken until 2026-08-28 |
| `/admin/media` | **Upload a real file** · the dimension readout before sending · the under-400px warning · the over-8MB refusal · rename and re-save · the folder pills · the delete dialog naming what it will blank · the preview on white and on near-black |

### The image fields and the no-upscale rule

Wired 2026-08-27, none of it seen working:

- **A picker on every one of the eleven fields** — the size printed before
  choosing, the thumbnail drawn at the field's ratio, the warning naming both
  numbers, remove and re-choose.
- **The quality warning in all three places** — upload form, picker, library —
  saying the same thing about the same file.
- **The no-upscale rule, which is the point of the exercise.** Upload something
  deliberately small — 200px wide — put it in a card field, and look at the
  public page. It must render **small and sharp, with space around it**. If it
  fills the frame and looks soft, `components/media/image.tsx` is not doing its
  job and the whole rule is broken.
- **A wrong-shaped file** in a card field: visible space along one edge, and
  nothing cut off.
- **An SVG logo** in the settings fields: it must scale up to fill its space,
  not be capped at its viewBox size. This is the exemption, and it is the one
  most likely to have been got backwards.
- **Both themes** for the library preview's white and near-black stages.

### Accounts, roles and menus

Built 2026-08-27, none of it seen working. Both migrations are applied and the
database types were regenerated from the live schema, so there is nothing left
in the way — this is a browser pass and nothing else.

In this order:

- **The Roles tab first.** The seven seeded roles are there, Owner and Super
  admin outrank the rest, and the system ones say they cannot be deleted.
- **Make a role.** "Content lead": tick *reaches this admin*, tick *sees
  enquiries*, leave *manages accounts* clear, give it the content screens plus
  Enquiries. Save.
- **Make an account** on that role, at `kumarnitish4384@gmail.com` — the only
  address any test ever uses. With SMTP unconfigured the password appears on
  screen once with a warning; **check that it does not appear when the email
  does go out.** Copy it.
- **Sign in as them in a private window.** The sidebar must show exactly what
  the role gives. Then type `/admin/settings` and `/admin/users` by hand: both
  must answer as pages that do not exist, not as a refusal.
- **Adjust one person.** Take Media away from them and give them nothing else.
  Their sidebar loses it; `/admin/media` 404s; the accounts screen's third
  column says *Removed: Media*.
- **The grant that reaches the database.** Enquiries was granted through the
  role here — the harder case is granting `leads` to a plain **editor** on their
  own account. The screen must appear *and list real enquiries*. If it appears
  and is empty, `can_manage_leads()` is not reading `menu_extra` and the whole
  point of the per-person menu is broken.
- **Block them.** They are signed out on their next click, cannot sign in, and
  nothing they wrote has gone. Then let them back in.
- **Reset their password** and check the old one stops working.
- **The refusals.** Try to block yourself, to change your own role, and to take
  *manages accounts* off the only role that has it. All three must be refused
  with a sentence, not a stack trace.
- **`/admin/account`** as that person: it is reachable, it shows what they can
  see, and changing the password works with the current one and is refused
  without it.
- **Both themes and a phone**, for the tabs, the checkbox grid and the
  password-once panel.

### Server paths never exercised at runtime

- `uploadMedia` end to end **through the application**. R2 was proved with the
  SDK directly; the action's own path — header parse, key, row insert, and the
  object cleanup when the insert fails — has not run.
- `/media/[...slug]` serving a real uploaded file: the 200, the cache headers,
  the ETag, the 404 for an unknown id, the 404 for a `public/` row, the 502
  when storage is unreachable.
- `saveMedia` and `deleteMedia`, including the R2 object actually being removed.
- The pricing check-constraint error path (`23514`) and the duplicate-reference
  path (`23505`).
- `faqScopeOptions()` returning a scope that is stored but no longer offered —
  the case that stops a rename silently dropping a question off a page.
- `mediaUsageMap()` against rows that actually reference an asset. The library
  is empty, so it has only ever returned an empty map.

### Responsive and both themes

Required by [responsive-rules.md](responsive-rules.md) and not yet done for any
of the four new screens: **360, 390, 768, 1024, 1280, 1440**, in light and dark.
The three-column layout stacking below `xl`, the folder and scope pill rows
scrolling sideways rather than wrapping, and the media preview's two
backgrounds are the specific things to look at.

### The skeleton layer

Required by [loading-rules.md](loading-rules.md), never seen running:

- Every `loading.tsx` drawing the right shape, with no jump when the real screen
  lands.
- The 120ms delay actually preventing a flash on a fast load.
- The stagger reading as a wave rather than a strobe.
- The sweep being a **highlight** in both themes — this is the one most likely
  to be wrong, because the surface scale inverts between them.
- Reduced motion leaving a still block rather than a frozen half-swept one.
- The preview pane's skeleton behind the frame, and it disappearing on load.

### Accessibility

**The mechanical half is automated since 2026-08-28** — sixteen checks on every
public page, every run: `lang`, one `main`, `alt` on every image, no positive
`tabindex`, heading levels that never skip, the quote form's labels, the skip
link moving focus into `#main`, and the FAQ accordion driven from the keyboard
with `aria-expanded` asserted. All of it passed on the first run.

What is left needs ears, and only ears:

- **A screen-reader run** (NVDA or VoiceOver) of the mobile menu and the FAQ
  accordion. The machinery is now checked; whether what it announces is
  *understandable* is not something a test can answer.
- The same, for the admin screens.
- The skeletons announcing once, not once per placeholder — `aria-busy` on the
  region is asserted by nothing today.
- ~~Whether the focus ring is actually visible against every surface.~~
  **Measured since 2026-08-28**, along with text contrast in both themes.

**The contrast flake was explained, and it was a real bug.** The spec failed
once, reporting footer links on `/case-studies` in dark at 2.59:1. The first
investigation said a theme flash was ruled out — from a mutation observer that
had never attached, because it was installed before `document.documentElement`
existed. Attached properly, it showed the site going **dark → light → dark over
about 50ms** on every load with a stored theme. The reading was of that
window. Fixed the same day; see PROGRESS, "a theme flash I had caused".

The spec still takes two readings 300ms apart, because that is a good property
for a contrast check to have regardless of what caused the first failure.

### The one thing still not explained

**An input dispatch occasionally never resolves inside a full suite run.** It
has now happened on a pointer click *and* on a keyboard press, on two unrelated
controls — links inside the mobile menu panel, and the theme toggle's radio
buttons. Playwright dispatches, reports the action, and the promise never
settles. Roughly once in fifteen, and **only inside a full run**.

That it happens to the keyboard too is the newest fact, and it rules out
anything specific to pointer handling: whatever this is, it is about the input
pipeline under load rather than about clicks.

Four explanations were tried and each was ruled out by measurement rather than
by argument. They are written down so nobody repeats them:

| Hypothesis | How it was tested | Result |
|---|---|---|
| The view transition on a theme change blocks the click | Clicked the toggle with `document.startViewTransition` deleted, and with it present | Both completed in about a second. **Not it** |
| A WebGL render loop keeps the page busy | Counted canvases on the affected page | **There are none on `/pricing`** — the hypothesis does not even apply where it failed |
| Parallelism alone | Eight pages clicking at once, twice over | 0 hangs in 16. **Not it** |
| The dev server compiling other routes under load | Eight parallel clicks while thirteen cold routes compiled, from an empty `.next` | 0 hangs in 8. **Not it** |

In isolation it has never reproduced: 24 sequential clicks clean, 6 clean, 16
parallel clean. It needs the whole two-hundred-test suite running to appear.

The suite is configured with **one retry**, and the reason is written into
`playwright.config.ts` rather than left as a number: a test that fails twice is
a real failure, and a retry that hid a reproducible fault would be worse than
the flake. But **tapping the mobile menu on a real phone stays on the list**, because until this is understood
it cannot be said with confidence that it is only a harness problem.

### ~~Unit tests worth writing~~ — the list is empty, 2026-08-28

All five are done, and three of them found something: an off-by-one in the
backup retention, a delete dialog blind to seven columns, and a helper written
twice with two different answers. Kept below as a record of what was written and
why, because "we wrote tests" and "the tests found things" are different claims.

1. ~~**The record mappers.**~~ **Done 2026-08-28** — all five pairs, with a
   coverage check against the generated types on top of the round trip.
2. ~~**The schemas.**~~ **Done 2026-08-28** — the pricing cross-field rule, the
   slug expression, the folder pattern and both link patterns.
3. ~~**`safeFilename`.**~~ **Done 2026-08-28**, after moving it out of the
   Server Action module, where nothing could import it.
4. ~~**`mediaUsageMap`.**~~ **Done 2026-08-28**, and it found that the list of
   places to look was missing seven of seventeen columns.
5. ~~**`aspectLabel`.**~~ **Done 2026-08-28**, and it stopped being a second implementation on the way — it delegates to `ratioLabel` now, so one file cannot be described two ways in two places of the same admin.

### ~~No end-to-end harness~~ — built 2026-08-28

There is now a `playwright.config.ts`, four spec files and a global setup, and
`npm run test:e2e` runs 123 tests against a real browser. See "The browser
harness" above.

What is **not** automated is the admin, and the reason is a password rather
than a decision: signing in needs the test account's, which is not in
`.env.local` and never will be. The shape to add when it arrives is a `setup`
project that signs in once and saves `storageState`, with the admin specs
depending on it. Not before — a suite that skips half of itself by default is a
suite whose green means nothing. The seven screens above are exactly the flows
those specs should drive.

---

## The rule going forward

A screen is not "done" because it compiles. Say which of the two happened:

- **Compiles and builds** — `tsc`, `lint`, `build`, and any unit tests.
- **Verified** — someone signed in, clicked it, and looked at it in both themes
  and at phone width.

Where only the first has happened, say so in `PROGRESS.md` in those words, and
add the second to this file.
