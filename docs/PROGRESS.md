# Progress — Apka Saathi Company Website

**Last updated:** 2026-08-28
**Current block:** A — Company website
**Current phase:** 1 — Public site
**Current plan:** none written; this file is the working list. `docs/plans/` is
empty — the plan file the earlier entry pointed at was never created.
**Next action: phase 4 — launch.** Phase 3 is finished. Every screen is built,
every content column on them is editable, and the command palette that was the
last item in the specification's admin standard landed on 2026-08-28. Nothing
in the admin is outstanding.

**The site is now verified by a real browser, signed in and out.** The
Playwright harness landed on 2026-08-28 and grew the same day: `npm run
test:e2e` walks twelve public pages at six widths, the seven service pages, the
mobile menu, all 21 admin guards, the whole SEO layer, and — signed in as the
owner — **all sixteen admin screens, the command palette and a preview pane**.
**152 tests, about two minutes.** The signed-in half is strictly read-only:
there is one Supabase project and no staging copy, so nothing in the suite
saves, creates or deletes.

**It has now found two real bugs.** A soft 404 on every made-up record address,
and — worse — **a mobile menu that did nothing on any scrolled page**, on every
page of the site. The second is fixed; the first needs a decision. `npm run
lint` is also clean for the first time, from eleven problems to none.

**It found a real defect, and it is a launch blocker.** Every made-up record
address — `/services/anything`, `/portfolio/anything`, `/blog/anything`,
`/case-studies/anything` — renders the not-found page and returns **HTTP 200**.
Confirmed in a production build, cause confirmed by experiment, and written up
with the fix and its trade-off in
**[pre-production-cleanup.md](pre-production-cleanup.md) §1.1**. It needs the
owner's decision because the fix touches a standing rule.

What launch needs beyond that is almost entirely the owner's, not a
developer's, and it is written out step by step in
**[owner-checklist.md](owner-checklist.md)**: the domain, the Vercel and mail
accounts, SPF/DKIM/DMARC before the first real send, the content, a lawyer on
the legal pages, and then the crawl switch at `/admin/seo`. The developer-side
pieces left are the deployment itself, the nightly `pg_dump` to R2, the
keep-alive cron, and the admin half of the click-through in
[testing.md](testing.md) — which is a person with the test account's password,
not more code.

**Navigation, SEO, the gallery repeater and the command palette all landed on
2026-08-28.** `/admin/navigation` edits the
header, the three footer lists and the dropdown underneath a header link, with
the real header or footer previewed beside the form — the first admin list that
is a tree rather than a flat list. `/admin/seo` edits the title template, the
two fallbacks, the verification codes, the Organization override and the crawl
switch that takes the site live, with a live search-result preview. And the
gallery repeater closed the last gap left by the image work — `projects.gallery`
and `case_studies.screenshots` are now edited on their own screens. And the
command palette (Ctrl+K) searches every screen and every record the person's
own menu allows. All four entries are below.

**Accounts, roles and menus are built.** `/admin/users` is two tabs — People
and Roles — and it is the estate's control plane: an owner opens an account, a
password is generated and emailed and can never be read back, blocking is one
absolute switch, and every person's menu is their role's menu plus or minus
whatever that individual is given. **Roles themselves are master data** since
2026-08-27, on the owner's instruction: their names, authority, capabilities and
default menus all live in `company.roles` and are edited from that same screen.

**All seven content lists are built**, and so is the media library. Pricing,
FAQs and team landed on 2026-08-27, joining services, portfolio, case studies
and the blog. Every kind of content on this site is now editable by someone who
has never seen the code.

Phase 1 is done. In Phase 3, auth, the shell, the dashboard, settings, the
enquiry pipeline and the page builder are built and verified in a browser. The
site is now editable end to end by someone who has never seen the code.

Everything is dynamic and verified: 6 pricing plans, 4 blog categories, 14 FAQs,
7 services and 11 pages with 45 sections between them, all read from the
database at build time.

**All thirteen migrations are applied.** `20260826000010_email_templates.sql`
and `20260827000011_staff_select_grants.sql` were run by the owner on
2026-08-27, and `20260827000012_profile_menu.sql` and
`20260827000013_roles_master.sql` the same day. The admin panel has been signed
in to and used end to end since. The generated types were refreshed from the
live schema afterwards — 25 tables, 5 enums.

**The owner's account exists:** `apkavission@gmail.com`, role `owner`. A test
account also exists — `kumarnitish4384@gmail.com`, same role — which should be
deleted from the Supabase dashboard before launch. Both passwords were shown in
a terminal and should be rotated from the Supabase dashboard.

**Mostly empty, and now fillable.** `site_settings.email` is set to
`info@apkasaathi.com`, entered through the admin on 2026-08-27 to prove the
save path. `phone`, `whatsapp`, the address, `cin`, `gst` and the social links
are still blank — and are now a form away rather than a developer away. These get filled through the
admin panel when it exists — that is the decision, not an oversight. Until then
the email footers carry no contact details, the client confirmation has no
reply-to address and no "Call us" links, the quote page's "Rather talk first?"
panel renders empty, and the Organization JSON-LD claims only `addressCountry`.
All of that is correct behaviour for empty data.

## What is waiting on the owner, right now

**The decision, taken on 2026-08-27: all content entry happens at the end**, once
every screen is built. Nothing on this list blocks the next screen, and the owner
has asked not to be interrupted for it until the build is finished. It is here so
that nothing is forgotten, not as a queue of work to do today.

**R2 is done** — the credentials arrived on 2026-08-27 and are verified. Nothing
on this list blocks building any more.

**The full list, written out properly, is [owner-checklist.md](owner-checklist.md)** —
added 2026-08-28 on the owner's instruction ("jo mere ko karna hoga thoda bade
me batana"). Nine numbered steps in the order they make sense, each saying what
to do, which screen to do it on, what it turns on, and how long it takes. It
also carries the accounts still to create, the launch sequence, the open
decisions, and the list of things the site deliberately will not do so they are
not mistaken for missing work. **That file is the one to hand the owner.** The
table below is the summary the next session needs.

| # | What to do | What it unblocks | How long |
|---|---|---|---|
| 1 | ~~Create a Cloudflare R2 bucket~~ — **done 2026-08-27.** Bucket `apka-vission-storage`, private, credentials in `.env.local` and verified with a signed request. | The media library, and with it every image field. No longer blocking. | done |
| 2 | **Fill in the contact details** at `/admin/settings` — phone, WhatsApp, address, CIN, GST, social links. | Email footers, the "Call us" links, the quote page's contact panel, and the Organization data search engines read. | ~15 min |
| 3 | **Tick the technologies on each of the seven services**, at `/admin/services`. | "The stack behind this service" — a block that has never rendered on any service page, because no service names a single technology. | ~10 min |
| 4 | **Upload the pictures** at `/admin/media`, then pick them on each screen. | Eleven image fields across seven screens, including the two galleries built on 2026-08-28. | an afternoon |
| 5 | **Add the real portfolio items** at `/admin/portfolio`. | `/portfolio` is a working page with nothing on it. The table is empty. | at the end |
| 6 | **Write up the case studies** at `/admin/case-studies`. | `/case-studies` is a working page with nothing on it. The table is empty. | at the end |
| 7 | **Rotate both account passwords** and delete the test account, from the Supabase dashboard. | Nothing — but both passwords were printed in a terminal when they were created. | ~20 min |
| 8 | **Create the Vercel and mail-sender accounts**, and choose the domain. | Phase 4 in full. The mail one needs SPF, DKIM and DMARC before the first real send, or enquiry emails land in spam invisibly. | ~1 hr |
| 9 | **Get a lawyer to read the legal pages**, then **open the site to search engines** at `/admin/seo`. | Launch. It is deliberately the last step. | — |

**No SQL to run.** All thirteen migrations are applied. `20260827000012`
(the per-person menu columns) and `20260827000013` (the roles master table, the
enum-to-foreign-key change and the three rewritten RLS helpers) were both run by
the owner on 2026-08-27, and `npm run db:types` regenerated
`src/types/database.ts` from the live schema — **25 tables, 5 enums**, and the
generated file agrees with the hand-written types the code was built against.
`tsc`, the tests and the build were all re-run against it and are clean.

If a migration is ever needed again, the file name and the words "run this in
the Supabase SQL editor" go at the top of the summary, not buried here.

---

## Starting the next chat

Say one of these. Nothing else is needed — this file carries the context.

| To do this | Say |
|---|---|
| Carry on with the plan | **`aage karo`** |
| See where things stand first | **`docs padho, phir batao kya bacha hai`** |
| Jump to a specific thing | **`<the thing> karo`** — e.g. `about page karo`, `admin panel shuru karo` |
| Change something already built | **`<what> me <change> karo`** — e.g. `email template ka text badlo` |

**`aage karo` right now means: nothing. The build is finished.**

Every phase of Block A is complete, the last open defect — the soft 404 — was
fixed on 2026-08-28, and there is no code left that does not need an account, a
payment, a legal opinion or content that does not exist yet.

**Everything held back for production is in one file:
[launch.md](launch.md)** — the domain, the accounts, the environment variables
on Vercel, the secrets to rotate, the content to enter, the lawyer, and deploy
day in order. Nothing in it is waiting on a developer.

**What happens next, per the standing rule**: the build is declared complete,
and then the browser click-through in [testing.md](testing.md) is worked down
by a person, locally, screen by screen. That is booked and has not happened.

**Nothing is waiting on the owner.** There is no SQL to run and nothing to
configure; the next session can start writing code immediately.

Whoever picks this up should read this file first. **Update the two lines below
"Next action" at the top when you finish something** — they are what the next
session reads.

---

## Standing rule: everything is dynamic

Nothing a non-developer might reasonably want to change is allowed to live only
in code. Copy, brand, logo, images, colours, layout content, email wording — all
of it comes from the database and is editable from the admin panel.

What *stays* in code is the machinery that renders those things: table layout
and inline styles for email, the section components, the escaping. Those are
constraints of the medium, not editorial decisions, and handing an admin raw
HTML would let one paste break every reader's inbox.

Two rules make this safe:

1. **Every dynamic thing has a compiled fallback.** A missing row degrades to
   the version in code, never to an empty field or a crash.
2. **The fallback is not the source of truth.** It is the guarantee that there
   is always something to send or show.

Applies to work already done and to everything after it.

---

## Standing rule: three addresses, and one that is never written down

| Address | What it is for |
|---|---|
| `apkavission@gmail.com` | The project's own address. Git authorship, and anywhere a document names the owner's contact. |
| `kumarnitish4384@gmail.com` | Every test submission, template preview, seeded contact and demo login — here and in the demo estate. |
| `info@apkasaathi.com` | The business address real enquiries reach. `EMAIL_FROM` / `EMAIL_TO_ADMIN`. |

The owner's personal mailbox is **never written down anywhere** — not in code,
not in these documents, not in git config, not in seed or demo data, and never
as a test recipient. It was removed from this file, the design spec and the
repo-local git config on 2026-08-27. Before finishing any document or config
change, check that it has not come back.

Recorded in the specification at §3.4, §19 and §23.

---

## Standing rule: one loader, everywhere, as an overlay

Restated by the owner on 2026-08-28, and absolute:

> Brand loader hi sab jagah chalega — jisme apna logo hai, aur left aur right
> se animation aur arrow wala. Yahi loader sab jagah rahega.

There is exactly one loader: `src/components/brand/brand-loader.tsx`. Not one
per application and not a variant per situation — the same component on the
company site, in the admin, in the client portal and in every demo.

**It does not get removed from a route to solve something else.** That came up
on 2026-08-28: a route-level `loading.tsx` is a Suspense boundary, and a
Suspense boundary above a page that calls `notFound()` makes that page answer
200 instead of 404. Both files were taken out to prove the cause and put
straight back within the hour. The soft 404 is real and is a launch blocker —
[pre-production-cleanup.md](pre-production-cleanup.md) §1.1 — and it gets fixed
from the other side. The loader stays. `/admin/account` was the last screen
without one and got one the same day, so every route in the application now has
it.

The mark sits in the centre; the two halves of the name come out from behind
it and settle outward, `Apka` left and `Vission` right. Under them the mark's
own rising arrow draws itself and clears, looping for as long as the wait
lasts. Behind the lockup, the `vision` WebGL scene: an iris that drifts,
blinks, and draws the arrow through itself — the brand's name and its mark,
animated.

It is an **overlay**. The page stays visible, dimmed and blurred underneath,
so a wait reads as "this is working" rather than "your page is gone".

It covers every wait there is:

| Wait | How |
|---|---|
| Navigation, reload, a segment fetching data | `loading.tsx` (root and route group) |
| `POST`, `PUT`, `PATCH`, `DELETE` | `BusyProvider` / `useBusy()` — `start()`/`stop()`, or `run(promise)` |
| Not found | `not-found.tsx` — same overlay, carrying the message |
| A route that threw | `error.tsx` — same overlay, one retry button |
| The root layout itself failing | `global-error.tsx`, the one exception: nothing shared can be trusted there |
| A button mid-submit, a row saving | `BrandSpinner`, the compact form |

Specified in full at §7.7 of the design specification.

---

## Standing rule: "it compiles" and "it works" are different claims

`tsc`, `npm run build` and a route returning 307 prove the code compiles and the
guard is wired. They prove nothing about whether a button does what its label
says. Say which of the two happened, in those words, every time.

Everything that has never been opened in a browser is listed in
**[testing.md](testing.md)** — screen by screen, with what to click. It is the
backlog, not a confession: nothing on it is known to be broken, it is known not
to have been looked at. A browser pass needs the test account's password, which
is the one thing standing in the way.

## Standing rule: a skeleton wherever content loads, beside the loader

Added by the owner on 2026-08-27: *"jahan pe show hoga wahan pe loader ke saath
skeleton UI ka bhi use karna — best sa skeleton wala cheez chahiye."*

The two are not alternatives, and both are used:

- **The brand loader** is for a wait the person *caused* — save, delete, a
  followed link. It lays the lockup over the dimmed page.
- **A skeleton** is for content that is *not here yet* — a screen arriving. It
  draws the shape the content will take, so nothing jumps when it lands.

`components/ui/skeleton` is the only skeleton primitive, as
`components/brand/brand-loader` is the only loader. It is shape-accurate, fades
in after 120ms so a fast load never flashes it, staggers across a grid, animates
transform only, ships no JavaScript, and is `aria-hidden` under one
`SkeletonRegion` that carries the single announcement. Full rules:
[loading-rules.md](loading-rules.md).

## Standing rule: images are pixel-perfect, and every field says what it wants

Added by the owner on 2026-08-27: *"image bahut badi cheez hai — na cut ho, na
kahin se cover ho, na hi bada ya chhota ho."*

Never cropped, never covered, never distorted, never upscaled. Every image field
in every admin panel prints the exact pixel size it wants before anyone picks a
file, and warns — naming both numbers — when the file given does not match. This
is the specification the media library is built against, and it binds the task
tracker and the demo sites as well as this repo. Full rules:
[image-rules.md](image-rules.md).

## Standing rule: every screen responsive, in every project

Added by the owner on 2026-08-27: *"sab project mein responsive bahut main hai,
saare screen mein chale."*

A release blocker, not a polish pass. Build at 360px first; the body never
scrolls sideways; wide content scrolls inside its own box; nothing overlaps at
any width; tap targets stay 44px; every screen is checked at 360, 390, 768,
1024, 1280 and 1440. Full rules: [responsive-rules.md](responsive-rules.md).

## Standing rule: the two env files stay in step

Owner's instruction, 2026-08-28:

> Jo bhi env example me daalte ho wo env local me bhi daala karo. Value me
> doonga to mujhe batao, ya tum bana ke kar sakte ho to tum karo.

**A variable added to `.env.example` is added to `.env.local` in the same
sitting.** A documented variable that is not set is a feature that silently
does nothing, and the way it is discovered is a cron that never ran or an
endpoint that has been refusing every caller for a week.

**Who supplies the value:**

| Kind | Who | Example |
|---|---|---|
| A random secret | **Generated here**, immediately, and never printed anywhere | `CRON_SECRET`, `REVALIDATE_SECRET`, `IP_HASH_SALT` |
| An account's key or token | **The owner**, and it is asked for by name with the exact dashboard page it comes from | Turnstile keys, `SUPABASE_ACCESS_TOKEN` |
| Deliberately blank | Neither — and the reason is written beside it | `NEXT_PUBLIC_GA_MEASUREMENT_ID`, which stays empty because no analytics is added without the owner's word |

The check is one command, and it belongs in the pre-commit look:

```
comm -3 <(grep -oE "^[A-Z0-9_]+=" .env.example | sed 's/=$//' | sort -u)         <(grep -oE "^[A-Z0-9_]+=" .env.local   | sed 's/=$//' | sort -u)
```

Nothing printed means the two files carry the same keys. Values are never
compared, never printed and never leave `.env.local` —
[privacy-rules.md](privacy-rules.md).

Done on 2026-08-28: `CRON_SECRET` was generated and written, and
`SUPABASE_ACCESS_TOKEN` and `SUPABASE_DB_PASSWORD` — which were in `.env.local`
and undocumented — were added to `.env.example` with a note saying where each
comes from.

## Standing rule: nobody commits or pushes but the owner

Restated by the owner on 2026-08-28: *"docs me likha h tumko commit and push
nhi karna to tum mat hi karna."*

**Nothing is committed and nothing is pushed without the owner asking for it,
in those words, that time.** Not at the end of a piece of work, not "so it is
safe", not as a tidy-up. Work is left in the working tree and `git status` is
what reports it.

Two reasons, and the second is the one that matters:

- The commit author has never been settled — open question 1 — and every commit
  made before it is settled is a commit that has to be rewritten.
- **A commit is the point at which ground rule 1 stops being fixable.** No
  AI-tooling fingerprints anywhere in the repository: no tool-named files, no
  references, no generated-by lines, no co-author that is not a person. In a
  working tree that is a file to delete. In a pushed commit it is history.
  Next.js writes `AGENTS.md` and `CLAUDE.md` back into the repository root on
  every `next dev` and `next build` — both are in `.gitignore` since
  2026-08-28, and the check before any commit is in
  [privacy-rules.md](privacy-rules.md).

What to do instead of committing: say what changed, leave it in the working
tree, and let the owner decide. That is what every session so far has done, and
why **nothing has been committed yet.**

## Standing rule: nothing about this project leaves this machine

Restated by the owner on 2026-08-28: *"kuch bhi Claude ki server ya memory pe
nahi jayega, sab local hi rahega."*

Nothing about this project is kept in any tool's memory, profile, knowledge base
or account. Nothing is published, uploaded or shared to get a link. No
telemetry, analytics or error reporting is added to the codebase without the
owner saying so first. The only places project data may go are the four the
owner set up — Supabase, Cloudflare R2, the mail sender, and Vercel once deploys
start — and a fifth is a decision, not a convenience.

The repository is the memory. `docs/PROGRESS.md` is the handoff, and it is a
file in this repository for exactly that reason: nothing durable is allowed to
depend on something a tool remembers.

The one part of this that is not a promise: a conversation with an AI assistant
runs on that assistant's servers, and no rule written here changes that. So the
protection is the practical one — **secrets are never typed into a chat**, real
enquiry data is never pasted in, and anything that has been shown outside
`.env.local` is rotated from the provider's dashboard rather than reasoned
about. Full rules, including what to rotate and where:
[privacy-rules.md](privacy-rules.md).

## Standing rule: every admin screen has the same three-part shape

The pages screen decided the pattern, and **nothing in the admin is allowed to
invent a different one**. An owner or an employee who has learnt one screen has
learnt all of them; a panel where each section works differently is a panel
where people stop being sure what a button does.

```
  list            editor                preview
  ─────────────   ───────────────────   ──────────────────
  every record    the selected one,     what it will
  in order        as a form             actually look like
```

- **List on the left.** Every record of that kind, in the order they appear,
  with their state visible — hidden, draft, archived. Selecting one changes the
  middle column, and which one is selected lives in the **query string**, so
  the back button steps back through it and a link to one record can be sent.
- **Editor in the middle.** The selected record's fields, generated from the
  same descriptors that validate it. One save button. Field errors sit beside
  their fields, and the outcome goes through the shared toast.
- **Preview on the right**, wherever the record is something a visitor sees.
  The real rendering, not a second implementation, refreshed on save.

Three columns from `xl`, stacked below it. Actions on a record — reorder, hide,
duplicate, delete — sit on its row in the list, never scattered between the
columns.

This applies to services, portfolio, case studies, blog, pricing, FAQs, team
and media as they are built, and to the client portal and the task tracker.
Where a record has no meaningful preview (an FAQ answer, a team member) the
third column is dropped and the first two keep their positions — the layout
narrows, it does not rearrange.

---

## Standing rule: accounts, passwords and access

One model for every person who signs in anywhere in the estate — staff,
employees and clients — because they are all rows in `company.profiles` with a
role, and a second model would be a second place to get access wrong.

**An account is created for you; you never create one.** Sign-up is disabled at
the Supabase project. An owner enters an email address, the system generates a
strong password, Supabase Auth stores only its hash, and the address receives
it. Nobody — not an owner, not a developer, not the database — can read an
existing password back, which is the point.

**Everyone can change their own password**, from their own account screen,
after confirming the current one. **An owner can reset anyone's**, which issues
a fresh generated password to that person's address rather than letting the
owner choose one — an owner who types a colleague's password knows it.

**Blocking is one switch and it is absolute.** `profiles.is_active = false`
ends access everywhere at once: the login refuses it after authenticating, the
session helper treats the account as signed out on the next request, and every
RLS policy in the schema tests `is_active` so the database refuses the rows as
well. Blocking is never a deletion — the person's notes, assignments and
history stay attached to them.

**A menu is a permission, not a decoration — and it is per person.** Each role
has a **default menu**. Any individual can then be given **extra items** beyond
that default, or have items **taken away** from it: a senior employee who also
handles enquiries, a new one who should not touch settings yet. Whatever a
person's resolved menu turns out to be, that is exactly what they may reach —
typing a URL for anything else answers as if the route does not exist.

Hiding a link is never the mechanism. The route checks the resolved menu, and
RLS refuses the data underneath it regardless. Three layers, and the sidebar is
the weakest of them by design.

**Roles are master data, not a list in the code.** Added by the owner on
2026-08-27: *"role wala bhi jo master se aayega — matlab wo bhi admin set
karega, DB me jayega."* A role is a row in `company.roles` carrying a label, a
description, an **authority rank**, three capability flags — reaches this panel,
sees enquiries, manages accounts — and a **default menu**. All of it is edited
from `/admin/users`, on the Roles tab beside the people it applies to.

Three consequences, and each is why it was done this way:

- **A new role needs no deploy.** "Content lead" — every content screen plus
  enquiries, no settings — is four ticks and a name. The RLS helpers read the
  flags rather than a list of role names, so the database honours it the moment
  it is saved.
- **Nothing outranks its author.** Nobody may create or edit an account, or a
  role, above their own rank — so an owner cannot mint a super admin and nobody
  can promote themselves.
- **The last way in is never closed.** At least one active role must carry
  "manages accounts", and at least one active account must hold such a role.
  Refused in the form, and refused again by a deferred trigger in the database.

The seven original roles are seeded as **system roles**: everything about them
is editable — name, rank, capabilities, menu — except their key, and they cannot
be deleted. Switching one off suspends everybody holding it at once.

**Two employee panels, and they are not the same thing.** The employee who
manages this services site and the employee who manages the task tracker are
separate people with separate panels. `profiles.app_access` is what keeps them
apart — an account granted `company` reaches this admin, one granted the tracker
reaches that one, and an account may hold either, both or neither. An employee
account never implies the other panel.

**This admin is the control plane for the estate.** The task tracker and every
demo application are administered *from here* — accounts, access, menus, cache
invalidation and the variant system. That is what the specification's Section 14
describes, and it is why this panel is built to a higher standard than a single
site would justify. Their own panels are for the people doing day-to-day work in
them; this one is where those panels are set up, granted and switched off.

The same rules govern the task tracker for both clients and employees: a client
sees their own projects and nothing else, an employee sees the work assigned to
them, and neither can reach the other's screens by guessing a URL.

Roles are in the specification at §15.2; the estate-wide `is_active` switch at
§28.

---

## Standing rule: never `window.confirm` — one themed modal, everywhere

Anything that asks "are you sure" goes through one component:
`src/components/ui/confirm-dialog.tsx`, mounted once in the root layout beside
the toast, reached with `useConfirm()`. The browser's own dialog is never used,
anywhere in the estate — not in the admin, not in the portal, not in a demo.

Why it is a rule rather than a preference:

- `window.confirm` is unstyled and ignores the theme entirely, so it is the one
  surface in a carefully built admin that looks like a 1998 error box.
- It names the **origin** rather than the company — "localhost:3000 says".
- Its buttons say "OK" and "Cancel" whatever the question was, so the
  destructive action and the safe one are indistinguishable at a glance.
- On some platforms it offers "prevent this page from creating more dialogs",
  which silently disables **every later confirmation on the page**. A user who
  ticks it once loses the safety rail for the rest of the session.

What the shared dialog gives instead: theme tokens, so it is correct in light
and dark with no second set of styles; a tone per situation (danger, warning,
info) that colours the confirming button; a title and a sentence saying what
will happen and whether it can be undone; and a **Cancel button that holds the
focus**, so a stray Enter never confirms.

It is built on the native `<dialog>` with `showModal()`, which is what gives
focus trapping, Escape to dismiss, inertness for the rest of the page, and the
browser's top layer — the four things a hand-rolled overlay usually gets wrong.

The same applies to `window.alert` and `window.prompt`: the toast replaces the
first, and a form replaces the second.

Recorded in the specification at §15.3, beside the toast.

---

## Standing rule: admin feedback is a toast, and the toast is themed

Every action that succeeds or fails — in the admin, and on the public forms —
says so through one shared toast component: `src/components/ui/toast.tsx`,
mounted once in the root layout. Its colours and text come from the theme
tokens, so it is correct in light and dark with no second set of styles and no
hardcoded hex. Four variants: success, error, warning, info.

It sits at the top — full width below the header on a phone, a column at the
top right from `sm` up — because a toast fires just after a form is submitted,
which on a phone is when the keyboard is open and the bottom of the screen is
behind it. Everything clears itself: four seconds for success and info, six for
errors and warnings, paused while hovered or focused.

Specified in full at §15.3 of the design specification. It applies to the admin
panel (Phase 3), the super admin and the client portal.

---

**Supabase project (live, verified):**
- Name `services` · ref `miaidchbonkcdewjrgau` · region `ap-south-1` (Mumbai)
- URL `https://miaidchbonkcdewjrgau.supabase.co`
- Postgres 17.6.1, PostgREST 14.17, Auth 2.195.0
- Account: `apkasaathi8683@gmail.com`
- `company` is in **Exposed schemas** and verified working — the seeder writes
  and every page reads through PostgREST.

---

## Standing rule: finish, say so, then test in a browser

Owner's instruction, 2026-08-28:

> Jab ye Apka Vission ka service wala ho jayega to bata dena ki sab kuch ho gaya
> hai — uske baad tum testing karoge browser pe, local me. Aur jab task tracker
> aur demos ka kaam chalu hoga tab docs me update karna ki end me kitna
> percentage kaam hua aur kitna baaki, wo show hoga. Same — sab ho jayega poora
> to completed karke uske baad testing karoge browser me.

**This binds all three projects**: this company website, the Apka Saathi task
tracker, and the fifteen demo sites.

### The order, and it does not move

1. **Build**, until nothing is outstanding but the owner's own list.
2. **Say so plainly** — "everything is done" — as a statement, not a hedge, and
   only when it is true of every phase.
3. **Mark it completed** in that project's `PROGRESS.md`, in its phase table.
4. **Then** the browser pass: work down that project's `testing.md`
   click-through list, locally, screen by screen.

The order matters and it is the owner's, not a convenience. A click-through run
against a half-finished panel finds the half that is missing rather than the
half that is wrong, and it gets run again anyway — so it is run once, at the
end, on something finished.

### Every project carries a counted percentage

At the end of every working session, and in the same place in every project's
`PROGRESS.md`: **how much is done and how much is left, counted from the phase
table, never typed by hand.**

That is not a formality. The count is what caught this file claiming the 3D
layer had not started while three scenes had been live for days — a number
computed from a table forces somebody to look at the table.

The one sentence that goes beside every percentage: **what the number does not
say.** "80% done" and "nobody has clicked through the admin" are both true at
once, and a percentage on its own reads as the second one being handled.

### Where each project's number lives

| Project | Its PROGRESS | Its click-through list |
|---|---|---|
| Company website (this repo) | `docs/PROGRESS.md` → "How far along this is" | `docs/testing.md` |
| Task tracker | its own `docs/PROGRESS.md`, same section, same shape | its own `docs/testing.md` |
| Demo sites | one PROGRESS across the estate, per-demo rows | one list, per demo |

## How far along this is

**Counted, not estimated.** The standing rule is that progress is computed from
tasks and never typed by hand, because a manual percentage always drifts and
then nobody believes any of them. So this is the phase table below, counted —
and the first thing that count did was find that the table was wrong: phase 2
said "not started" while three 3D scenes had been live for days.

**This repository — the company website — is Block A: five phases, four done.**

| | |
|---|---|
| **80% done** | Foundation, the public site, the 3D layer and the admin panel |
| **20% left** | Phase 4, launch |

**What moved inside that 20% on 2026-08-28**, without moving the phase count:
the site now has its content, entered through the panel — one team profile, two
portfolio entries, a case study and four posts, all published and all verified
on the site at 1600px and 390px. What is left in phase 4 is the deploy, the
domain, the accounts, email deliverability, a lawyer on the legal pages, and two
things only the owner can do: rewrite his own biography, and add real
testimonials with recorded consent.

**The 20% is mostly not code.** Of what launch needs, the developer-side pieces
are the deploy itself, and one open defect — the soft 404 in
[pre-production-cleanup.md](pre-production-cleanup.md) §1.1, which needs the
owner to pick between two options. Everything else is
[owner-checklist.md](owner-checklist.md): a domain, three accounts, the content,
and a lawyer on the legal pages.

**The whole estate is seventeen phases (0–16)**, so counting the same way:
**twelve done, about 71%** — verified on 2026-08-30 by asking the database and
building every project, not by reading this file. Blocks B and C are largely
built: the client portal and the task tracker are each at 100% of their own
tables, and five demo applications are built, seeded and running.

**What is left across the estate is four phases and one part-phase**, and it is
worth naming them rather than leaving a percentage to imply them:

| Phase | What it is | Why it is still open |
|---|---|---|
| 4. Company launch | Domain, deploy, accounts, a lawyer on the legal pages | Almost none of it is code — [owner-checklist.md](owner-checklist.md) |
| 5. Messaging stage 1 | **Part done.** WhatsApp click-to-chat with page context is built and email sends; threaded inbound over Cloudflare Email Routing is not | Needs the domain from phase 4 |
| 10. Super admin | `control` schema, app registry, unified inbox across all eight applications, audit log, estate dashboard | Never started. It is what makes running eight panels practical, and today each one is opened by hand |
| 15. Messaging stage 2 | WhatsApp Cloud API, two-way threading | Needs Meta business verification and a dedicated number |
| 16. Growth | Blog posts, cost estimator, profile PDF, location pages | Content work, after launch |

**Ten of the fifteen planned demo sites are also not built.** Five applications
exist with three businesses each; the plan was fifteen. That is a deliberate
stop, not an oversight — five cover the five markets worth showing, and the
sixth onwards is a decision to take after somebody has been shown these.

**What the number does not say**, and should be read beside it. The admin has
now been clicked through, twice: once by hand on 2026-08-28, and once more when
the site was filled with content through the forms rather than by a seed script.
Both passes found real defects, which is the argument for doing them.

The automated half is **259 unit tests, green**, and **219 browser tests, green,
re-run in full on 2026-08-30** — including since the two master lists were added. The browser suite walks the filled pages as well as the empty
ones, which is what caught the heading skip on a category archive.

**Added 2026-08-30, applied, and verified against the live database** by
`npm run verify:estate`, which reads every migration file in every project and
asks the catalogue whether what it declares is actually there. Two migrations
here serve the other two applications, on the owner's rule that master data
lives in this panel:

- `20260830000016_workplace_location.sql` — an address, a point and a radius on
  each account. The task tracker measures clocking in against it; there is a
  **Where they work** section on the account form, with a *use my location*
  button and a box that takes a coordinate pair pasted from a map. The address
  is never sent to a geocoding service — that is why the pair is typed.
- `20260830000017_leave_types_master.sql` — the leave types the tracker offers,
  edited under **Users → Leave types**. It has no list of its own any more, the
  same as roles.

Twelve of the 259 unit tests are new and cover the coordinate parser, including
the case it deliberately **cannot** catch: a pair swapped where both numbers are
valid latitudes. It accepts that rather than guessing, because silently
reordering a pair would sometimes move a point that was right.

**Also changed:** the current tab, the current menu item and the selected row are
now coloured in the brand accent across all three applications, rather than
underlined only. Asked for on 2026-08-30 after the admin's active state proved
hard to see.

What is still untested by anyone: **a real phone in a hand, a screen reader, and
a non-owner account.** None of the three can be done from here. And **email
delivery** is unproven in the way that matters — messages leave the server
without error, but SPF, DKIM and DMARC are unset, so whether they land in an
inbox or a spam folder is not yet knowable.

## Status at a glance

| Block | Phase | Status |
|---|---|---|
| **A. Company website** | 0. Foundation | ✅ **Done, verified against the live database** |
| | 1. Public site | ✅ **Done, and verified in a real browser since 2026-08-28** — every page walked at six widths on every run of `npm run test:e2e` |
| | 2. 3D layer | ✅ **Done** — corrected 2026-08-28, this row had said "not started" while three scenes were live. `assemble` in the hero, `lattice` on the closing CTA, `wave` built and unused. The approach changed from the spec's plan and the change is below |
| | 3. Admin panel | ✅ **Done** — auth, shell, dashboard, settings, enquiries, the page builder, all seven content lists, the media library, all eleven image fields including both galleries, users/roles/menus, navigation, SEO and the command palette. Every content column reachable from a form. **Testimonials added 2026-08-28** — the table and the public rendering had existed since the first migration with no way to create a row. **Clicked through in a browser, twice** — see [testing.md](testing.md) |
| | 4. Launch | ⚪ **Not started, and nothing in it is a developer's** — accounts, the domain, content and a lawyer. All of it in [launch.md](launch.md) |
| **B. Client delivery** | 5. Messaging centre stage 1 | 🟡 **Part done** — WhatsApp click-to-chat with per-page context and owner notification are built, and email sends. Threaded inbound over Cloudflare Email Routing waits on the domain |
| | 6. Client portal core | ✅ **Done** — `portal` at 24 of 24 items and the task tracker at 32 of 32, both counted from their own tables. Projects, phases, tasks, requirements, derived progress, the client dashboard, the developer board and request triage all exist. **Not yet clicked through by a person** |
| | 7. Portal collaboration | ✅ **Done** — the project conversation, internal notes a client cannot see, the change-request flow with an approval gate before any developer sees it, transfers with accept and reject, geofenced clocking in, and leave from master data. Verified by `check:schema` and `check:policies`, which plant real rows rather than counting empty tables |
| **C. Demos** | 8. Variant framework | ✅ **Done** — built inside the clinic and then copied, not extracted to a shared package. That is the owner's rule: no project depends on another, so the plumbing is duplicated on purpose |
| | 9, 11–14. The five demos | ✅ **Built, seeded and running** — clinic, restaurant, school, property, CRM, three businesses each, on ports 3300–3700. Each carries its own `docs/PROGRESS.md`, each at 83%: everything but a browser suite. Ten of the fifteen planned sites are not built, deliberately |
| | 10. Super admin | ⚪ **Not started** — the `control` schema, the app registry, one inbox across the estate, the audit log. Eight panels are opened by hand today |
| **D. Growth** | 15–16 | ⚪ Not started |

---

## Done so far

### 2026-08-29 — WhatsApp that says something, and a hang with no time limit

**A request that never came back.** The proxy awaits `supabase.auth.getUser()`
on every request carrying a session cookie, and **there was no timeout on it at
all**. The cookie travels everywhere, not only to `/admin`, so if the auth
server stopped answering, every page a signed-in person opened would wait
indefinitely — nothing rendered, no loader, just a spinning tab. A Supabase
project on the free tier pauses after seven days idle, which is exactly that
shape of failure, and it is in this file's own risk table.

Measured first, and the measurement did **not** reproduce a hang: from an empty
`.next`, no page took over two seconds; signed in, a public page costs 90–500ms
and an admin page 1–3s. So the fix is for a failure mode that was found by
reading, not one that was observed — said plainly here because the owner
reported a hang and this may or may not be the one they saw.

Bounded at four seconds, and what a failure means now depends on where it
happened:

- **Public pages fail open.** Nothing on them reads the user; that call is only
  refreshing a token. Blocking the marketing site on the auth server would be
  the wrong trade.
- **The admin fails closed, but not into a redirect.** Treating "could not
  verify" as "not signed in" would bounce the owner to a login screen that needs
  the same auth server — a loop that cannot end, explaining nothing. It answers
  503 with a sentence instead.

**WhatsApp click-to-chat, with the message already written** — stage 1 of the
messaging centre. Three buttons existed and **all three opened an empty chat**,
which leaves the visitor to write the first sentence: the one they are least
willing to write. The href was built in three places with three copies of the
same `replace(/\D/g, "")`.

One builder now, in `lib/whatsapp.ts`, and the message comes with it. The
subject is merged through the section renderer the same way `background` already
is, so `/products/apka-saathi` opens *"Hi, I'd like to talk about Apka Saathi."*
and everything else opens a generic line. **The page title is deliberately not
used as the subject everywhere** — "I'd like to talk about Privacy policy" reads
badly — so it is passed only where it names something a person would discuss,
and the wording is editable per section in the page builder.

**A dead link that nobody could have noticed.** `wa.me` does not reject a number
missing its country code: it opens WhatsApp on a chat with nobody. The failure
lands on the visitor, after the tap, where it is invisible from this side. A
number that cannot make a working link now renders **no button** rather than a
broken one. Fourteen tests, including that one.

**Not Twilio, and worth writing down.** Sending from the panel needs Meta's
WhatsApp Business Cloud API. Twilio is a reseller on top of that same API — Meta
pricing plus a margin, for no additional capability. That is phase 15 and nothing
here depends on it. Also worth correcting in the spec's own words: §25.5 calls
stage 1 free while including "owner notification on WhatsApp whenever a lead
arrives" in it. Click-to-chat is free; an automated outbound message is not.

One migration is waiting on the owner —
`20260829000015_whatsapp_template.sql`, which makes the opening line editable in
Settings. **Nothing is broken until it is run**; every button already works from
the built-in default, which is the same sentence the column defaults to.


### 2026-08-28 — the site has its content, and a screen that was never built

Two things, and the second was found by doing the first.

**Testimonials could never be created.** `company.testimonials` has existed
since the first catalogue migration. The public case study page renders a quote
from it. The case study editor offers a dropdown to choose one. And **nothing
anywhere inserted a row** — no screen, no action, no form. The dropdown was
permanently empty and the block on the page could never appear. A feature read
in three places and written in none.

It exists now: `records/testimonials.ts`, `queries/testimonials-admin.ts`,
`actions/testimonials.ts` and the five files under
`admin/(dashboard)/testimonials/`, plus the menu key, the icon, the command
palette source and a migration that puts the screen in the roles that already
carry content.

The shape of that form is dictated by one line in the schema:

    constraint testimonials_require_consent check (
      status <> 'published' or consent_confirmed
    )

So consent is its own step with its own explanation, and the Zod schema mirrors
the constraint — publishing without it comes back as a sentence beside the box
rather than as a Postgres error nobody can read. Duplicating a quote
deliberately drops the consent and the note: a copy is the start of a different
statement, and carrying "this person agreed to this" onto words about to be
changed is how a quote nobody approved gets published under somebody's name.

**A menu key needs its cache cleared, or the screen 404s for everyone.** Adding
`testimonials` to `ADMIN_NAV` and to the roles table was not enough. The roles
list is read through a tagged cache, and a migration changes the table from
underneath it — so every account kept resolving the menu it had before, and the
new screen answered 404 for the owner while the code and the database were both
already correct. A dev-server restart did not fix it either, because that cache
is on disk. It is written at the top of the migration now.

**The content went in through the panel, not through a seed script.** The owner
asked for it to be entered the way a person enters it, so it was: a real browser,
the real forms, the same validation and the same server actions. One team
profile, two portfolio entries, one case study with four measured results, four
blog posts of 2,200–2,600 characters of body each — every one created and
published from the screens.

**Nothing was invented.** That is worth stating, because filling a site is
exactly where fabrication creeps in:

- **Portfolio has two entries and both are ours** — the product and this
  website. No client work was made up. The type field already distinguishes
  `client` / `demo` / `inhouse` / `previous`, and both are `inhouse`.
- **Apka Saathi's write-up came from its own product page**, not from
  imagination — document reading, notice-period reminders, questions answered
  from your own files.
- **The case study's numbers are real and countable** — the test counts, the
  page count, and what is editable without a deploy.
- **Testimonials are still empty.** There are no real client quotes yet, and the
  table's own comment says "Real testimonials only". Inventing three would have
  been writing fake reviews.

**Two things for the owner** are in
[pre-production-cleanup.md](pre-production-cleanup.md): the test enquiry sitting
in the database, and a biography written *about* a real person that he should
put in his own words.

**Then it was checked, not assumed.** Every page was walked in one browser at
1600px and again at 390px — status, a single `h1`, a meta description, sideways
scroll, broken images, missing `alt`, unnamed links, console errors and failed
requests. Separately, seventeen assertions checked that what was typed into the
panel actually reaches a visitor: the featured product on the home page, the
profile on About, the feature bullets, a ticked technology, a measured result,
the post bodies, and a category listing its post. **All seventeen present.**

**Email was sent for real**, through the company's own SMTP, using only the two
addresses the owner named for testing. The enquiry saved, both messages left the
server with no failure logged, and the row is on the Enquiries screen. Whether
they landed in an inbox is the one part only the owner can confirm.


### 2026-08-28 — the soft 404 is fixed, and Block A is finished

**The last open defect is closed.** Every made-up record address now returns a
real **404**, confirmed in a production build:

```
/services/web-development          200   correct
/services/nonsense                 404   was 200
/portfolio/nope                    404   was 200
/case-studies/nope                 404   was 200
/blog/nope                         404   was 200
/blog/category/nope                404   was 200
/blog/category/building-software   200   correct
```

**The loader did not move.** Both `loading.tsx` files are byte-identical to what
they were — checked, not assumed. The owner's instruction was that the brand
loader stays everywhere, and it does.

**This is Option B**, the one that could be built. Option A — `dynamicParams =
false` plus a Vercel deploy hook — is the better shape and needs an account that
does not exist; without the hook, new content would 404 until the next redeploy,
which is a worse bug than the one being fixed. So the check went into the proxy,
which runs before any response begins, and the request is rewritten to a path
with no route — which Next already answers with the styled not-found page **and
a real 404**, the behaviour `/this-page-does-not-exist` has always had. Using
the path that already works rather than inventing a second way to be missing.

Three properties, each measured rather than intended:

- **It costs nothing on any other request.** Five string comparisons, and
  anything else returns before a network call exists. The home page, `/pricing`
  and a real service page all still serve in 60ms.
- **It fails open**, and prefers a stale list to none. The failure being
  prevented is a dead address answering 200; the failure it must never create is
  a live one answering 404.
- **One fetch, not twenty.** Requests arriving together share the in-flight
  lookup; the answer is cached for a minute.

**The suite has no skipped tests left.** The 404 test was written *skipped* on
the day the defect was found and became a real assertion on the day it was
fixed. **205 browser tests, 205 passing.**

**And with that, Block A is finished.** Foundation, the public site, the 3D
layer, the admin panel — and no code remaining that does not need an account, a
payment, a legal opinion, or content nobody has written yet. Everything held
back for production is in one file, **[launch.md](launch.md)**, on the owner's
instruction.

### 2026-08-28 — a theme flash I had caused, found by a broken measurement

**The site flashed the wrong theme on every page load**, for anybody who had
chosen one: **dark → light → dark over about 50ms**, with two view transitions
and an unhandled rejection each time. Exactly the failure the blocking head
script exists to prevent.

**I introduced it this morning**, refactoring the theme provider to satisfy the
React Compiler. The old version applied the theme only in response to an actual
change; the new one applied `resolved` from an effect — and during hydration
`useSyncExternalStore` deliberately serves the **server** snapshot, "system" and
light. So the first thing that effect did was overwrite the correct paint with a
placeholder, and the real value arrived a frame later and animated back.

**The first measurement said there was no flash, and the measurement was
broken.** A mutation observer installed from an init script never attached —
`document.documentElement` does not exist that early — so it reported no
changes, and I wrote "the hypothesis is wrong" into this file on the strength
of it. Attached properly, it showed the flash on the first run. Corrected above.
**A measurement that returns nothing and a measurement that ran are different
things**, and the difference is one line of proof.

**Two attempted fixes were wrong before the third was right**, and both were
caught by measuring rather than by reasoning:

| Attempt | What happened |
|---|---|
| Skip the first effect run | **Made it worse.** React Strict Mode invokes an effect, cleans it up and invokes it again on the same mount — so the "second" run was still the placeholder. It applied light and stayed there |
| Skip when the attribute already matches | Same failure, same reason |
| **Read the truth in the effect** | The effect reads `localStorage` and the media query directly instead of trusting the render. It cannot see a placeholder because it does not look at one |

Measured after: **zero attribute changes after the head script, zero view
transitions, zero errors**, correct theme with either preference stored.

**And the unhandled rejection is handled.** `startViewTransition().finished`
rejects with `AbortError` whenever a transition is skipped — which is normal, it
means the cross-fade was not needed — and with nothing attached Next logged it
as an error every time.

**`setMode` no longer applies the theme itself.** Storage is the source of
truth, the write happens, the store notifies, the effect applies. Two places
writing that attribute is two places that can disagree about whether to animate.

**One more flake, made stable the same way as the last.** The theme spec's
pointer click on the toggle hung about once in fifteen under parallel load —
the same signature as the mobile menu's links, and the same outcome when driven
any other way. Measured directly: a real click on that control completes in
under a second, with view transitions on **or** off, so that hypothesis is ruled
out too. The spec now activates the control from the keyboard, which is also a
path nothing else covered. Twenty consecutive passes.

**The underlying pointer hang is still not explained**, and is written up as an
open question rather than smoothed over — it has now appeared on two unrelated
controls.

### 2026-08-28 — contrast, in both themes, and a flake chased properly

**Two standing rules met here and neither had anything checking it.** Ground
rule 8 is "both themes everywhere"; the accessibility pass on 2026-08-27
recorded contrast as "measured, not eyeballed" — measured **once**, by hand,
which is a state that rots the moment a colour token moves. And the whole
browser suite otherwise ran in a single theme, so a rule that only broke in dark
had nothing looking at it.

`e2e/contrast.spec.ts` now walks **every public page in both themes**, computes
the WCAG ratio for every element that paints its own text, and holds it to AA:
4.5:1 for body, 3:1 for large. **27 checks, all passing.** The site's colour
tokens are still doing what they were chosen to do.

**The background is the hard part**, and worth stating: almost every surface
here is a translucent tint over the one beneath it, so taking an element's own
`background-color` would compare text against `rgba(0,0,0,0)` on nearly
everything and pass the lot. It walks up to the first opaque ancestor instead.

**The focus ring is measured too** — named in testing.md as the thing text
contrast was checked and a focus outline never was. It is the one piece of
colour a keyboard user depends on completely and the one invisible to anybody
testing with a mouse.

**Then the spec failed once, and that took the rest of the time.** One run
reported a set of footer links on `/case-studies` in dark at 2.59:1.

- Re-run in isolation: **six passes in a row.**
- Measured directly, the same links on three pages: identical colours,
  `rgb(152,165,182)` on `rgb(7,9,12)` — **7.88:1**, comfortably passing.
- The suspicion was a theme flash: the head script paints dark, then hydration
  briefly renders light. A mutation observer reported no changes at all, and
  this file recorded the hypothesis as ruled out.

  **That was wrong, and the measurement was broken.** The observer was
  installed from an init script, before `document.documentElement` existed, so
  it never attached — and "no changes" was the sound of nothing watching. Run
  again with the observer attached properly, the truth came out immediately:
  **dark → light → dark over about 50ms, with two view transitions.** The flash
  was real all along, and the entry below is what came of chasing it.

So the reading was of a state the page passes through rather than one it rests
in, and **the cause is still not understood.** What is certain is that a real
contrast failure does not go away in three hundred milliseconds — so the spec
now takes two readings and reports only a failure present in both.

That is a technique, not a tuning. A single reading was a coin toss, and a spec
that fails once in twenty teaches people to re-run it rather than read it — the
same argument as the seventeen dev-server failures earlier today. The unexplained
part is written into [testing.md](testing.md) as an open question rather than
smoothed over.

**205 browser tests now**, 204 passing and one skipped by design.

### 2026-08-28 — the speed rule finally has a number

**Ground rule 5 says "Lighthouse mobile 90+ on every public page", and nothing
had ever measured it.** `npm run check:weight` now does — not Lighthouse, which
needs a stable machine to mean anything, but the input that ruins the score most
often and most silently: how much JavaScript the page ships.

| | Every public page, at 390px |
|---|---|
| **225 KB** | JavaScript **over the wire**, compressed — what a phone on a slow connection pays for |
| **807 KB** | the same JavaScript **decoded** — what the device has to parse |
| **374–485 KB** | everything else included: HTML, CSS, fonts, images |

**The measurement confirmed the 3D design's own claim.** `/` and `/services`
carry a WebGL scene; `/contact` and `/blog` do not — and all four weigh
**exactly the same at first load**. three.js is behind `next/dynamic` with
`ssr: false` and arrives after hydration, where it roughly doubles the page
(1694 KB decoded) but costs nothing before the page is usable. That was written
down as the intent months ago; it is now a fact somebody has checked.

**The budgets are 350 KB and 700 KB**, set with headroom rather than at today's
numbers. A budget that fails on the next honest addition is a budget somebody
raises without looking. These are meant to catch a step change — a dependency
landing in the initial bundle, or a dynamic import quietly becoming a static
one — which is exactly the failure that would take three.js off its lazy path
and nobody would notice.

**It is a script, not part of `npm run test:e2e`**, and deliberately: that suite
runs against `next dev`, whose chunks are unminified and carry the whole HMR
runtime. A budget measured there is a number about the dev server.

**Two things worth recording about getting the number**, because both cost time:

- **Next 16 with Turbopack does not print the First Load JS columns** the older
  build output had. The authoritative figure is not available from the build, so
  it comes from the browser instead.
- **The first two attempts disagreed — 807 KB against 313 KB — and neither was
  trustworthy.** `response.body()` cannot be read back reliably once navigation
  has finished, so it silently undercounts. `request().sizes()`, awaited, is the
  one that holds. Nothing was written down until the two agreed.

**What this still does not say**: 807 KB of JavaScript to *parse* is the half
that costs a slow handset its time rather than its data, and no Lighthouse run
has happened on a real device. That is on the click-through list, and it is the
open half of ground rule 5.

### 2026-08-28 — a delete dialog that was lying about seven columns

**The last item on testing.md's unit-test list, and it found a real bug on the
way.** 224 unit tests now.

`mediaUsageMap` is what lets the media library's delete confirmation say "this
is the header image on two case studies" instead of "are you sure". It matters
more than most confirmations do: every media foreign key is
`on delete set null`, so **deleting an asset never fails** — it silently blanks
an image somewhere. That sentence is the only thing between the owner and the
damage.

**Its list of places to look was missing seven of seventeen.** The schema has
seventeen columns referencing `media`; `MEDIA_REFERENCES` named ten. Absent:

`site_settings.favicon_id` · `site_settings.og_default_id` ·
`pages.og_image_id` · `blog_categories.og_image_id` · `technologies.logo_id` ·
`testimonials.avatar_id` · `seo_defaults.default_og_image_id`

Deleting a file used as the **favicon**, or as a page's social image, would have
said "used nowhere" and blanked it. Now all seventeen are listed, each with a
phrase that says what the asset *is* rather than which column holds it.

**It was found by writing the coverage test, not by reading the list.** The test
parses the migrations for `references company.media(id)` and compares — the
migrations being the only place the relationship is written down, since the
generated types record that a column is a `uuid` and not what it points at.
Both directions are checked, and there is a guard on the parser itself so a
change in the migrations' shape fails loudly rather than passing by finding
nothing.

The counting and the wording moved to `lib/media/usage.ts` to be testable at
all, which is now the fourth time that split has paid: `retention`, `sources`,
`filename`, and this.

**What the counting has to get right**, both of which are in a sentence somebody
reads before pressing delete:

- Two case studies using one image is **"2 × a case study's header image"** —
  one phrase with a number, not the same phrase twice. A dialog that repeats
  itself reads as a bug and gets dismissed unread.
- A column whose read **failed** is skipped, never counted as zero. "Used
  nowhere" about a column nothing could speak for is the one wrong answer that
  matters, because it is the sentence somebody deletes on.

**testing.md's unit-test list is now empty.** All five items done, and three of
them found something.

### 2026-08-28 — the schemas, the filename, and a helper written twice

**Items 2, 3 and 5 of testing.md's list, done.** 213 unit tests now, from 173
this morning.

**`safeFilename` moved somewhere a test can reach it.** It was private inside
`actions/media.ts`, and a `"use server"` module may only export async
functions — so it could not be tested at all. It is now `lib/media/filename.ts`,
and it is worth the ten tests because it does two jobs and both are about not
being lied to:

- The name becomes part of a URL and part of a bucket key. `../../etc/passwd`,
  `/absolute/path`, a query string, a fragment, a backslash — all of them are
  the same character to the rule, and the tests say so by name rather than
  trusting the regex to be read correctly.
- The extension comes from **what the bytes are**, never from what the file was
  called. A JPEG named `.png` is stored as `.jpg`.

Plus the edges: a name of nothing but punctuation becomes `image` rather than a
bare `.png`, an accent flattens instead of dropping the word, and the 80-character
cap lands on the stem so the extension is never eaten.

**The pricing cross-field rule is pinned**, along with four patterns. The rule
mirrors a check constraint — a published plan needs a price or the custom-quote
switch — and mirroring it is what turns `new row violates check constraint` into
a sentence beside the field that caused it. Both directions are tested,
including that a **draft** may be saved with neither, because a plan is written
before its price is decided.

`SLUG_PATTERN`'s expression is now asserted literally, because the database
enforces the same one and the two must stay identical: a form that accepts what
the database refuses is worse than one that refuses too much.

The two link patterns are tested for the failure that is invisible in a form and
obvious on the page: `example.com` with no scheme is a **relative** link, so it
resolves against this site and 404s.

**And a helper that existed twice.** `aspectLabel` in `asset-preview.tsx` and
`ratioLabel` in `image-fields.ts` were the same reduction with different caps —
32 and 40 — so the same file could be described two ways in two places of one
admin. `aspectLabel` moved next to `ratioLabel` and now delegates to it, keeping
only the part that is genuinely its own: a vector has no pixel size, and "Scales
to fit" is the true answer rather than a dash.

**One of these tests was wrong before the code was.** The delegation test
expected `1600 × 1000` to read "16:10"; the reduction gives "8:5", which the
existing `ratioLabel` test had said all along. The test was corrected, not the
function — worth writing down, because the opposite is the easy mistake.

### 2026-08-28 — the record mappers, both ways

**The four remaining mapper pairs are tested** — pricing, FAQs, team and media —
which was the first item on testing.md's "unit tests worth writing" list and had
been for weeks. 187 unit tests now.

Every content screen is the same two pure functions: a row turned into the
form's values, and validated values turned back into columns. They are short,
and they are **the place a column gets silently dropped** — a field left out of
the second one is a field the owner edits, saves, and watches revert, with
nothing failing anywhere.

Two things are checked, and the second is the one that keeps working after
today:

- **The round trip.** A full row through both functions comes back as itself,
  including the shapes that are easy to lose: a cleared price staying `null`
  rather than becoming `0` — the difference between "ask us" and "free" on a
  price card — a cleared optional field stored as absent rather than as a blank
  string, and a renamed file's address being rewritten to match.
- **The coverage.** Every column in the generated database types is either
  written by the mapper or named in the test as deliberately not editable, with
  the reason. That catches what a round trip cannot: a **new** column, added by
  a migration, that no form has ever offered. A round trip passes happily,
  because it only tests the columns somebody remembered.

**Nothing was wrong.** All four mappers are complete and correct, which is worth
recording as a result rather than as an absence — and they cannot now quietly
stop being. Proved by removing `github_url` from the team mapper: three tests
failed and one of them named the column.

The same shape as the backup's table list, and for the same reason. Both are
lists that have to stay in step with a schema nobody edits by hand.

### 2026-08-28 — the mechanical half of accessibility, automated

**Sixteen accessibility checks, on every public page, on every run.** Not a
replacement for the screen-reader pass — that is still on the list and still
needs ears — but the half a machine can do is now done by one, so the human half
stays about judgement instead of about counting alt attributes.

What every page is now held to:

| | |
|---|---|
| `<html lang>` | A document with no language is pronounced in whatever voice the reader happened to be using |
| Exactly one `<main>` | Two is worse than none — "skip to main" becomes ambiguous |
| `alt` on every image | Empty is fine and marks a picture decorative; **absent** makes a reader say the file name aloud |
| No positive `tabindex` | One of them reorders the tab sequence of the whole page for everybody |
| Heading levels never skip downward | h1 → h3 tells somebody navigating by heading that a level is missing |

Plus three specific things: every control on the quote form reachable by its
label, the skip link being the first thing a Tab reaches **and actually moving
focus into `#main`** — which is the half of a skip link that is usually broken —
and the FAQ accordion opened and closed **from the keyboard**, with
`aria-expanded` following and the previously-open panel closing.

**No new dependency.** An axe-core integration would find more and would also
be a package nobody chose, which `privacy-rules.md` is explicit about. These
use Playwright's own accessibility queries and plain DOM checks, and they cover
the failures that actually happen here. Adding axe is a good idea and it is the
owner's call.

**The site passed every structural check on the first run.** Nothing missing,
nothing out of order, on thirteen routes. That is worth writing down: the
accessibility pass done on 2026-08-27 held, and now it cannot quietly stop
holding.

**One test was wrong before the site was.** The accordion check first used
`getByRole("button", { expanded: false })` — a locator that stops matching the
moment the button opens, so it silently re-resolved to a *different* question
and failed against a button nobody had pressed. A locator whose meaning changes
under the test is a test that reports on the wrong element. Held by
`aria-controls` instead.

### 2026-08-28 — the category archive, and a page with no h1

**`/blog/category/[slug]` is built**, the last route in the specification's list
that did not exist. All four categories prerender.

**Built before there is anything to put in it, on purpose.** Every one of these
pages is empty today — nothing is published — and that was the reason to leave
it, which is exactly why it was worth doing now: the moment a post exists, the
category on it is a link a reader will follow, and a route that arrives the week
after the writing does is a route that ships broken. It was also *linked from
nothing*, which this fixes: the category in a post's breadcrumb is now a link,
which is the one place a reader is already thinking about the subject rather
than the post.

**It reads the same two cached queries the index does** and filters in memory
rather than asking the database for a third list. The site will not have
thousands of posts, and the part that matters is that the index and the archive
can then never disagree about what is published.

**The post card became a shared component.** `PostCard` and its meta line moved
out of the `blog_list` section into `components/blog/post-card.tsx` — the same
extraction the portfolio and case-study cards went through, for the same reason:
two nearly-identical grids of posts drift, and the one that drifts is the
archive nobody opens as often as the index.

**And it shipped with a real defect, caught the same hour.** The page had **no
`<h1>` at all**. `SectionHeading` renders `h2` — correctly, because everywhere
else it sits underneath a page heading — and this page used it as its own title.
A document with no first-level heading is invisible to somebody navigating by
heading and reads as a fragment to a search engine, and it is completely
invisible on screen: the text is the same size either way.

`SectionHeading` now takes a level, defaulting to `h2`, and this page passes
`h1`. A level rather than a second component, because the styling is identical
and the difference is structural.

**It was caught because the browser suite asserts exactly one `<h1>` per page**,
and the new route was added to that list before it was declared done. That
assertion was written weeks earlier for other pages; this is the first time it
paid.

The archive is now walked at all six widths too, in its **empty** state — which
is the state a reader will actually meet for a while.

**One thing it inherits:** `/blog/category/anything-made-up` answers 200 like
every other dynamic route. It is the same soft 404 as §1.1 and is covered by the
same skipped test, which now names it.

### 2026-08-28 — FAQs told to search engines, and the last duplicated component

**Two of the three things still open in "Still to do in phase 1" are done.**
Both were listed as small; both turned out to be worth more than that.

**The `FAQPage` graph moved into the FAQ section itself.** It was on `/pricing`
alone: that page read its own sections, found the FAQ one, pulled out its scope
and built the graph. It worked — and it meant the home page and the contact
page **showed questions and told search engines about none of them**, because
emitting the graph was something a developer had to remember per route.

The section that renders the questions now declares them, from the same `items`
array, in the same render. Three consequences, and the third is the one that
matters most:

- It cannot be forgotten. Any page carrying an FAQ has one.
- It follows the content. A section the owner removes takes its structured data
  with it; one they add brings it along, with nobody editing a route.
- The two cannot disagree about which questions the page shows — which is the
  mismatch that gets a rich result penalised: claiming answers the page does
  not display.

Measured before and after. `/` went 0 → 1, `/contact` 0 → 1, `/pricing` stayed
at exactly 1 (the old per-route wiring was deleted, not left beside the new
one), and `/about`, which has no FAQ section, stayed at 0.

A browser test pins all four, and asserts the harder thing as well: **the first
question the graph claims is visible on the page.**

**And the two public forms stopped carrying their own copy of `Field`.** Three
implementations of one component existed — `components/ui/field.tsx`, and a copy
each in the contact and quote forms — and all three did the same thing: generate
an id, wire the `aria-describedby` chain, render a label, a hint and an error.
The kind of duplication where the fix lands in one of them.

The quote form's copy had one extra prop, `name`, used for nothing but choosing
a class. The shared component already takes `className`, so it went. The one
layout exception it encoded — the long description field opting out of
`min-w-0` — now gets `min-w-0` like everything else, and the responsive suite,
which checks `/request-a-quote` for sideways scroll at six widths, is the exact
guard for that.

A test was added for the forms too: every field reachable by its **label**,
through the accessibility tree, because a label that stops being tied to its
input is invisible on screen and total to somebody using a screen reader.

**Still open in that list:** `/blog/category/[slug]`, which is pointless while
no post is published; a public byline source for posts, which needs a data
decision; and the screen-reader run-through, which needs a person and headphones.

### 2026-08-28 — the scaffold cleared out, and five dependencies removed

**`public/` had Next.js's and Vercel's logos in it.** Served from a company
site, at `/next.svg` and `/vercel.svg`, since the day the project was created
by `create-next-app`. Neither was referenced by anything. Deleted, along with
`file.svg`, `globe.svg` and `window.svg` — `public/` now holds `brand/` and
nothing else. This is ground rule 1 as much as tidiness: third-party branding
sitting on the company's own domain.

**The root `README.md` was still the scaffold's.** The first thing anybody
opening this repository read was a paragraph about `create-next-app` and a set
of links to Vercel's documentation. Rewritten: what this project is, the
standing rules in `docs/` and where to find them, every command with what it
actually does — including that `npm run db:seed` is destructive — and the two
architectural facts somebody needs before touching anything, which are the
cache-tag rule and the three layers of access control.

**Five runtime dependencies removed**, 19 down to 14: `motion`,
`@react-three/drei`, `react-hook-form`, `@hookform/resolvers` and
`@aws-sdk/s3-request-presigner`.

Each was verified by an **import-specific** search rather than a text search.
That mattered: a bare grep for "motion" matches thirty-four times — 
`prefers-reduced-motion`, `duration-[--duration-base]`, `components/motion/` —
and would have kept a large dependency forever on the strength of a CSS class
name. Searching for an actual import statement found none.

**Verified after the removal, not before:** `tsc` clean, lint clean, the build
compiles, 173 unit tests and 152 browser tests pass.

The `@testing-library` group, `@vitejs/plugin-react` and `jsdom` stay. They are
used by nothing today, and they are the one group with a plausible future —
component tests that were planned and never written. They go when somebody
decides those are not coming.

**And a correction.** `THREE.Clock: deprecated` is logged on every page with a
3D scene, and this file listed it as something to fix. It is not ours: nothing
in `src/` constructs one — the only `Clock` in this codebase is a lucide icon on
the contact page — and the call is `new THREE.Clock()` inside
`@react-three/fiber`'s own store. It goes away when that package ships a version
using `THREE.Timer`, which is a reason to upgrade `@react-three/fiber` and
`three` together and deliberately.

### 2026-08-28 — the backup got a schedule, and a test caught its off-by-one

**`/api/cron/backup` runs the same job on a schedule**, so the backup happens
every night rather than whenever somebody remembers. `vercel.json` now carries
both: keep-alive at 03:00, backup at 03:30. Verified live — 401 with no secret,
401 with a wrong one, and with the right one a real upload:
`{"ok":true,"rows":161,"tables":25,"bytes":27008,"pruned":0}`.

**Both the script and the route exist on purpose.** The script needs nothing
but Node and the environment file, which is the property that matters when
something has gone wrong: it runs when the application will not. The route is
the one that actually happens every night.

**What they share is the part that drifts.** The table list moved to
`src/lib/backup/tables.json`, and `tables.test.ts` checks it against the
generated database types — so a table added by a migration and forgotten here
fails a test the moment `npm run db:types` runs, instead of being discovered
during a restore. Proved by removing `leads` from the list: the test failed and
named it.

**Then the test that mattered.** The retention rule was pulled out into a pure
function, `expiredKeys`, precisely because it is the one piece of this whose
failure mode is *deleting a backup that should have been kept* — and it cannot
be tested against a real bucket without risking the thing it protects.

It failed on the first run. The cutoff was built from `now`, which carries the
time of day the job runs; a key carries a date and no time. So a backup dated
exactly thirty days ago compared as *before* a 03:30 cutoff and **was deleted on
the morning of day thirty rather than day thirty-one** — one backup short, every
night, silently. Normalising the cutoff to midnight fixed it. The test was
written before the bug was known and caught it within the hour.

**And the script stopped pruning entirely.** It had a second copy of that rule,
with the same bug. Rather than fix it twice, deletion now belongs only to the
scheduled job: a person running the script by hand — usually because something
has already gone wrong — should not be able to remove a backup at all, and a
second copy of a deletion rule is a second copy that can be wrong.

`listObjects` was added to `lib/storage/r2.ts` rather than a second S3 client
being built beside it, and it pages, because a listing returns at most a
thousand keys and a pruner that silently stopped at the first page would leave
everything past it forever.

### 2026-08-28 — middleware became proxy, and the env files were put in step

**`src/middleware.ts` is now `src/proxy.ts`.** Next 16 deprecated the
`middleware` file convention and printed a warning on every build. The rename is
the file and the exported function; `config.matcher` and every line of behaviour
are untouched.

**It was verified rather than assumed**, because this file is the first layer of
the access model: the whole browser suite ran afterwards — all 21 admin
addresses still redirect to the login screen carrying where they were going, the
sign-in still works, all sixteen signed-in screens still open. **152 passed.**
The build no longer prints the warning.

Six comments elsewhere that said "the middleware" were corrected, including one
in `cache/tags.ts` that described the `redirects` table as "read by middleware"
— nothing has ever read it, which is now what the comment says.

**And a standing rule, on the owner's instruction:** `.env.example` and
`.env.local` carry the same keys, always, in the same sitting. A documented
variable that is not set is a feature that silently does nothing, and the way it
gets discovered is a cron that never ran.

`CRON_SECRET` was the one out of step — added to the example earlier the same
day and never set. **Generated here** (32 random bytes, base64url) and written
straight into `.env.local`; the value was not printed anywhere, including into
this file. Going the other way, `SUPABASE_ACCESS_TOKEN` and
`SUPABASE_DB_PASSWORD` were in `.env.local` and undocumented, so the example now
carries both with a note saying which dashboard page each comes from.

The split is written down: a random secret is generated on the spot, anything
from somebody's account is asked for by name, and a deliberately blank one keeps
the reason beside it. **Two values only the owner can supply** and both are
blank today — the Turnstile pair, which means the public forms currently have no
spam protection, and `SUPABASE_ACCESS_TOKEN`, which only `npm run db:types`
needs.

### 2026-08-28 — the backup and the keep-alive, and a third 404 route ruled out

**Two of the four open risks are closed.**

**`npm run db:backup`** writes every table in the `company` schema to R2 as one
gzipped JSON document, `backups/YYYY-MM-DD.json.gz`, and prunes anything past
thirty days. Run for real: **161 rows across 25 tables, 26 KB gzipped,
uploaded and listed back.** `--local` writes to disk and uploads nothing;
`--list` shows what is in the bucket.

**It is not `pg_dump`, and that is not a compromise.** The risk register said
`pg_dump` and it cannot be what runs: the schedule will be a Vercel cron
function, and **a Vercel function has no `pg_dump` binary in it.** Neither does
this machine. A backup that only works where somebody has installed Postgres
locally is a backup that stops happening the week attention moves elsewhere.

What it saves is everything a person typed. What it deliberately does not save
is the schema, the RLS policies and the auth users — because those are covered
elsewhere and saying so is better than pretending: the schema and policies are
the migrations in this repository, and the accounts are recreated by
`npm run admin:create`. **Migrations plus one of these files is a restore**, and
the file says so inside itself rather than in a document somebody has to find
while things are on fire.

The table list is written out rather than discovered. A table added to the
schema and not added there is a table that silently stops being backed up, and
nobody finds out until a restore.

**`/api/cron/keep-alive`** answers the other risk: a free Supabase project
pauses after seven days idle, and a paused project does not answer — so the
site would go blank a week after the last visitor, which is the week nobody is
watching. Scheduled in `vercel.json` for 03:00 daily.

It runs a **real query** rather than a ping: asking the REST gateway for its
health proves the gateway is up and proves nothing about the database
underneath, which is the thing that pauses. One row of `site_settings` — one
row in the table, already read by every page — through the **anonymous** client,
because a keep-alive should be the least privileged thing in the estate.

Verified live: 401 with no secret, 401 with a wrong one, `{"ok":true,"ms":52}`
with the right one. A browser test asserts the first two, and `/api/revalidate`
alongside it.

**And a third route to the soft 404 was tried and ruled out.** Calling
`notFound()` from `generateMetadata` rather than from the page looks like it
should set the status before anything streams, and it would have cost nothing —
no deploy hook, no request-time lookup, publishing still instant. Implemented on
the services route and measured: **200 in dev, 200 in a production build.**
Next 16 streams metadata instead of blocking the shell on it. Reverted, and
written into [pre-production-cleanup.md](pre-production-cleanup.md) §1.1 so
nobody spends the afternoon on it twice. Options A and B stand, and the choice
is still the owner's.

### 2026-08-28 — the mobile menu was broken on every scrolled page

**Fixed, and it is the most serious thing found so far.** On a phone, opening
the menu anywhere the visitor had scrolled did nothing: the button turned into
an X, the panel mounted, and **nothing appeared on screen.** Every page, every
phone, any scroll past 8px.

**The cause**, established by measurement rather than reading:

- The header carries `backdrop-blur-xl` once the page is scrolled — that is
  the frosted treatment, and it is applied conditionally on `scrolled`.
- **An element with a `backdrop-filter` becomes the containing block for its
  `position: fixed` descendants.** This is a CSS rule with no exceptions and no
  warning.
- The panel was a child of the header, and is positioned `top-16 bottom-0`. So
  its box was measured against a 64px-tall header instead of the viewport:
  `64 − 64 − 0` = **a height of zero**. Measured directly: `height: 0px`, with
  `top: 64px`, `bottom: 0px`, and every child laid out outside its own box.
- Unscrolled, no blur, no containing block, panel 780px tall. Which is why it
  looked fine to anybody who tested it on a page they had just loaded.

**The fix is one line of structure:** the panel is now a **sibling** of the
header rather than a child of it, so its containing block is the viewport
again. `z-40` against the header's `z-50` keeps the header and its close button
above the panel, which is what was always intended. Measured after: 780px at
both scroll positions.

**How it was found**, which is the part worth keeping. A browser test clicked a
link in that panel and timed out. The first assumption was a flaky test; it was
not. Reverting each of the day's changes in turn ruled them out one at a time,
a screenshot showed the panel simply absent, and reading the computed box —
`height: 0px` — gave the answer in one line. **Three assumptions were wrong
before the measurement was right**, which is the argument for measuring.

**Two regression guards**, both at 390px:

- The panel opens to a real height — asserted at scrollY 0 **and** at 600,
  because only one of those was ever broken and the working one is what made
  it look fine.
- `> 600px`, not `> 0`. A panel a few pixels tall would pass "greater than
  zero" and still be useless.

**One thing is not understood and is written down rather than papered over.**
Playwright's synthetic pointer click on a link inside the panel hangs. The link
navigates correctly when activated from the keyboard or from script — the panel
closes, the URL changes, no errors — so it is not the menu. The navigation test
uses the keyboard, which also covers a path nothing else here checked, and
**tapping the menu on a real phone is on the click-through list** in
[testing.md](testing.md).

**Also fixed on the way:** `data-scroll-behavior="smooth"` on `<html>`. Next
prints a warning about this on every build — without it, a route change
animates a scroll to the top instead of jumping, which on a long page takes the
better part of a second and reads as the click not having worked. Anchor links
within a page still scroll smoothly, which is what the CSS rule was for.

### 2026-08-28 — lint clean, from eleven problems to none

`npm run lint` reported 11 problems — 7 errors and 4 warnings — for weeks, all
pre-existing, all documented as "they will block CI the day CI exists". They
are gone, and three of the five fixes made the code better rather than merely
quieter:

| What | Fix |
|---|---|
| `services-grid`, `tech-stack`, `what-we-build` — an unused `index` | Removed. Three one-word diffs |
| `header-nav` — a dead `onClose` prop on the mobile panel | Removed, with a note saying why the panel deliberately has no close button of its own |
| `header-nav` — a scroll listener calling `setState`, plus a call to its own handler on mount | `useSyncExternalStore`. It is a browser value being subscribed to, which is exactly what that hook is for — and the first render now has the answer instead of a second render correcting it |
| `header-nav` — an effect closing the panel on every navigation | The panel's state is now the path it was opened on, the same idiom the admin shell already used for its drawer. A comparison instead of an effect |
| `theme-provider` — a mount effect reading `localStorage` and setting two states | Two external stores — the stored choice and the OS preference — with the resolved theme **derived** during render. It was a third piece of state kept in step by hand in four places |
| `wave-scene`, `vision-scene` — mutating a `Float32Array` in `useFrame` | Exempted at the file level, with the reason. This is how react-three-fiber works: the buffer is GPU memory and the point is to mutate it in place rather than allocate megabytes a second. The compiler's own `"use no memo"` does not silence this rule, so the exemption is stated once with its reasoning instead of three bare disables |

**The theme provider was refactored behind a test, not in front of one.** Five
browser specs were written first — the control offers three modes, a choice
applies to the document, it survives a navigation and a reload, system mode
follows the OS live, and the login screen outside the admin shell carries a
theme too. They passed against the old implementation, then against the new
one. Ground rule 7 is "both themes everywhere" and nothing was checking it.

### 2026-08-28 — the admin, signed in, and the bug a wrong guess found

**The admin click-through was never as blocked as this file said it was.**
`.env.example` has carried `ADMIN_EMAIL` and `ADMIN_PASSWORD` from the
beginning — "so end-to-end tests can sign in without anyone typing a password
from memory" — and both are filled in on this machine. [testing.md](testing.md)
claimed the opposite for weeks. Corrected there.

So the harness grew a signed-in half: a `setup` project that signs in once and
saves the session, and an `admin` project that reuses it across **all sixteen
screens**, the sidebar, the command palette and a preview pane. **145 tests
now**, one of them deliberately skipped.

**Read-only, completely.** There is one Supabase project and no staging copy of
it, so a suite that created or saved anything would be a suite editing the
company's real content on every run. Nothing clicks save, delete or duplicate.
Signing out is not tested either, and for a specific reason: `signOut()` revokes
the account's refresh tokens, so it would end the session the tests running
beside it are using.

**Then the interesting part.** The first service-slug list in the spec was
written from memory and got three of seven wrong — `ui-ux-design`,
`ai-integration` and `maintenance-and-support` do not exist; the real ones are
`ai-development`, `seo` and `digital-marketing`. **All seven passed anyway.**

A made-up address was answering 200.

| Address | Status | |
|---|---|---|
| `/services/web-development` | 200 | correct |
| `/services/nonsense-slug` | **200** | should be 404 |
| `/portfolio/nope` | **200** | should be 404 |
| `/blog/nope` | **200** | should be 404 |
| `/case-studies/nope` | **200** | should be 404 |
| `/this-page-does-not-exist` | 404 | correct — no route matches |

Confirmed against a **production build**, not just the dev server. The page
renders correctly — the title is "Not found" and the body says so — and only
the status is a lie. Which is the worst version: a soft 404 keeps a dead
address indexed and re-crawled for months, and every slug the owner ever renames
leaves one behind.

**The cause was established by experiment rather than reasoning.** Moving
`app/(site)/loading.tsx` and `app/loading.tsx` aside and rebuilding made every
one of those addresses return a real 404; putting them back restored the 200.
The Suspense boundary they create flushes the shell before the page component
reaches `notFound()`, and a status cannot be changed once bytes have been sent.
Both files were restored immediately — the probe left nothing behind.

**The loader is not what moves.** The owner restated it the same day, and it is
absolute: *"brand loader hi sab jagah chalega… yahi loader sab jagah rahega"* —
one loader, this one, on every route of every project. So the fix has to come
from the other side, and both real options are written up with their costs in
**[pre-production-cleanup.md](pre-production-cleanup.md) §1.1**:
`dynamicParams = false` plus a deploy hook, or a slug check in the proxy before
rendering starts. The first is the recommendation. **It needs the owner to
pick**, because either one changes how published content reaches the site.

**The same bug weakens the admin's permission boundary**, which is worth
stating separately because it is not an SEO problem. `requireMenu()` answers
`notFound()` for a screen somebody may not open, precisely so that it is
indistinguishable from a route that does not exist — and the boundary above it
serves that refusal as 200 while a genuinely missing address is served as 404.
The body is identical, so nothing is disclosed outright, but the two are
distinguishable, which is exactly what the code says they must not be. §1.1b.

Recorded as a **skipped** test rather than a failing one or none at all. A test
that fails on every run trains people to ignore red; a test that does not exist
is a defect nobody is tracking. It becomes a real assertion by deleting one
word.

**And a new document, on the owner's instruction:**
**[pre-production-cleanup.md](pre-production-cleanup.md)** — everything to fix,
delete or rotate before launch, from an actual scan rather than memory. Five
unused dependencies (`motion`, `@react-three/drei`, `react-hook-form`,
`@hookform/resolvers`, `@aws-sdk/s3-request-presigner`), five scaffold SVGs in
`public/` including **Next.js's and Vercel's logos**, a root `README.md` that is
still create-next-app boilerplate, one source file nothing imports, six database
columns nothing reads, the test account to delete, the passwords to rotate, and
the warning that `npm run db:seed` **deletes rows** and would erase the owner's
content if it were ever run after launch.

### 2026-08-28 — the browser harness, and seventeen failures that were not bugs

**`npm run test:e2e` runs 123 tests in a real Chromium**, and it is the first
evidence this project has had that is not a build log. It was a script with
nothing behind it until today — exactly as `npm test` was before
`vitest.config.ts` — and a command that fails loudly is better than one that
passes by finding nothing.

**Green from a cold cache, in about two minutes.** What it walks:

| Spec | Tests | What it pins |
|---|---|---|
| `public-pages` | 22 | Every public route answers 200, has **exactly one** `<h1>`, and carries a title and a description. Plus a real 404, and every raster image on the home page declaring its size |
| `responsive` | 73 | Nothing scrolls sideways on twelve pages at 360, 390, 768, 1024, 1280 and 1440. Plus the mobile menu opening, navigating and closing |
| `admin-guard` | 23 | All 21 admin addresses turn into the login screen when signed out, carrying where they were going. Plus the panel being `noindex` whatever the crawl switch says |
| `seo` | 5 | robots.txt, the sitemap and the meta tags agreeing **with each other**, in whichever state the switch is in. Plus absolute canonicals, one Organization graph, and a social card that is a real image |

**Nothing in it needs a password**, which is the whole reason it exists in this
shape. The admin click-through needs a signed-in session and the test account's
password is not in `.env.local` by design, so rather than build a suite that
skips half of itself by default, the half a machine can do was separated out
and made to run everywhere. The other half stays a person's job, written up in
[testing.md](testing.md).

**Two rules it holds itself to.** It never asserts the words on a page — every
page is assembled from rows the owner is about to fill in, and a suite that has
to be edited each time a sentence is reworded is a suite that gets deleted. And
where a state is legitimately either way, it asserts **consistency** rather than
a value: the crawl switch will be flipped on launch day, so the SEO spec reads
the current state and checks that robots.txt, the sitemap and the meta tags all
say the same thing about it.

**The first run failed seventeen tests, and not one was a bug in the site.**
The Next dev server compiles a route the first time it is asked for, and a
browser arriving mid-compile is handed a document while it is still streaming —
so an assertion about a `<meta>` tag timed out on pages that were correct
seconds later. Confirmed rather than assumed: the same pages passed against a
warm server, and a direct DOM probe found the tag present and in `<head>`.

The fix is `e2e/global-setup.ts` — every route fetched once, sequentially, in
plain HTTP before any browser opens. **Raising the timeout would have hidden it
rather than fixed it.** A flaky suite is worse than no suite: its green means
nothing and its red gets ignored, which is how a real failure ends up being
re-run until it passes.

**What it found about the site: nothing.** Twelve pages at six widths, and not
one horizontal scrollbar — [responsive-rules.md](responsive-rules.md) has been
held to. One `<h1>` everywhere. Every admin route guarded. The only thing worth
writing down is a console notice from three.js: `THREE.Clock` is deprecated in
favour of `THREE.Timer`. Harmless today, and it will become a build error at
some version.

Files: `playwright.config.ts`, `e2e/` (four specs, a shared route list, the
global setup and a README). `npx playwright install chromium` is needed once on
a new machine. **No migration, no dependency added** — `@playwright/test` has
been in `devDependencies` since the beginning, waiting for this.

### 2026-08-28 — the command palette, and the last item in the admin standard

**Ctrl+K opens a palette**, and with it the admin visual standard in spec §15.3
has nothing outstanding. It does two things in one box, and the split between
them is the design rather than an implementation detail.

**Screens and actions are instant**, filtered in the browser. The menu is
already in the page — the shell was handed it, resolved on the server, to draw
the rail — so "take me to the pricing screen" costs one keystroke and no
network at all. There is no reason for the common case to wait on a round trip
it does not need.

**Records are searched on the server**, across eleven tables: enquiries, pages,
navigation links, services, portfolio, case studies, posts, plans, questions,
team and media. Each contributes at most five rows, all of them queried in
parallel, and a table that fails is skipped rather than failing the search — a
palette that returns nothing because one table was slow is worse than one that
returns most of the answer.

**Which tables are searched is decided by the caller's own menu, re-resolved on
the server on every call.** Never passed in from the browser. RLS refuses most
of it underneath, but "most" is not the standard: an editor who cannot open the
enquiries screen must not be able to read a lead's name out of a search box,
and which screens a person may reach is a question this codebase answers in one
place.

**Each result opens at the address that screen's own list uses.** A palette that
linked to a record differently from the list would be a second way to reach one
thing, and the two would drift — so those addresses are pinned by tests. Two of
them are not obvious: a navigation link carries its menu, because that screen
filters by one and would otherwise open on the header and fail to find a footer
link; and an FAQ carries an empty page filter, because "every question" is the
only filter guaranteed to contain the one being opened.

**Sign-out is deliberately not in it.** A palette is where somebody types three
letters and presses Enter without reading the row — right for "go to pricing",
wrong for ending a session in the middle of an unsaved form. It stays a button
in the sidebar that has to be looked at to be pressed.

**A trigger in the header, not just a shortcut.** A keyboard shortcut nobody is
told about is not a feature, so the header carries a search box that opens the
same palette and prints the key — `⌘ K` or `Ctrl K`, read through
`useSyncExternalStore` so the server's answer and the browser's differ without
it being a hydration mismatch.

Three details that took a second pass, all from the React compiler's rules,
and all of which left the code better:

| First attempt | What it became | Why |
|---|---|---|
| `useEffect` watching the query to fire the search | `onChange` fires it, behind a 160ms timer | Typing is an event, and starting a request is what a handler is for. The "searching" flag stops being state set inside an effect |
| `useEffect` resetting the highlight when the list changed | The highlight is stored with the query it was chosen against, and clamped | The same idiom the shell uses for its drawer: state derived from a comparison rather than repaired by an effect |
| `useState` + `useEffect` to detect a Mac | `useSyncExternalStore` | The purpose-built hook for reading a browser value without a hydration mismatch |

**The `or` filter is assembled from user input, so the input is stripped
first.** Commas separate PostgREST's conditions and parentheses group them, so a
query carrying either would be read as more filters rather than as text. That is
the shape an injection takes here, and there is a test for each character.

**A finding, which corrects this file's own note from earlier today.**
`default_og_image_id` should stay unwired, and not merely because nothing reads
it: `src/app/(site)/opengraph-image.tsx` already gives every public route a
social card, and fifteen routes override it with one carrying their own name and
summary. An explicit `openGraph.images` key suppresses that file-convention
merge — `lib/seo.ts` says so in a comment — so feeding a chosen picture into
`buildMetadata` would replace fifteen per-page cards with one static image
everywhere. The column is redundant, not unfinished. Wiring it would have been
three lines that made the site worse.

Verified: `tsc --noEmit` clean, `npm run build` compiles, `npm run lint` reports
nothing in the new files, and **161 tests pass** — 24 new ones over the result
addresses, the row labels and the filter escaping. **Not yet opened in a
browser**; the click-through is written up in [testing.md](testing.md).

Files: `lib/search/sources.ts` (the descriptors, pure and testable) and its
test, `lib/actions/search.ts` (the queries), `components/admin/command-palette.tsx`,
and three lines in `components/admin/shell.tsx`. **No migration.**

### 2026-08-28 — the gallery repeater, and a rule that had to learn an exception

**`projects.gallery` and `case_studies.screenshots` are editable.** They were
the last two content columns on this site that a person could not reach from the
admin, and the reason they were left is that they hold a *list* of pictures
rather than one — the picker handles a single choice.

**It needed no new machinery at all.** The field vocabulary already had a
`repeater`, and the repeater already rendered whatever fields it was given,
including an `image`. Composing the two produces rows of
`{ media_id, caption }`, which is exactly the shape both columns already stored.
The whole feature is two descriptors, two mappings and two entries in the
declared-size table. This is what the descriptor vocabulary was for, and the
first time it has paid the debt.

**One rule genuinely had an exception, and pretending otherwise would have been
worse.** Every image field on this site declares an exact pixel size *and shape*,
and the picker warns — naming both numbers — when a chosen file is a different
shape. But gallery pictures render through `NaturalImage`, which flows a picture
at its own size and never crops or letterboxes it. A tall phone screen beside a
wide dashboard is the **feature** there. Left alone, the picker would have
warned about every portrait screenshot, and a warning that fires on correct
input is a warning people learn to ignore — which then costs them the eight
fields where the shape genuinely matters.

So `ImageFieldSpec` gained `shapeFree`, and it is deliberately narrow:

| | A framed field | A shape-free field |
|---|---|---|
| Wrong shape | warns, naming both numbers | says nothing — there is no frame to be wrong against |
| Too small | warns; will be drawn small with space around it | **the same warning.** `NaturalImage` never enlarges either |
| Hint printed | `1600 × 1000 px (16:10)` | `1200 × 750 px or wider — any shape` |

The second row is the point: the flag turns off the half of the rule that does
not apply and leaves the half that does. Printing `(8:5)` on a gallery field
would have stated a requirement that is not one.

**`readGallery` was written twice.** Identical copies in `project-detail.tsx` and
`case-study-detail.tsx` — the arrangement where a fix lands in one of them. It is
now one function in `lib/media/gallery.ts`, beside `galleryToJson`, which is the
writer. The two live together on purpose: what the form writes has to be what the
page reads, and a picture that is saved and never appears is a failure that looks
exactly like the save having worked. There is a round-trip test that says so.

**A row with a caption and no picture is refused**, at the form and again at the
mapping. The page's own reader drops such a row, so allowing it to be stored
would mean a caption that was saved, reported as saved, and never rendered.

**A deleted file drops out of the gallery on its own.** Already true — the page
looks each id up and skips what it cannot find — and now worth stating, because
the admin can create that situation in two clicks.

The two admin screens also lost the notes that said the gallery "is not here
yet".

Verified: `tsc --noEmit` clean, `npm run build` compiles, `npm run lint` reports
nothing in the touched files, and **137 tests pass** — 16 new ones across the
gallery document and the shape-free rule, including that the same portrait file
is accepted by a gallery field and still warned about by a framed one. **Not yet
opened in a browser**; the click-through is written up in
[testing.md](testing.md).

Files: `lib/media/gallery.ts` and its test, two entries and one flag in
`lib/media/image-fields.ts`, a fieldset and two mappings each in
`lib/records/projects.ts` and `lib/records/case-studies.ts`, and the six files
that now import `readGallery` from one place. **No migration** — both columns
have been `jsonb not null default '[]'` since 2026-08-26.

### 2026-08-28 — the SEO screen, and the switch that takes the site live

**`/admin/seo` is built**, and with it the admin menu has no *Not built* entry
left. `seo_defaults` is one row that decides three unrelated things — what a
page is called when it does not name itself, what search engines are told about
the company, and whether this site may be indexed at all — and all three are now
a form rather than a migration.

It is the **settings shape, not the list shape**: one column, one form, one save.
This is configuration, not a set of records, and the three-column list would be
three columns with nothing in two of them.

**A live search-result preview.** The title template, the fallback title and the
fallback description are the only controlled fields on the panel, and they have
to be: the preview underneath them claims to show what a result will look like,
and a preview that updates on save is a record rather than a preview. The
character counts turn amber past 60 and 160 and never refuse a save — Google
truncates on pixel width, so the numbers are guides, and a title of 62 words
that earn their place beats one of 60 counted into shape.

**The preview cannot drift from the site.** `applyTemplate` was private to
`lib/seo.ts`; it moved to `lib/validation/seo.ts` as `applyTitleTemplate`, and
`buildMetadata` and the preview both call it. A second copy of that rule would
have made the preview a guess, and a preview that is a guess is worse than none
because it gets believed. The validation module was already client-safe, which
is what made this the cheap fix rather than a refactor.

**The template must contain `%s`.** `buildMetadata` returns the page title
unchanged when the placeholder is missing — the safe behaviour, and a silent
one: the suffix would vanish from every tab on the site with nothing having
failed. The form refuses it and says why.

**The crawl switch is drawn as two choices and asks before it saves.** A
checkbox labelled "site noindex" asks somebody to hold a negative in their head
and answer it backwards, on the one control where being wrong is expensive in
both directions. Two cards, each saying what happens, cost more space and remove
the ambiguity. The confirmation is not because the change is destructive — it is
one boolean and it flips back — but because it is the only control in this admin
whose effect is on somebody else's system: opening the site starts an indexing
process nobody here can call back, and closing it takes down every page already
indexed. The screen also states the current state in a banner before the form,
with links to `/robots.txt` and `/sitemap.xml`, because that is the one fact
somebody might come to this screen only to read.

**A pasted `<meta>` tag is refused as a verification code.** Both Google and Bing
hand over a whole element, pasting the element is the obvious mistake, and the
failure is completely silent — the site advertises a token that is a fragment of
HTML, verification never completes, and nothing anywhere says why. One regular
expression, one sentence.

**The Organization override is offered, with the warning it needs.** It replaces
the generated graph outright rather than merging into it, which is what
`structured-data.ts` documents and why that column ships empty. An array or a
bare value is refused rather than coerced: spreading an array into the
Organization node produces numeric keys — a graph that parses, describes nothing,
and looks fine in the form.

**Three columns are deliberately not on the form.** `default_og_image_id`,
`ga_measurement_id` and `gsc_property` are read by nothing on the site. The same
rule the navigation screen applied to `icon` and `badge_text`: a form that
collected them would be a form whose values never reach a page. The og image is
the one worth wiring next.

**The permission is the menu, not a role.** `seo` is grantable — an owner can
hand it to whoever writes the copy — so the action checks `canReach(…, "seo")`
rather than `isOwner`, matching the sidebar the person was shown.
`seo_defaults_staff_write` refuses the write at the table regardless.

Verified: `tsc --noEmit` clean, `npm run build` compiles and lists `/admin/seo`,
`npm run lint` reports nothing in the new files, and 16 new unit tests cover the
schema, the template and the override parser — **121 tests pass** in total.
`/robots.txt` served from the dev server still reads `Disallow: /`, which is the
current pre-launch state the screen's banner reports. **Not yet opened in a
browser**, which [testing.md](testing.md) records rather than glosses over.

Files: `lib/validation/seo.ts`, `lib/actions/seo.ts`,
`app/admin/(dashboard)/seo/` (page, form, skeleton), the one function moved out
of `lib/seo.ts`, and the `planned` flag removed from the menu. **No migration** —
`seo_defaults` and its `seo_defaults_staff_write` policy have been in place
since 2026-08-26.

### 2026-08-28 — the navigation screen, and the first admin list that is a tree

**`/admin/navigation` is built.** The header, the three footer lists and the
dropdown underneath a header link are now edited by someone who has never seen
the code: the label, the address, which menu it belongs to, what it is nested
under, whether it opens in a new tab, and whether it is shown at all. The seeded links
were previously changeable only by re-running the seed script.

It is the same three columns as the other seven content screens, from the same
shared components, with two differences that come from what a menu is rather
than from taste.

**A menu filter on top.** `nav_items.sort_order` is one number across five
locations, so a single list of every link would mean the arrows swapping a
header link with a footer one — two rows that never appear together, leaving
the arrows looking broken in both places. Filtered to one menu, every arrow
moves something the person can see move. The same reasoning the FAQ screen's
page filter is built on, and the same pill row, deliberately.

**The list is a tree.** A link inside a dropdown is indented and moves only
among the other links of that dropdown. That needed two new optional properties
on the shared `RecordList` — `group`, which decides where the arrows stop, and
`depth`, which indents — rather than a second list component. Every other screen
passes neither and behaves exactly as before: one group, arrows disabled at the
first and last row.

**Three rules the database cannot state, so the action does.** The depth trigger
in `20260826000003_site_content.sql` catches only the first of them, because it
fires on the row being written and the rows that would end up too deep are not
the row being written:

| Rule | Why it cannot be a constraint | What happens instead |
|---|---|---|
| A parent must be in the same menu as its child | `location` is on both rows; a constraint would need to read the other one | Refused, with a message naming the parent's menu |
| A link that already has a dropdown cannot go into one | The rows that become three-deep are the children, not the row being saved | The parent select is emptied, and a posted request is refused |
| A link that changes menu takes its dropdown with it | Nothing cascades a column value | The children are updated in the same action, and the toast says how many moved |

A link that changes menu or parent is also placed at the **end** of the list it
has joined. Keeping the number it had in the list it left would drop it into the
middle of the new one at a position nobody chose.

**The preview is the real header, or the real footer.** Not a drawing of the
links in a column. A menu has exactly one interesting failure — it stops fitting
— and a mock-up is the one rendering guaranteed never to show it. The dropdown
opens on hover in the preview as it does on the site, and the pane's phone-width
button shows the mobile panel. Because these are the public components, they
read through the cached anonymous query and hidden links are absent, which is
the truth being previewed.

**Two columns are deliberately not offered.** `icon` and `badge_text` exist on
the table and nothing renders them — not the header, the dropdown, the mobile
panel or any of the three footer lists. A form that collected them would be a
form whose values never reach a page, which is the worst kind of field because
it looks like it worked. They go in when something renders them.

**`mobile` is offered even though nothing renders it.** It is a value of the
`nav_location` enum, and hiding it would make any row already stored under it
unreachable — a link nobody can find and nobody can delete. It is listed with a
label and a note that say it appears nowhere.

Verified: `tsc --noEmit` clean, `npm run build` compiles and lists both
`/admin/navigation` and `/admin/preview/navigation`, `npm run lint` reports
nothing in the new files (the 7 errors and 4 warnings it does report are all
pre-existing, in `services-grid`, `tech-stack`, `what-we-build`, `header-nav`,
`theme-provider`, `vision-scene` and `wave-scene`), and 13 new unit tests cover
the four shape helpers — 105 tests pass in total. **Not yet opened in a
browser**, which [testing.md](testing.md) records rather than glosses over.

Files: `lib/records/navigation.ts` (descriptors and the four pure shape
helpers), `lib/queries/navigation-admin.ts`, `lib/actions/navigation.ts`,
`app/admin/(dashboard)/navigation/` (four files plus a skeleton),
`app/admin/preview/navigation/page.tsx`, and the two new properties on
`components/admin/record-list.tsx`. **No migration** — `nav_items` and its
`nav_items_staff_write` policy have been in place since 2026-08-26.

### 2026-08-27 — accounts, roles as master data, and the per-person menu

**`/admin/users` is built, in two tabs on one screen.** People and Roles are one
subject — deciding what somebody may do means moving between "what is this
person" and "what does that role mean" several times a minute — so they are two
tabs rather than two menu entries, and the roles tab lists who holds each role
beside the switches that change them.

**Roles became master data, on the owner's instruction.** They were a Postgres
enum and three lists of role names written into RLS helper functions. They are
now `company.roles`: a label, a description, an authority rank, three capability
flags and a default menu, per row, all edited from the admin. `profiles.role`
stopped being an enum and became a foreign key into it.

The reason an enum was the wrong shape: every new value is a migration, and a
value can never be renamed because it is stored in every row that uses it. A key
with a label beside it can be renamed on screen a hundred times and mean the
same thing underneath.

- **The three RLS helpers now read the table.** `is_staff()`,
  `can_manage_leads()` and `is_owner()` join `company.roles` and read a flag
  instead of matching a list of names. A role invented in the admin panel is
  therefore honoured by every policy in the schema the moment it is saved, with
  no migration and no deploy.
- **`can_manage_leads()` also reads the per-person menu.** The standing rule's
  own example is "a senior employee who also handles enquiries". Granting that
  person the screen while the helper read only their role would have handed them
  a working page listing nothing — a worse answer than refusing the page, since
  they would report that there are no enquiries and be believed.
- **Two safety nets in the database, not only in the form.** A trigger refuses
  to delete a system role or change its key; a deferred constraint trigger
  refuses to leave the estate with no active role that can manage accounts.

**The per-person menu.** `profiles.menu_extra` and `profiles.menu_denied` hold
the *difference* from the role's default menu, never a snapshot of it. That is
the whole design decision: a stored list would mean that adding a screen to the
panel next month silently never reaches anybody whose menu was saved before it
existed. Storing only the difference means a new screen reaches everyone whose
role should have it, without touching a row. A check constraint refuses to hold
a key in both arrays at once, and the resolver fails closed if one ever appears
in both anyway.

**Three layers, and each is real.** `requireMenu(key)` replaced `requireStaff()`
on every admin page including the eight preview routes: a screen not in your
resolved menu answers with a 404, not a refusal — a refusal confirms the screen
exists and that somebody else can reach it. RLS refuses the rows underneath
whatever the route decides. The middleware is still the weakest of the three,
deliberately.

**The accounts screen is not a grant that can be given.** Handing somebody
`/admin/users` is handing them every other screen — they could raise their own
role and take the rest — so it is tied to the role's `is_owner` flag and cannot
appear in anybody's extras, whatever is written into the column by hand.

**Passwords.** Generated, never chosen: twenty characters from an alphabet with
no `0`/`O` or `1`/`l`/`I` in it, grouped in fives so it can be transcribed from
an email or read down a phone. Supabase stores only the hash, so from the moment
it is sent nobody — including the owner who pressed the button — can read it
back. It is emailed; it appears on screen **only** when the email could not go
out, with a copy button and a line saying it cannot be recovered. Resetting
issues a new one to the account's own address rather than letting an owner type
one, because an owner who types a colleague's password knows it.

**Blocking is one switch and it is never a deletion.** It refuses to let you
block yourself, to block an account that outranks you, or to block the last
account that can manage accounts. Same three refusals on the role editor.

**`/admin/account`** is the one screen no owner can take away: everybody who can
sign in reaches it, it shows what they are and what they reach, and it changes
their own password after confirming the current one. Linked from the name in the
sidebar rather than from the menu, because the menu is a list of things that can
be taken away and this is not one of them.

**Verified:** `tsc` clean, `npm run build` clean, **92 tests passing** (up from
65 — 27 new ones covering menu resolution, the grant/deny round trip, the
owner-only screen, a role that has been deleted out from under an account, and
the rank ceiling), `npm run lint` back at its exact pre-existing baseline of 11
problems in seven untouched files.

**Applied the same day.** The owner ran both migrations and regenerated the
database types; `tsc`, the 92 tests and the build were re-run against the live
schema and are clean. Nothing about this entry is waiting on anybody.

**Not verified:** none of it in a browser. See [testing.md](testing.md).

### 2026-08-27 — image fields, and the bug that would have blurred every small picture

**All nine image fields are wired**, and with them the second half of
[image-rules.md](image-rules.md). A service's social image, a portfolio
thumbnail and social image, a case study's header, a post's featured and social
images, a team photo, and the two logos in settings — each declared in one
table, each printing the exact size it wants before a file is chosen.

- `src/lib/media/image-fields.ts` — the one table of declared sizes, plus
  `describeFit()` (does this file suit *this field*) and `assessQuality()` (is
  this file any good at all). Both pure, both tested.
- A tenth field kind, `image`, in the descriptor vocabulary. Its value is a
  media id validated against the assets the form actually offered, so a posted
  request naming something else is refused rather than written.
- `MediaPicker` — the control. It says the size before the folder of
  photographs is opened, draws every thumbnail in a box at the *field's* ratio
  so a wrong-shaped file shows its empty edges at the moment of choosing, and
  warns naming both numbers. It never blocks.
- Settings is not a descriptor form, so the two logos get a small `LogoPicker`
  that holds the choice and writes it into a hidden field — the same shared
  `MediaPicker` inside, so it behaves identically to the other nine.

**And a real bug, found while wiring it.** The site was about to do exactly what
the owner had warned against. `object-contain` on a `size-full` image does not
mean "draw it at its own size" — it means "scale it until it fits", **up as well
as down**. A 400px logo in a 1200px frame would have been blown up to 1200px and
gone soft, and nothing about the markup looked wrong.

Fixed by making the natural size a ceiling, so the browser may only ever scale
down. `src/components/media/image.tsx` holds the two components — `FramedImage`
for a fixed-shape box, `NaturalImage` for one that flows — and **every stored
image on the public site now goes through one of them**: the portfolio card, the
case study card, both blog cards, the team portrait, and the four free-standing
images on the detail pages. Vectors are exempt and must be; an SVG's viewBox
size is a couple of dozen units and capping a logo at 24px would ruin the one
format that scales perfectly.

Two related things went with it:

- **Every `object-cover` on a photograph became `object-contain`.** With a
  correctly-sized file the two are indistinguishable; they differ only when the
  file is the wrong shape, and then `cover` silently cuts the edges off while
  `contain` leaves visible space. A crop nobody can see is worse than a gap
  everybody can, because only one of them gets fixed.
- **The hover zoom on card images was removed.** Scaling a photograph inside a
  clipped box enlarges *and* crops it for as long as the pointer is on it —
  both of the things the rules forbid. The cards already lift and their borders
  strengthen on hover, which carries the interaction without touching the
  picture.

**Warnings, in all three places a file can be chosen** — the upload form, the
picker on every content screen, and the media library — from one
`assessQuality()` and one `QualityNote` component, so the same file is never
described two different ways. The wording of the "too small" case is asserted by
a test: it must say the picture will look *small*, not blurry, because the page
has already made blurry impossible, and a warning about a problem the code
prevents teaches the owner to distrust the warnings that are real.

**Verified:** `tsc` clean, `npm run build` clean, **65 tests passing** (up from
22 — `describeFit`, `assessQuality`, the ratio labels and the declared-size
table are all covered), `npm run lint` back at its exact pre-existing baseline
of 11 problems in seven untouched files.

**Not verified:** none of it in a browser. See [testing.md](testing.md).

**Still open:** `projects.gallery` and `case_studies.screenshots` are lists of
images rather than one, so they need the picker to become a repeater.

### 2026-08-27 — the media library

**The storage half is done.** Files upload, are stored, are served, and are
managed at `/admin/media`. The image *fields* — the picker each form uses to
choose one — are the next piece and are not built yet.

| Piece | Where |
|---|---|
| R2 over the S3 API | `src/lib/storage/r2.ts` |
| Format and dimensions, read from the file's own bytes | `src/lib/media/image-file.ts` |
| Upload, rename, delete | `src/lib/actions/media.ts` |
| Serving, with a year of immutable cache | `src/app/media/[...slug]/route.ts` |
| The screen | `src/app/admin/(dashboard)/media/` |

**Uploads go through the server, not through a presigned URL.** A presigned PUT
handed to the browser is a window during which anyone holding that string can
write into the bucket, with no size or type check on the far side of it. Here
the bytes arrive at a Server Action, are checked, and are written with a key
this code chose. The access key never leaves the server. `next.config.ts` raises
`serverActions.bodySizeLimit` to 9MB for this — the action itself refuses
anything over 8MB with a sentence beside the field, and the extra megabyte is
headroom for multipart encoding overhead, which the framework counts and the
file size does not.

**The format and the size are read from the file, never from the browser.**
`File.type` is a guess from the extension — renaming `notes.txt` to `photo.png`
is enough to make a browser claim `image/png` — and every "this field wants
1200 × 800" check in [image-rules.md](image-rules.md) is measured against the
dimensions. So `image-file.ts` parses the header itself: PNG's IHDR, GIF's
logical screen, JPEG's segment chain, all three WebP payload chunks, and an
SVG's `width`/`height` or `viewBox`. No dependency, five formats, and anything
else is refused at upload.

That parser is the piece everything else rests on, so **it has tests** — the
first in the repo. `vitest.config.ts` was added (there was none, despite the
`npm test` script), and `src/lib/media/image-file.test.ts` asserts each format
against headers assembled byte by byte in the test, plus the four committed
brand SVGs and the apple touch icon read off disk. 22 tests, all passing. Two of
them exist because of specific ways a header parser goes wrong: a 32-bit PNG
width read without `>>> 0` becomes negative, and a JPEG's Huffman table marker
sits inside the start-of-frame range and must not be read as a size.

**The preview column is where the image rules are enforced rather than
described.** Every file is shown whole — `object-contain` in a box that takes
the file's own aspect ratio — never cropped, never covered, and never wider
than its natural width, so a 400px logo in a 700px column shows 300px of empty
space and that emptiness is the truth. It is shown twice, on white and on
near-black: a transparent PNG and an SVG with dark strokes each look perfect on
one and invisible on the other, and a logo is the asset most likely to be both.

**Other decisions worth keeping:**

- **The bucket stays private.** No r2.dev domain, no custom domain. Every file
  is read back through `/media/<id>/<filename>`, which looks the row up before
  handing anything over. The cost is a hop through the app; the benefit is that
  a client's asset is not a public URL the moment it exists.
- **A key is never reused.** Replacing an image is a new upload with a new id,
  so a file at a given address is immutable and cached for a year. The old row
  stays reachable for anything still pointing at it.
- **Renaming is cosmetic.** The address carries the filename for anyone reading
  the link, but only the id in front of it resolves.
- **Alt text is asked for at upload** and the table refuses a row without it.
  The only moment anyone reliably knows what an image shows is the moment they
  choose it.
- **The delete dialog says what it will break.** `mediaUsageMap()` counts all
  ten foreign keys that name `media` in ten queries — not ten per file — so the
  confirmation can say "this is a team photo and the light logo" rather than
  "are you sure". Every one of those columns is `on delete set null`, so a
  delete never fails; it silently blanks an image somewhere, which is exactly
  what a confirmation is for.
- **No duplicate button.** `RecordList.actions.duplicate` became optional for
  this: a second copy of the same bytes under a second address is not what
  anyone pressing it would expect.

**Verified:** `tsc --noEmit` clean, `npm run build` succeeds with `/admin/media`
and `/media/[...slug]` both listed, `npm test` green at 22 tests, and **the R2
credentials were exercised end to end** — a real PNG put, read back byte-for-byte
identical with its content type and cache header intact, deleted, and confirmed
gone. `npm run lint` reports the same 11 problems in the same seven pre-existing
files; none is new.

**Not verified:** the screen itself in a browser as a signed-in user — the
upload form, the preview column in both themes, the delete dialog. Same gap as
the three screens below, and the same first job next session.

### 2026-08-27 — pricing, FAQs and team, and the skeleton layer

**The last three content lists.** With these, every kind of content on the site
is editable from the panel: services, portfolio, case studies, the blog,
pricing, FAQs and team. Each one is what the pattern promised — a descriptor
file, an admin query, an actions file and a screen that wires them together —
and almost nothing new was written in `components/admin`.

| Screen | Table | Order | Preview |
|---|---|---|---|
| `/admin/pricing` | `pricing_plans` | arrows, left to right | the whole row of cards |
| `/admin/faqs` | `faqs` | arrows, **within one page** | the accordion for that page |
| `/admin/team` | `team_members` | arrows, grid order | the whole grid |

**The previews show the group, not the record**, and that is the one real
departure from the four screens before these. A service and a case study each
own a page, so previewing one is previewing a page. A price card, a question and
a team member do not — they are read *beside* the others. A price that looks
generous alone looks thin next to the card beside it; the second answer in an
accordion is written differently if the first already covered half of it; the
order of a team grid is read as seniority whether or not it was meant that way.
Previewing one card would have hidden the only thing worth checking, so all
three previews render the whole group, drafts included and marked, with the row
being edited outlined.

To do that without a second implementation of each card, two components were
lifted out of their sections: `components/pricing/plan-card` and
`components/team/member-card`. Each is now the card *without* the list item
around it, so the public section wraps it in a `Reveal` and the preview wraps it
in something that can carry a "not on the site" marker. The public sections were
rewritten to use them and render identically — verified against a running
`/pricing`, which still draws all six plans with their figures.

**The FAQ screen has a filter no other screen needs.** `faqs.sort_order` is one
number across every page, while the order that matters is the order *within* a
page. Listing all fourteen questions at once would have meant the arrows
swapping a pricing question with a contact one — two rows that never appear
together, so the arrows would have looked broken on both pages. The screen
filters by page, and the move action takes that page as a bound argument so the
swap happens against what is actually on screen. A question that serves three
pages appears under all three; that is the feature, not a duplicate.

**Details worth keeping:**

- A new plan is created as a **draft priced by the brief**, not as a draft with
  no price. The table refuses to publish a plan carrying neither a figure nor
  the custom-quote flag, so starting it in the one state that cannot be
  published would be starting it broken. The same constraint is restated in the
  schema, so breaking it comes back as a sentence beside the price rather than
  as a constraint violation nobody can read.
- Duplicating never carries the thing that must not be copied: a plan's
  highlight (two cards wearing "most asked for" is two cards saying nothing) or
  a profile's LinkedIn (a duplicate is nearly always a template for a different
  person, and a link that says otherwise is a card claiming to be someone else).
- `faqScopeOptions()` unions the three page scopes, every service slug, **and
  any scope already stored**. Without the third, opening a question attached to
  a renamed service and saving it would silently drop that scope, because the
  checkboxes would not have offered it back.
- `team_members.photo_id` is deliberately absent from the form, and the screen
  says so. The card renders without a photo, so a profile is complete and
  correct before the media library exists.

**The skeleton layer**, asked for by the owner mid-build and now a standing
rule. `components/ui/skeleton` is the primitive — `Skeleton`, `SkeletonText`,
`SkeletonCard`, `SkeletonCardGrid` and `SkeletonRegion` — and
`components/admin/screen-skeleton` composes the two admin shapes from it: the
three-column content screen and the stacked panel screen. Every admin route now
has a `loading.tsx` drawing its own shape rather than a generic block, and the
preview pane draws a card grid behind its frame until the frame reports itself
loaded, instead of the blank rectangle that used to read as the preview having
broken.

Two tokens were added for it — `--skeleton` and `--skeleton-sheen` — rather than
reusing surface steps, because the surface scale inverts between the themes: a
higher number is darker in light and lighter in dark, so a skeleton built from
`surface-2` and `surface-3` would sweep a highlight in one theme and a shadow in
the other. The sweep is a translated band, so only transform animates; under
reduced motion the global rule lands it off the right-hand edge and leaves a
still block, which is the correct degraded state.

**Three rule documents were written**, because all three came from the owner as
standing instructions that bind the task tracker and the demos too, not only
this repo: [image-rules.md](image-rules.md),
[responsive-rules.md](responsive-rules.md) and
[loading-rules.md](loading-rules.md).

**Verified:** `tsc --noEmit` clean. `npm run build` succeeds and lists
`/admin/pricing`, `/admin/faqs` and `/admin/team`. All six new routes return 307
to the login screen when signed out, so the staff guard is on every one of them.
`/pricing` still renders every plan and its figure after the card was extracted;
`/about` still omits the team section entirely while `team_members` is empty.
`npm run lint` reports problems in seven files, none of them new or touched
here — `services-grid`, `tech-stack`, `what-we-build`, `header-nav`,
`theme-provider`, `vision-scene` and `wave-scene`, all from the React compiler
rules.

**Not yet opened in a browser as a signed-in user.** The three screens have not
been clicked through, or checked in both themes and at phone width. That is the
first thing to do next session — the four screens before these were each checked
that way, and these three should not be the exception.

### 2026-08-27 — the blog, posts and categories

The fourth content list, and the first that is two record types rather than one.

| Route | What it is |
|---|---|
| `/admin/blog` | Posts. `?post=<id>` selects one |
| `/admin/blog/categories` | Categories, two columns |
| `/admin/preview/post/[id]` | The article as a reader would see it, drafts included — staff only |

**The preview earns its place here more than anywhere else on the panel.** The
body is markdown, and the only way to know how a heading, a list or a code block
came out is to see it rendered by the renderer the site actually uses — parsed
into typed nodes and emitted as React elements, never injected as HTML, so a
pasted article cannot run script or break the page for readers.

**The first two-column screen.** Categories are a name and a sentence with no
page of their own, so the standing rule applies: the third column is dropped and
the first two keep their positions. The layout narrows; it does not rearrange.

**Three columns are deliberately not on the post form**, each for its own reason.
`reading_minutes` is set by a database trigger from the body at 200 words a
minute — a figure typed by hand stops being true the next time a paragraph is
added. `author_id` points at `profiles`, which is closed to the anonymous role,
so a byline would embed as null on the live site; posts go out under the
company's name until `team_members` becomes a public-safe author source. And the
two image columns wait for the media library.

**Deleting a category does not delete its posts.** The foreign key is `on delete
set null`, so it uncategorises them — the list carries a post count for exactly
this reason, and the confirmation quotes the number rather than asking a vague
question. Renaming one clears more than itself, too: a category's name appears
in the breadcrumb of every post filed under it, so the action reads those slugs
and clears each post's own cache tag by name rather than hoping the blog tag
covers it.

**A textarea can now be told how tall to be.** Four rows is right for a
paragraph of copy and wrong for a whole article; `rows` is a field descriptor
now, and the body uses 24.

**Verified against the live database and the real renderer.** `tsc --noEmit`
clean, lint clean, `npm run build` succeeds with all three new routes. Then, with
the service key: the two-field create, the full column set the mapper produces,
`reading_minutes` confirmed to recompute on save (1 on an empty body, 3 once the
article was written) and `published_at` confirmed to be set by the trigger. The
published post was then fetched from the public route — title, excerpt, category
breadcrumb, the contents list, headings, list items, bold, inline code, tag chips
and the reading time all render, and the raw `## First section` markdown does not
appear anywhere in the HTML. Separately: a category with one post filed under it
was deleted, and the post survived with `category_id` null. Every row was removed
afterwards.

### 2026-08-27 — R2 configured, and the bucket is private

The owner created the bucket and handed over the credentials. They are in
`.env.local` and verified: a signed `ListObjectsV2` against
`apka-vission-storage` returns 200, and the bucket is currently empty.

**The bucket is private, and that is a design decision rather than a setting to
undo.** There is no public r2.dev domain and no custom domain in front of it, so
nothing in R2 is reachable from the internet directly. Every reference to a
public bucket URL has been removed — from `.env.local`, from `.env.example`, and
from the `serverSchema` in `src/lib/env.ts`, which no longer knows the variable
exists.

**What that means for the media library, which is next:**

- Files are uploaded from the admin with the S3 API, signed server-side. The
  access key never reaches the browser.
- Files are read back **through this application**, not from Cloudflare. A route
  either streams the object or issues a short-lived signed URL, after deciding
  whether the person asking may see it.
- `media.public_url` keeps its name and changes its meaning: it holds this
  site's own path to the asset, not an R2 address. The brand SVGs already work
  this way — they are site-root paths under `public/brand/` — so nothing in the
  reading code has to change.

The cost is one hop through the app instead of straight off a CDN, and a caching
policy that has to be set deliberately. The benefit is that an asset uploaded for
a client's private project is not a public URL the moment it exists, which for a
company that will host client work in the same bucket is the correct trade.

### 2026-08-27 — case studies, and two bugs the pattern exposed

The third content list, and the first one built almost entirely out of parts
that already existed.

| Route | What it is |
|---|---|
| `/admin/case-studies` | The whole screen. `?study=<id>` selects one |
| `/admin/preview/case-study/[id]` | The write-up as a visitor would see it, drafts included — staff only |

**The first list without reorder arrows.** `case_studies` has no `sort_order`
column: the index is ordered by publication date, newest first. The shared list
takes `move` as an optional action, and this screen simply does not pass one —
arrows that appear to do nothing are worse than no arrows. The admin list is
ordered the same way, except that drafts come to the top rather than the bottom,
because they are what the person opening the screen came to finish.

**Two bugs, both found because a third screen used the shared parts differently:**

*An optional dropdown could not be cleared.* `FieldInput` renders a "Not set"
entry whose value is the empty string, and the schema builder refused the empty
string — so the one choice the control offered for "none" was the one the form
rejected, with "Pick one of the options." It had been live since the section
editor was built and would have hit the icon field on services the first time
anyone cleared it. Optional selects now accept the empty string and store it as
absent.

*A read was about to become an HTTP endpoint.* The three picker lists started
life exported from the `"use server"` actions file, where every export becomes a
callable Server Action. Moved to the query module. RLS would have kept it
harmless, but a list of options is a read and had no business being an action.

**Where the honesty rules live on this table**, since it carries no check
constraints of its own: `results` is nullable and stays null when nothing was
entered rather than becoming `[]` — null says "not measured", an empty array
says "measured, and the answer was nothing". The testimonial picker offers only
quotes with recorded consent, since the table refuses to publish any other kind
and offering one would be offering a dead end. And a duplicated case study does
not inherit the original's testimonial: a quote was given about one piece of
work, and moving it to another write-up unasked is putting words in someone's
mouth.

**Verified against the live database and the real code.** `tsc --noEmit` clean,
lint clean, `npm run build` succeeds with both new routes. The field schema
builder was compiled on its own and put through seven cases — a cleared optional
select, an unknown value, a cleared required select, a bad slug, and an optional
pattern empty, valid and invalid — all seven correct, and a cleared select
confirmed to be stored as absent rather than as `""`. Then, with the service
key: the two-field create, the full column set the mapper produces, `results`
confirmed to become SQL `NULL` when cleared, and `published_at` confirmed to be
set by the trigger on publication. A real published study was then fetched from
the public route — heading, client, industry, duration, problem, solution,
features, the results block with its label, value and note, and the technology
list all render. The row was deleted; nothing was left behind.

### 2026-08-27 — portfolio, and the list column made shared

The second content list, and the one that proved the pattern was real: the
screen is the same three columns from the same components, and what is written
here is the queries and the words.

| Route | What it is |
|---|---|
| `/admin/portfolio` | The whole screen. `?project=<id>` selects one |
| `/admin/preview/project/[id]` | The portfolio page as a visitor would see it, drafts included — staff only |

**The left column is now shared too.** `components/admin/record-list.tsx` — the
rows, the order buttons, duplicate, delete-behind-a-confirmation — with the
per-screen file supplying the wording and saying which Server Actions the
buttons post to. The services screen was moved onto it in the same change, so
there is one implementation rather than two that merely resemble each other.
That is the standing rule enforced by construction instead of by care.

**This table's four honesty constraints are now stated where a person can see
them.** `company.projects` refuses to let a demo name a client, refuses to let
our own products name one, requires real client work to name theirs, and refuses
demo sign-ins and industry variants on anything that is not a demo. All four are
restated as Zod refinements, so the refusal arrives as a sentence under the field
that caused it rather than as `projects_demo_has_no_client` under a red banner.
The constraints stay the authority; the refinements are the explanation.

**Found by testing rather than by reading:** `projects_client_named` is checked
on **insert**, not on publication — a client project with no client cannot exist
even as a draft. The first version of the New item form asked for a title, an
address and a kind of work, defaulted to "Client project", and would therefore
have been refused by the database the very first time anyone used it. The form
now shows a Client field the moment client work is chosen, and hides it
otherwise, because an input that is present but must stay empty is an invitation
to fill it in.

**`demo_credentials` empty must be SQL `NULL`, not `{}`.** The constraint tests
`is null`, and `'{}'::jsonb` is not null — so a blank email and password left on
a client project would have been refused for a reason invisible on screen. The
mapper emits `null`; the check that proved it necessary is in the entry below.

**The three image fields are deliberately absent**, and the screen says so rather
than leaving a gap to be worked out: thumbnail, gallery and the social image all
name rows in `media`, and until the media library exists the only control this
form could offer is a box to paste a UUID into. That is not an editor.

**Verified against the live database.** `tsc --noEmit` clean, lint clean in every
new file, `npm run build` succeeds with both new routes. Then, with the service
key: all five constraints were fired deliberately and each refused by name; the
full column set the mapper produces round-trips; `demo_credentials: {}` was
confirmed to be refused where `null` is accepted. Finally a real published demo
row was created and its public page fetched — heading, type label, sign-in panel,
credentials, problem, solution, features, capabilities, technologies, variants,
both links, year and category all render, and no client name appears on a demo.
The row was deleted afterwards; nothing was left behind.

**Worth knowing:** the portfolio table is completely empty. Every route works
and nothing is published, so `/portfolio` is a working page with no items on it.

### 2026-08-27 — services, and the shape every content list now takes

The first of the seven content lists, built to the standing rule: the records on
the left in the order visitors see them, the selected one as a form in the
middle, and the real page beside it on the right.

| Route | What it is |
|---|---|
| `/admin/services` | The whole screen. `?service=<id>` selects one |
| `/admin/preview/service/[id]` | The service page as a visitor would see it, drafts included — staff only |

**Most of the work was deciding what the other six inherit.** A screen built
only for services would have been half the size and would have been rewritten
six times.

- **`lib/records/`** — a record is described in the *same* field vocabulary a
  section's content is, from `lib/sections/fields.ts`. A service's summary and a
  hero section's subheading are the same kind of thing to the person typing
  them, so they are the same kind of thing to the code. What a record adds is a
  fieldset: presentation only, no effect on the schema, the stored shape or the
  paths errors are reported at.
- **`components/admin/record-form.tsx`** — the editor column for any record.
  The whole record is one piece of state, every control writes into it by dotted
  path, and the lot posts as a single JSON field which the Server Action parses
  against the schema built from those same descriptors. Written once; the other
  six screens supply descriptors and copy and nothing else.
- **`lib/validation/records.ts`** — the action state, the slug rule and the
  first-error-per-field helper, in one place rather than seven.
- **`components/admin/preview-pane.tsx`** — the page builder's preview pane,
  lifted out and given a `path` prop. Two previews that behave differently would
  be two things to learn.
- **`components/services/service-detail.tsx`** — the public service page,
  lifted out of its route so the admin preview renders *the page* rather than a
  drawing of it. The routes now differ in one thing only: the public one reads
  cached and anonymous, the preview reads uncached as the signed-in user, which
  is what lets a draft be looked at at all.

**Twenty-one columns, all editable, none of them typed twice.** Identity, the
page's own heading, the three lists the page is built from, the technology
picker, pricing, publication and the search-engine fields. `body` is left out
deliberately — the column exists for long-form blocks and nothing renders it
yet, and a form that writes a column no page reads teaches the owner their work
is being ignored.

**The rules the database holds are stated in the form as well.** The slug
pattern is the check constraint's own expression, shared from one constant. The
`services_pricing_present` constraint — a published service needs a starting
price or the custom-quote switch — is restated as a Zod refinement so the
refusal arrives as a sentence under the field that fixes it, and the Postgres
error is still handled underneath in case the row is changed another way.

**Row actions sit on the row:** reorder up and down, duplicate, delete. Delete
asks first, through the shared dialog, and the question offers archiving
instead — that takes the service off the site just as completely and keeps the
words. A duplicate is a draft at the end of the order at the first free `-copy`
address, and it deliberately does not inherit the original's SEO title or
canonical URL: two pages telling search engines they are the same page is worse
than two pages.

**Every write clears three caches, through `INVALIDATION_MAP.service`** — the
service's own page, the services index and the home page whose grid reads the
same list — plus the old slug when a service is renamed, because the cache under
the previous address is otherwise left holding a page that is no longer served
there.

**A technology switched off can no longer be dropped by accident.** The public
technology list is cached and read anonymously, so RLS hands it only the active
rows; saving a service against that list would silently discard any id the
checkboxes no longer offered. The admin reads the full set through the session
client instead, and the Server Action validates against that same set.

**Verified against the live database**, not only against the compiler:
`tsc --noEmit` clean, `npm run lint` clean in all the new files (the five
pre-existing React-compiler errors in `header-nav`, `theme-provider`,
`vision-scene` and `wave-scene` are unchanged), `npm run build` succeeds with
both new routes present. A throwaway row was then put through the real write
path with the service key: the exact column set the mapper produces round-trips,
`published` with no price is refused by name, the same row with a price is
accepted, and the row was deleted afterwards. `/admin/services` and the preview
route both refuse an anonymous request and redirect to the login screen.

**Found while doing it, and it is data rather than code:** not one of the seven
services has a single entry in `technology_ids`, so the "stack behind this
service" block has never rendered on any service page. It is a few ticks per
service on the new screen.

### 2026-08-27 — the page builder

The screen that makes "everything is dynamic" true for a non-developer rather
than true in principle. Create a page, add sections to it, reorder them, hide
one, edit every word — and watch the result beside the form as you do it.

| Route | What it is |
|---|---|
| `/admin/pages` | Every page including drafts, with a **New page** form |
| `/admin/pages/[id]` | Sections on the left, the selected section's form in the middle, a live preview on the right, page settings underneath |
| `/admin/preview/[id]` | The page as it will look, drafts included — staff only |

**One description per section type drives three things.** `lib/sections/fields.ts`
defines nine field kinds; `lib/sections/definitions.ts` describes all nineteen
section types in them. From those descriptors come the Zod schema the Server
Action validates against, the form the admin sees, and the shape the component
reads. The registry's own note asked for exactly this — "the admin form fields
are generated from those same schemas, so the work is not duplicated" — and the
descriptor is the direction that holds: introspecting a Zod schema recovers
neither labels, nor help text, nor field order.

Nine kinds cover everything: text, textarea, number, boolean, select, list,
checkboxes, group, repeater. Groups and repeaters nest, which is what a story's
paragraphs, a legal document's clauses and a CTA's button all need.

**Content is submitted as one JSON field, and trusted no more for it.** Encoding
a repeater inside a group inside an array into `FormData` names means writing a
parser for them on the way back out — a second place for the shape to be
decided. The JSON is parsed against the schema derived from the same
descriptors the form was rendered from, and Zod's error paths (`features.1.title`)
are the same strings the inputs are addressed by, so a server-side message
lands on the input that produced it.

**A latent bug, found while building the background control.**
`page_sections.background_variant` was written by the seeder and by the admin —
and never read. The renderer passed only `content`, and every section reads
`content.background`, so a section marked "muted" in the database rendered with
its default background and nothing said otherwise. The renderer now merges the
column into the content it hands the component, which settles which of the two
wins and makes the control in the builder mean something. Sections that had
been silently rendering wrong since they were seeded now render as intended.

**Live preview, and it is the real page.** The preview pane is an iframe on
`/admin/preview/[id]`, which renders through the same `SectionRenderer` the
public route uses — not a second implementation that can drift. It refreshes
when a save reports success, not on every keystroke: each refresh is a server
render of the whole page, and a preview that flickers while you type is worse
than one that settles when you save. It has a phone-width toggle, because
responsive is a release blocker (spec §29) and the person writing the heading
is the one who should see it wrap badly.

**Other decisions worth keeping:**

- New sections and duplicates are created **hidden**. A half-filled section
  appearing on the live site the moment it is created is how a placeholder gets
  published by accident.
- Reordering is two buttons, not a drag handle. Drag is the nicer gesture and
  the only one a keyboard cannot perform; when it arrives it goes on top of
  these rather than replacing them.
- A system page's slug is shown but locked. A route in the code reads that row
  by slug, which is the same reason the database refuses to delete one.
- A page created in the admin has no route in the code, and the form says so
  rather than leaving someone to discover a 404.
- The section editor is keyed on the section id, so switching between two
  sections of the same type remounts the form. Without it React reuses the
  component and shows one section's words under another's name.

**Verified in a browser:** the builder loaded with all nineteen types offered;
the eyebrow of the About page's intro was changed from "About us" to "Who we
are"; the preview refreshed in place and showed the new text; `curl` on the
public `/about` showed it too, with no deploy; the value was changed back.
Afterwards all 11 pages still hold their original 45 sections.

`tsc` clean, `eslint` reports nothing in any new file, build green at 52 pages.

### 2026-08-27 — enquiries, end to end

The whole lead pipeline: list, filters, search, detail, status, assignment,
notes, archive, spam, and a CSV export that respects the filters above it.

| Route | What it is |
|---|---|
| `/admin/leads` | Open / archived / spam tabs with counts, search, status and assignee filters, table on desktop and cards on a phone, pagination |
| `/admin/leads/[id]` | The message in full, the brief, notes, the audit trail, contact channels, and the pipeline controls |
| `/admin/leads/export` | The current view as a CSV |

**Filters live in the query string.** A filtered list someone wants to keep
looking at is a link — bookmarkable, sendable, reachable with the back button.
State held in a component survives none of that. Changing any control resets to
page one, because staying on page four of a two-page result set is how a filter
appears to return nothing.

**A real bug, found by using the screen rather than reading it.** Changing a
status wrote to the database — the audit trail below recorded the move — and
the select sprang back to the old value. React resets an uncontrolled field
once its `<form action>` completes, so the screen said the save had failed
while the database said it had worked.

Both selects are now controlled, with the value held optimistically and
reconciled against the server on every render: the server's value wins whenever
it changes, and a refused save reverts to it. The previous values are tracked
in `useState` rather than in refs — a ref read during render is untracked, and
the linter is right to refuse it.

**The same bug was latent in the settings form**, where it would have shown the
pre-save values after every save. Fixed there by `revalidatePath` plus keying
the form on the row's `updated_at`, so a save remounts it with the saved values
in place. Verified by saving a value and watching it stay.

**Nothing on this screen deletes an enquiry.** Archive and spam are both flags,
both reversible from the view they move a row into. Leads are the business
asset; the schema models a soft delete and the admin honours it.

**The CSV guards against formula injection.** A cell beginning `=`, `+`, `-` or
`@` is executed as a formula when the file opens, and `name` and `phone` are
attacker-controlled — a public contact form is enough to put `=HYPERLINK(...)`
on the machine of whoever opens the export. Those cells get a leading
apostrophe. The file also carries a byte order mark, because Excel on Windows
otherwise reads UTF-8 as the system code page and turns every rupee sign and
accented name into mojibake.

**Verified in a browser, with three test leads inserted directly** — not
through the public form, which would have sent two real emails through the
configured SMTP server. The leads were removed afterwards.

| Step | Result |
|---|---|
| List | 3 rows, tabs reading Open 3 / Archived 0 / Spam 0 |
| Search `Clinic` | 1 row, and the search box reflects the URL |
| Filter `status=qualified` | 1 row, and the select reflects the URL |
| Status change | Select holds the new value, header badge updates, trail records "moved it from Qualified to Proposal sent" |
| Assignment | Assigns and clears; trail records both |
| Note | Saved with author and date; the box clears only on success |
| Archive, spam | Flags appear in the header, buttons flip to Restore / Not spam, tabs recount to Open 2 / Archived 1 |
| CSV | Header correct, `view=open` gave 2 rows and `view=archived` gave 1 — the filters are respected — with the status as its label and the phone number apostrophe-guarded |

`tsc` clean, `eslint` reports nothing in any admin file, build green at 51 pages.

### 2026-08-27 — admin panel, first slice

**Authentication, the shell, the dashboard and the settings screen.** Enough of
Phase 3 to sign in and change something real. Settings first among the screens
on purpose: it is the row every "empty by design" note in this file is waiting
on, so filling it in lights up the footer, the contact panel, the email
signature and the Organization schema at once.

| Route | What it is |
|---|---|
| `/admin/login` | Email and password. Static, and the only admin route that is |
| `/admin` | Counters, latest enquiries, published pages missing a meta description |
| `/admin/settings` | Identity, contact, registered address, CIN and GST, social links |

**Three layers of authorisation, and the weakest one first.**

1. `src/middleware.ts` turns anonymous requests away from `/admin` before a
   page renders, and refreshes the Supabase session — a Server Component
   cannot set a cookie, so without a middleware pass the refreshed token has
   nowhere to be written and the owner is signed out mid-edit.
2. `requireStaff()` in `src/lib/auth/session.ts` establishes who is asking.
   The middleware cannot read a profile, so it cannot know a role, an
   `is_active` flag, or whether the account may reach this application at all.
3. RLS, which is the only one that a mistake in the first two cannot bypass.

The middleware skips the Supabase client entirely when no `sb-` cookie is
present, so an anonymous visitor to a static marketing page does not pay for a
token verification round-trip before the page is served.

**A real bug found by signing in.** Authentication succeeded and the next query
failed: `permission denied for table profiles`. The RLS migration granted
`select` on the public-page tables to anon and authenticated together, then
granted `insert, update, delete` on *all* tables to authenticated — and never
granted authenticated the right to **read** the non-public ones. Staff could
write a lead note they could not read back, and could not read their own
profile. Fixed by `20260827000011_staff_select_grants.sql`, which is the
migration named at the top of this file.

That failure also exposed a second, smaller fault, now fixed: the login action
reported a failed read as *"That account does not have access to this admin"*.
Telling someone with a valid, active account that they lack permission sends
them off to request access they already hold, while the real fault goes
unmentioned. A read error and a refusal are now different messages.

**`updateTag`, not `revalidateTag`, for an admin save.** Next 16 has both.
`revalidateTag` serves the stale value while the fresh one loads, which is
right for a background refresh and wrong here: the owner has just pressed save
and will open the site to check. Being shown the previous version reads as the
save having failed.

**Other decisions worth keeping:**

- The menu is data (`src/components/admin/nav.ts`), so one list drives the
  sidebar, the mobile drawer and the command palette when it exists. Routes
  that are specified but unbuilt are listed and disabled rather than hidden —
  the owner should see what this panel is going to be.
- Role visibility is enforced by not rendering, not by CSS. An editor never
  sees lead figures, and `/admin/settings` answers a non-owner with a 404
  rather than a form that refuses to save at the end of filling it in.
- `"use server"` files export only async functions. `initialLoginState` moved
  to `src/lib/validation/login.ts` after the build refused it — a good rule,
  since it makes the endpoint surface exactly the functions you can see.
- The open-redirect check on `next` rejects `//evil.example` as well as
  absolute URLs. A login screen that lands you elsewhere is the classic
  phishing setup.
- `Field` and the input classes moved to `src/components/ui/field.tsx`, shared
  rather than copied a third time.

**Accounts.** Sign-up is disabled at the project, so `npm run admin:create --
--email you@example.com --name "Your Name"` is the only way one exists until
`/admin/users` is built. It creates the auth user with its email pre-confirmed,
raises the profile from the trigger's conservative `editor` default to the
requested role, and prints a generated password once. Re-running it on an
existing address fixes the role rather than duplicating the account.

A test account exists: `kumarnitish4384@gmail.com`, role `owner`. Delete it
from the Supabase dashboard before launch.

**A second bug, found by using the screen rather than reading it.** The
settings form saved, the footer updated — and the `Organization` JSON-LD did
not. `seo_defaults.organization_schema` overrides the generated graph outright,
by design: an admin editing that field is saying the generated version is wrong
for them. But the **seeder had filled it in**, with values `site_settings`
already held. The result was a frozen graph — an owner could fill in a phone
number, an address, a CIN or a social profile and none of it would ever reach a
search engine, with nothing on screen to say why.

Fixed in three places: the seeder no longer writes it, the column was cleared,
and `buildOrganizationSchema` now emits `slogan` from the tagline and
`description` from the SEO default, so nothing the override carried is lost.
The field stays available for the case it was built for.

The general lesson is worth keeping: **seeding a value into an override column
is not the same as seeding content.** An override that duplicates live data
does not look wrong in the database and silently disables the screen that is
supposed to control it.

**Verified in a browser, end to end.**

| Step | Result |
|---|---|
| Signed out, `/admin` and `/admin/settings` | 307 to `/admin/login?next=…` |
| Signed in as the owner | Landed on the requested page, not the dashboard — `next` honoured |
| Sidebar | 15 items, `Settings` marked current, unbuilt routes disabled, panel reads the real name and `Owner` |
| Dashboard | Counts match the database exactly: 11 pages, 7 services, 6 pricing plans, 14 FAQs, 4 media, 0 leads |
| Settings save | Overlay loader during the save, then a toast — `role="status"` inside `aria-live="polite"`, per spec §15.3 |
| The change itself | Reached the footer, `/contact`, the privacy policy's entity block and the Organization graph, with no rebuild and no deploy |
| Admin at 390px, dark | No horizontal scroll, rail hidden, drawer opens with `aria-expanded`, accent correct |
| Contrast auditor over `/admin`, `/admin/settings`, `/admin/login` × both themes | Clean |

That last-but-one row is the architecture's whole claim, demonstrated rather
than asserted: a non-developer changed a value and the public site changed.

`tsc` clean, `eslint` reports nothing in any new file, build green at 49 pages.

### 2026-08-27 — accessibility and both-theme pass

**Measured, not eyeballed.** A contrast auditor was run in a real browser over
13 routes × 2 themes, computing the WCAG ratio for every element carrying a
text node against its effective background. Three genuine failures, all fixed
in tokens rather than in components:

| What | Was | Now |
|---|---|---|
| Dark `--text-subtle` on `surface-2` — the 12px price notes and process numbers | 3.95:1 | `#6b7a8d` → `#808fa2`, 5.25:1 |
| Light `--accent` on `--accent-soft` — the "Our Product" pill | 4.44:1 | `#0e7c7b` → `#0c6f6e`, 5.30:1 |
| `text-accent` inside the dark CTA band, in the **light** theme | 3.98:1 | Band redefines the tokens, 10.71:1 |

That third one is the interesting one. The closing band is committed to a dark
treatment in both themes, but its children reach for `text-accent` like every
other section — so in the light theme a dark teal tuned for a white page was
landing on near-black. Rather than hardcode a hex in two components, the band
now **redefines the tokens it inverts** (`--accent`, `--text-muted`,
`--text-subtle`, `--border`, `--ring`) in `Section`'s `contrast` variant and on
`cta_band`'s own element. Every child is correct at once, and the rule that no
component invents its own hex still holds.

Re-run after the fix: **clean on all 13 routes in both themes.**

**A skip link, which was missing entirely.** The header carries a services
dropdown, so a keyboard user traversed the whole menu again on every page
before reaching the content. `src/app/(site)/layout.tsx` now opens with an
off-screen `Skip to content` link and `<main>` carries `id="main"`. Verified by
pressing Tab on a loaded page: it is the first stop, becomes visible at
141×40px in the top-left corner, and its white-on-accent label reads at 5.98:1.

**Checked and found already correct** — worth recording so nobody re-checks:
one `<h1>` per route across all 13; every `<img>` carries `alt`; no heading
level is skipped; no duplicate `id`; no positive `tabindex`; every form control
is labelled, including the contact form's honeypot, which is `aria-hidden` with
`tabIndex={-1}` and still carries a `<label for>`. An earlier iframe-based
harness reported duplicate ids and two `<h1>`s — that was an artifact of the
harness, disproved against the served HTML and against a real page load.

**The owner's personal email is gone from the repository.** Replaced with
`apkavission@gmail.com` in `docs/PROGRESS.md` (3 places), the design spec
(§3.4), and the repo-local git author config. See the standing rule above.

**The email-templates migration is applied.** Types regenerated, and the
temporary cast and its three explanatory comments removed from
`src/lib/queries/email-templates.ts` — the query now uses the generated client
directly. `tsc` clean.

### 2026-08-27

**The last six public routes.** `/pricing`, `/blog`, `/case-studies`,
`/products/apka-saathi`, `/privacy-policy` and `/terms-and-conditions` — plus
`/blog/[slug]` and `/case-studies/[slug]`, without which a published post or
study would have nowhere to land. Every route is prerendered static and
assembled from `page_sections`, so all of it is the owner's to change.

| Route | What it is |
|---|---|
| `/pricing` | Intro, six plans from `pricing_plans`, how a quote is arrived at, the seven process steps, pricing FAQ, closing CTA |
| `/blog` | Intro, the post list with its empty state, closing CTA |
| `/blog/[slug]` | One post — markdown body, contents list, tags, related posts |
| `/case-studies` | Intro, the study grid with its empty state, closing CTA |
| `/case-studies/[slug]` | One study — problem, build, features, outcome, screens, consented testimonial, stack |
| `/products/apka-saathi` | Intro, four features, how it works, closing CTA |
| `/privacy-policy` | Twelve clauses, contents list, entity details from settings |
| `/terms-and-conditions` | Fourteen clauses, same structure |

**Five new section types**, registered in `src/components/sections/registry.tsx`:

- `pricing_table` — reads `pricing_plans`. The check constraint on the table
  guarantees a published plan names either a floor or a custom quote, so the
  card can print a price line unconditionally and never show a blank.
- `blog_list` — reads `blog_posts`, optional featured card, editable empty state.
- `case_studies_grid` — reads `case_studies`, same shape.
- `feature_grid` — the generic capability grid the product page needs and the
  service pages will reuse. Deliberately not `why_choose_us`: that argues for
  the company in numbered prose, this describes what a thing does and is
  scanned rather than read.
- `legal_document` — clauses with derived anchors and a sticky contents list.
  The entity's own details are **not** in the clauses: the section reads them
  from `site_settings`, so the registered address, CIN and GST are stated once
  and cannot drift between the two legal documents. Every line is conditional
  on a value existing.

**A markdown renderer that does not produce HTML.** `src/lib/markdown.ts`
parses a post body into typed nodes; `src/components/blog/post-body.tsx` maps
those to React elements. Nothing goes through `dangerouslySetInnerHTML`, so a
pasted `<script>` renders as the characters a reader sees. Link targets are
allow-listed (`http`, `https`, `mailto`, `tel`, `/`, `#`) rather than
block-listed, and a rejected link degrades to its own text.

**Legal pages written from the code, not from a template.** Every factual claim
in the privacy policy is checkable against this repository: the IP address is
salted and hashed and never stored raw (`lib/leads/request-context.ts`), the
user agent and referrer are stored truncated, notifications go through our own
SMTP server rather than a third-party sending API (`lib/email/mailer.ts`), the
database is in Mumbai, and the only browser storage is the theme preference.
The email clause says outright that mail may transit outside India, because it
does. **This still needs a lawyer's read before launch** — it is honest and
specific, which is the part a template cannot give you, but it is not legal
advice.

**The quote form now accepts `?service=<slug>`.** The pricing cards and the
service pages hand the form its own context, matched by slug rather than id: a
slug is stable, readable in a link and already public. An unknown slug selects
nothing, so a stale link still opens a working form.

**`FAQPage` structured data, tied to what is actually rendered.** The FAQ read
moved to `lib/queries/faqs.ts` so the section and the route share one cached
query, and `/pricing` emits the document only when the page actually carries an
FAQ section — read from the section's own `scope`, not assumed. A section the
admin removes takes its structured data with it.

**Also:** `Article`, `SoftwareApplication` and case-study JSON-LD builders, none
of which emit a rating or an offer we have not got; OG cards for all eight new
routes; `formatDate` pinned to Asia/Kolkata, because these strings are baked
into HTML on a build machine on UTC and an unpinned formatter prints the
previous day for anything published after half past five.

**The blog author is deliberately not shown.** `profiles` is closed to the
anonymous role, so an embedded author would arrive as null and read as a bug.
Posts are published under the company's name until `team_members` becomes the
public-safe source for a byline.

**Verified, measured not eyeballed.** `tsc --noEmit` clean; `eslint` reports
nothing in any new file; production build green with all six routes
prerendered static (46 pages); all eight routes return 200 from `next start`.
Measured in a real browser:

| Width | Horizontal scroll | `<h1>` per page | Cards equal |
|---|---|---|---|
| 390 (phone) | none on any of the six | exactly 1 | — |
| 1280 (desktop) | none | — | pricing 6 × 391px, product 4 × 289px |


**About, Contact and Portfolio — the remaining public routes.** Four routes,
five new section types, and one new form. Everything on all three pages comes
from `pages` / `page_sections`, so the copy is the owner's to change.

| Route | What it is |
|---|---|
| `/about` | Intro, the story, four working habits, the seven-step process, the team, closing CTA |
| `/contact` | Intro, the short form beside the contact channels, contact-scope FAQ |
| `/portfolio` | Intro, the project grid, closing CTA |
| `/portfolio/[slug]` | One project in full — prerendered per published row |

**Five new section types**, registered in `src/components/sections/registry.tsx`:

- `page_intro` — the opening block of an interior page, and the section that
  carries the `<h1>`. Deliberately not `hero`: the hero owns a WebGL scene and
  a full viewport, which is right once per visit and wrong on every page after.
- `story` — narrative paragraphs with an optional factual aside. One row per
  paragraph, because that is how they are edited, and no markup is accepted.
- `team` — reads `team_members` and renders nothing while it is empty.
- `portfolio_grid` — reads `projects`, optionally filtered by type and capped,
  with an editable empty state.
- `contact_channels` — the short form beside whichever contact channels are
  configured. Every channel is conditional on a value existing.

**The portfolio is honest about being empty.** `projects` has no rows, so the
grid renders its empty copy: we publish client work only once it is live and
the client has agreed to be named, and we do not fill the gap with invented
case studies. It disappears by itself the moment a project is published.

Every card and the detail page label what a project *is* — client project,
self-built demo, our own product, earlier work. The database already refuses to
let a demo name a client; the label is the other half of the same rule, and it
reaches the OG card too, so a shared link cannot imply an engagement that never
happened.

**A second form, on the same table.** `/contact` carries a six-field enquiry
form against the quote form's twelve. Someone on the contact page has a
question, not a brief, and asking for a budget band before they have asked it
is how an enquiry gets abandoned. Both write to `leads` — a question and a
brief are the same business object at different levels of detail — so nothing
downstream has to know which was used.

- `src/lib/validation/contact.ts`, `src/lib/actions/contact.ts`,
  `src/components/forms/contact-form.tsx`.
- The action lives in `lib/actions` rather than beside a route, because the
  section that renders the form can be placed on any page from the admin.
- Its own rate-limit bucket (`contact`), separate from the quote form's:
  someone who has just sent a brief should still be able to ask a follow-up.
- Both existing email templates are reused. A contact message carries fewer
  fields and the templates already omit what is missing; a second near-identical
  pair would be two more places for the wording to drift.
- No `useSearchParams` here, unlike the quote form. This form sits in a section
  that can appear anywhere, and reading the query string would make every page
  carrying it wait on request-time data. `utm` is written as `{}`.

**Also:** `buildProjectSchema` added to `src/lib/structured-data.ts`
(`CreativeWork`, with a client named only where the row names one); `/about`,
`/contact`, `/portfolio` and every project added to the sitemap; an OG card per
new route; four contact-scope FAQs added to the seed.

**Toasts — `src/components/ui/toast.tsx`, mounted once in the root layout.**

One component for every "that worked" and "that did not" in the application:
the two public forms now, the admin panel and the client portal when they
exist. Feedback written per screen is how a design system drifts.

- Four variants — success, error, warning, info — each a token pair. No hex in
  the file, so both themes are correct from one definition. Verified in dark
  mode: the error toast reads `rgba(248, 113, 113, 0.12)` and the title
  `rgb(232, 237, 244)`, both the dark values of `--danger-soft` and `--text`.
- **Anchored to the top**, not the bottom. A toast fires just after a form is
  submitted, which on a phone is exactly when the keyboard is open and the
  bottom of the screen is behind it. Full width below the header on a phone
  (measured at 390px: top 72px, 12px gutters, 366px wide), a 22rem column at
  the top right from `sm` up. `z-60`, above the sticky header's `z-50`.
- **Everything clears itself** — four seconds for success and info, six for
  errors and warnings. Hovering or focusing pauses the timer, so a long message
  is never pulled away mid-sentence, and the dismiss button is always there.
- At most three on screen, newest first.
- Errors carry `role="alert"` and `aria-live="assertive"`, successes
  `role="status"` and `polite`. A toast a screen reader never hears did not
  happen.
- Both forms report through `useFormToast` (`src/components/forms/`), so the
  wording and the variant are decided once. Field errors stay beside their
  fields — a toast listing four invalid inputs is only a worse version of the
  form. The toast carries the outcome.

**A real bug, found by testing rather than by reading: both public forms were
returning 500.** `getServerEnv()` validates the whole server schema on every
call, and `.env.local` carried a blank `R2_PUBLIC_URL=` — an unused key, which
arrives as an empty string rather than as undefined and fails
`z.string().url()`. (That variable has since been removed entirely; see the R2
entry above.) One
blank optional variable therefore threw for every caller, including the ones
that only wanted `IP_HASH_SALT`. `src/lib/env.ts` now drops empty values before
parsing, so "not set" means the same thing in a `.env` file as it does in the
schema. This had been broken for the quote form too.

**Also fixed:** the contact block printed a pin icon next to the word "India" —
`site_settings.country` defaults to it while every street field is empty. The
country is now appended only once there is an address in front of it.

**One loader for everything — `src/components/brand/brand-loader.tsx`.**

The mark in the centre, the two halves of the name coming out from behind it
and settling outward, and the mark's own rising arrow drawing itself underneath
for as long as the wait lasts. Behind the lockup, a new WebGL scene.

- **`src/components/three/vision-scene.tsx`** — an elliptical field of points
  that reads as an iris. It drifts on a slow two-frequency path the way an eye
  does when it is watching something rather than staring, blinks every few
  seconds, then draws the arrow through itself and clears. The blink is what
  makes the shape read as *someone looking*; without it the same ellipse is a
  decoration. One `Points` object holding the iris and the arrow together, so
  the whole scene is one draw call and nothing is allocated in the frame loop.
- The hero's `assemble` scene was tried behind the lockup first and was wrong:
  it renders the words itself, so a second, half-formed "Apka Vission" sat
  behind the real one and read as a rendering fault. The scene is also scoped
  to the lockup rather than to the overlay — centred on the container it
  drifted down over the copy on the not-found and error screens.
- A sliding progress bar sat under the lockup first, and was replaced by the
  arrow. A generic indicator under a brand lockup is the one element on the
  screen that could have belonged to any product.

**It is an overlay.** The page stays visible, dimmed and blurred underneath, so
a wait reads as "this is working" rather than "your page is gone".

**It covers every wait there is:**

| Wait | How |
|---|---|
| Navigation, reload, a segment fetching data | `src/app/loading.tsx` and `src/app/(site)/loading.tsx` |
| `POST`, `PUT`, `PATCH`, `DELETE` | `BusyProvider` / `useBusy()` in `src/components/brand/busy-overlay.tsx`; both public forms hold it open through `useBusyWhile` |
| Not found | `src/app/not-found.tsx` — the same loader, carrying the message and the way out |
| A route that threw | `src/app/error.tsx` — likewise, with one retry button |
| The root layout itself failing | `src/app/global-error.tsx`, the one deliberate exception: no shared component can be trusted at that point |
| A button mid-submit | `BrandSpinner`, the compact form, now in both submit buttons |

The busy state is counted rather than boolean — two overlapping writes must not
have the first one to finish clear the overlay while the second is still
running — and `start()` returns its own release, so a caller can never
decrement someone else's work.

**A real bug, found by watching a submit rather than reading the code.** The
first wait of a session showed the name with a hole where the mark belongs: the
symbol had never been requested, so it was still downloading while the loader
painted. Both variants are now preloaded in the document head, one per colour
scheme, so a visitor fetches only the mark they will actually see.

**Rules it holds to:** it never reads the database (the mark is the committed
file in `public/brand/`, which is the compiled fallback every dynamic thing
here is required to have); it ships no JavaScript of its own, so it paints in
the frame the HTML arrives, with the WebGL field loading after hydration; and
the 3D obeys the existing scene rules — no reduced motion, no low-core device,
no save-data connection, no WebGL2, and a static glow in all of those cases.

Verified: `tsc` clean, `next build` passes, the 404 renders the loader with the
scene bounded behind the lockup and the arrow looping under it, the busy
overlay appears over the contact page mid-submit with the page still legible
underneath, and the lockup stays on one line with no horizontal overflow at
360px. The three scene files trip the React Compiler's `immutability` lint by
writing into a buffer from `useFrame` — the pattern every scene in this project
already uses, and not something this work introduced.

**Verified, not assumed:**

| Check | Result |
|---|---|
| `tsc --noEmit`, `eslint`, `next build` | clean after every change |
| Contact form, invalid submit | error toast, `role="alert"`, field errors beside their fields |
| Contact form, valid submit | lead row written, `form_submissions` logged `succeeded`, success panel and success toast |
| Both emails | sent — no `[mail]` line in the server log, which only appears on failure or missing configuration |
| Dark mode | toast colours resolve to the dark tokens |
| 390px viewport | toast full width below the header, no horizontal overflow |
| Test rows | deleted; `leads` and `form_submissions` are empty again |

Test traffic used `kumarnitish4384@gmail.com`, per the standing rule above.

**Verified, not assumed:**

| Check | Result |
|---|---|
| `tsc --noEmit` | clean |
| `eslint` on every new and changed file | clean |
| `next build` | passes; all three new pages prerender as static, `/portfolio/[slug]` as SSG |
| `npm run db:seed` | about (6 sections), contact (3), portfolio (3), 10 FAQs — applied to the live database |
| `/about` served | one `<h1>`, all five sections present, `og:image` on the route |
| `/contact` served | form fields present in the HTML, hours panel rendering, FAQ scope resolving, 3 JSON-LD blocks |
| `/portfolio` served | empty state rendering as written, not as a blank grid |
| `team` section with an empty table | absent from the page, as designed |
| Contact form end-to-end submit | **not yet run** — see below |

**This work is complete and verified end to end.** The contact form was
submitted against the live database, both emails were sent, and the test rows
were deleted afterwards.

### 2026-08-26

**Lead capture — `/request-a-quote`, built and verified against the live database:**

- `src/lib/validation/lead.ts` — one Zod schema parsed on both sides. The client
  uses it for inline errors; the Server Action parses it again, because the
  action is a public endpoint and client validation is a courtesy, not a control.
- `src/app/(site)/request-a-quote/actions.ts` — the Server Action. Writes the
  lead first and notifies afterwards, so a mail failure can never turn a
  captured lead into an error page.
- `src/app/(site)/request-a-quote/quote-form.tsx` — `useActionState`, field-level
  errors, an off-screen honeypot, and `utm_*` carried through as hidden inputs
  read from `useSearchParams`.
- `src/lib/leads/request-context.ts` — client IP salted and hashed with
  `IP_HASH_SALT`, never stored raw.
- `src/lib/leads/rate-limit.ts` — two limits over `company.form_submissions`:
  5 per IP and 3 per email per hour. Fails **open** on a counting error, because
  losing a real enquiry is worse than allowing one extra submission.
- DPDP Act 2023: `consent_text` is stored verbatim next to `consent_given`, so
  the record shows the words that were actually on screen. Editing the copy
  changes it for future submissions only.

**Email — our own SMTP, no third-party sending service:**

- Replaced `resend` with `nodemailer`. `src/lib/email/mailer.ts` is a pooled
  SMTP transport that never throws and treats "unconfigured" as a valid state —
  in development it logs the message instead of sending it.
- Env keys changed: `RESEND_API_KEY` is gone; `SMTP_HOST`, `SMTP_PORT`,
  `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS` replace it. `.env.example` updated.
- Live values are Hostinger SMTP on port 465 (implicit TLS) as an interim
  mailbox, to be swapped when the real domain mailbox exists.

**Email design system — `src/lib/email/layout.ts`:**

One shell every outgoing message renders into, so a new email is content
rather than another hand-built table. Written for mail clients, not browsers:
table layout, inline styles, explicit backgrounds everywhere, and a single
`<style>` block holding only the mobile media query — which is the one rule
that cannot be inlined. Dropping that block entirely still leaves a readable
email.

- Header is the logo on a fixed dark bar (`#0e1218`). The logo is the light-ink
  version, so pinning the background is what stops a dark-mode client from
  inverting it onto a colour nobody chose.
- The logo travels as a CID attachment (`public/brand/logo-email.png`, 440px
  wide, generated from the traced brand SVG) rather than a hosted URL. It
  renders before the reader clicks "show images", and it works before the site
  is deployed.
- Supports label/value rows, quoted free-text blocks, numbered steps, one CTA
  button (background on the `<td>`, because Outlook ignores padding on inline
  elements) and a contact link row.
- Footer carries the trading name, "A unit of Apka Saathi Private Limited", the
  address and the contact details, all read from `site_settings`.

**Two emails per enquiry, sent concurrently:**

| | |
|---|---|
| `lead-notification.ts` | Internal. Full detail table, the brief quoted, `replyTo` set to the client so replying answers them directly. |
| `lead-acknowledgement.ts` | To the client. Confirms arrival, three numbered steps saying what happens and by when, a summary of what they sent, and a CTA. Deliberately does not sell. |

`Promise.all`, not sequential: a bounced internal address must not cost the
client their confirmation, and a typo in the client's address must not cost us
the notification.

**Structured data — `src/lib/structured-data.ts`:**

Consolidated, because there were already two hand-rolled JSON-LD blocks (an
Organization in the root layout and a Service in the service page) and adding a
third source would have meant three places emitting overlapping claims. Both
inline versions were removed; everything now builds from one module.

- Organization and WebSite are emitted once, in the public layout — not the
  root layout, since the admin and portal routes have no business claiming to
  be the marketing site.
- Service and BreadcrumbList are emitted per route.
- Stable `@id` values let WebSite.publisher and Service.provider reference the
  Organization instead of repeating it. `seo_defaults.organization_schema` still
  overrides the generated body, but `@id`, `@type` and `url` are reapplied
  afterwards so an override cannot leave those references dangling.
- A field is emitted only when the database holds a value. `price_from` becomes
  an `offers` block only when the service is not marked custom-quote —
  advertising a starting price for project-quoted work would be a promise the
  business has not made.
- `<JsonLd>` escapes `<` as `<`, so a `</script>` in database content
  cannot close the tag early.

Verified on the built output: 4 blocks on a service page, no duplicates, every
`@id` reference resolving.

**Email content made dynamic — migration `...0010_email_templates.sql`:**

The wording of an email people receive is content, not code. Keeping subject
lines and "what happens next" copy in a TypeScript file means every correction
is a deploy, and the person who knows how the business talks to its clients
cannot make one.

- `company.email_templates` — one row per email, keyed by a stable string.
  Holds subject, preheader, heading, intro, `steps` jsonb, `button` jsonb and
  note. No anon grant: these never render on a public page.
- `{{placeholder}}` substitution via `src/lib/email/placeholders.ts`. An
  unknown placeholder is **left standing** rather than blanked — `Hi
  {{frist_name}},` is a typo someone fixes, `Hi ,` gets reported as a bug.
- Every key has a `FALLBACK` compiled into its template module. Missing row,
  deactivated row, or table-not-yet-created all degrade to it identically.
- Raw HTML is deliberately *not* an editable field. Layout and escaping stay in
  code so one paste cannot break every reader's inbox.

**Logo made dynamic — `src/lib/email/logo.ts`:**

Follows `site_settings.logo_dark_id` through `media`, so changing the logo in
the admin panel changes it in every email. The dark variant is the one wanted:
it carries light ink and the email header is a fixed dark bar. Rasterised to
PNG with sharp because mail clients do not render SVG — Gmail strips it — then
memoised per process and attached by CID. Falls back to the committed
`public/brand/logo-email.png` if the configured asset cannot be read.

**Open Graph cards — `src/lib/og-template.tsx`:**

1200×630 cards generated with `next/og`, in the site's own dark palette so a
shared link and the page it opens look like the same company. Logo inlined as a
data URI, since Satori has no network access and no notion of `public/`.

Four routes, four cards: home, services index, each service (name and summary
from the row), and the quote page.

**Two gotchas found by checking the built HTML rather than assuming:**

1. `buildMetadata` set `openGraph.images` to `undefined`, and a key set to
   `undefined` still counts as explicit — which suppressed Next's merge of the
   file-convention image. **No route had an `og:image` at all.** Fixed by
   spreading the key only when a page names its own image.
2. Even then, a parent segment's `opengraph-image` does not reach a child route
   whose `generateMetadata` returns an explicit `openGraph`. Every route here
   goes through `buildMetadata`, so every route that wants a card now declares
   its own — which also lets each one be tailored.

**Verified, not assumed:**

| Check | Result |
|---|---|
| `tsc --noEmit` | clean |
| `eslint` on the new files | clean |
| `next build` | passes; `/request-a-quote` prerenders as static |
| SMTP `verify()` | host reachable, credentials accepted |
| Lead insert via service role | OK — row created, `status=new`, `consent_given=true` |
| `form_submissions` insert | OK |
| Notification mail | OK — delivered, rendered and checked at 800px and 375px |
| Client confirmation | OK — delivered, rendered and checked |
| OG cards | `og:image` present on all four routes; PNG fetched and inspected |
| Dynamic logo | resolves `logo_dark_id` → `/brand/logo-dark.svg` → 440×270 PNG |
| Template fallback | `email_templates` returns 404 today; both emails still build |
| Test rows | removed afterwards |

**Node upgraded — issue resolved.** Was v20.20.1, which `@supabase/supabase-js`
2.112 warned against and which crashed plain Node scripts constructing a
Supabase client ("native WebSocket not found"). Now **v24.19.0**, which clears
the 22+ requirement. Verified after the upgrade: `tsc` clean, `next build`
passes, `sharp` native binding loads (libvips 8.18.3), Supabase client
constructs in plain Node, and the deprecation warnings are gone.

Note for whoever touches this next: `nvm use` fails on this machine because the
nvm root is `C:\Users\Pratiek A Jain\AppData\Local\nvm` and nvm-windows does not
quote the space, so it reports `'C:\Users\Pratiek' is not recognized`. Node 24
is on PATH directly at `C:\Program Files\nodejs`. Reinstalling nvm to a
space-free root such as `C:\nvm` would fix version switching.
- Design specification written and revised four times as requirements grew.
  Now 25 sections at `docs/specs/2026-08-25-apkasaathi-design.md`.
- Requirements captured across the revisions: industry variants, dark/light themes,
  high-ambition UI with Three.js, super admin control plane, client portal with task
  tracker and realtime chat, email + WhatsApp messaging centre.
- Environment verified: Node v20.20.1, npm 10.8.2, git 2.51.0.
- Documentation structure created: `docs/README.md`, `docs/PROGRESS.md`,
  `docs/specs/`, `docs/plans/`.
- Removed the tool-named `docs/superpowers/` directory in favour of neutral
  `docs/plans/`, per the no-AI-fingerprints rule.

**Phase 0 — Foundation, work completed:**

- Scaffolded Next.js **16.3.3** / React **19.2.8** / Tailwind **v4** / TypeScript,
  App Router, `src/` layout, `@/*` import alias, Turbopack build.
- Deleted the generated `AGENTS.md` and `CLAUDE.md` scaffold files.
- Moved the stray `.code-review-graph/` tooling folder out of the project root.
- Installed runtime dependencies: `@supabase/supabase-js`, `@supabase/ssr`, `zod`,
  `react-hook-form`, `@hookform/resolvers`, `resend`, `@aws-sdk/client-s3`,
  `@aws-sdk/s3-request-presigner`, `motion`, `clsx`, `tailwind-merge`,
  `lucide-react`.
- Installed dev dependencies: `vitest`, `@vitejs/plugin-react`, `jsdom`, Testing
  Library (react / jest-dom / user-event), `@playwright/test`, `prettier`,
  `prettier-plugin-tailwindcss`, `supabase` CLI.
- **Design token system** written — `src/app/globals.css`. Full light and dark
  palettes as CSS custom properties across surface, border, text, accent,
  semantic, depth, geometry and motion groups. Dark mode inverts depth (surface +
  1px top highlight instead of shadows), carries 3% grain, and uses separate
  accent values. Mapped into Tailwind v4 with `@theme inline` so runtime theming
  keeps working. Base layer covers focus rings, selection, themed scrollbars,
  heading optics and a designed reduced-motion state.
- **Theme system** — `src/lib/theme/constants.ts` (modes, storage key,
  dependency-free blocking init script), `src/components/theme/theme-provider.tsx`
  (three-state provider, OS-preference following, cross-tab sync, View
  Transitions cross-fade), `src/components/theme/theme-toggle.tsx` (accessible
  three-state segmented control).
- **Root layout** — `src/app/layout.tsx`. Self-hosted Sora / Inter / JetBrains
  Mono via `next/font`, blocking theme script in `<head>`, `metadataBase` from a
  single site-URL constant, per-mode `themeColor`.
- `.gitignore` and `.env.example` written. Every environment variable the project
  will need is documented, with server-only keys clearly marked.
- `package.json` renamed to `apkasaathi-services`, scripts added for `typecheck`,
  `test`, `test:e2e`, `format`.
- **Verified:** `tsc --noEmit` passes clean, `npm run build` succeeds
  (compiled in 1.6s, 4 static pages generated).
- `git init` done with **repo-local** author config (`Apka Saathi` /
  `apkavission@gmail.com`). **Nothing committed yet** — owner asked to hold.
- Tooling ignore patterns moved out of the repo's `.gitignore` into a **global**
  ignore file at `~/.gitignore_global`, registered via `core.excludesFile`. The
  repo's own `.gitignore` now contains no tool names at all, and the protection
  applies automatically to the demo repos too.
- Repository scanned for tooling references: **clean**.

**Database schema written — `supabase/migrations/`, 8 migrations, 23 tables:**

| File | Contents |
|---|---|
| `...0001_foundation.sql` | `company` schema, 6 enums, `set_updated_at()`, base grants |
| `...0002_identity_media.sql` | `profiles`, `media`, auto-profile-on-signup trigger, the four authorisation helpers |
| `...0003_site_content.sql` | `site_settings` (singleton), `nav_items`, `pages`, `page_sections` |
| `...0004_catalogue.sql` | `technologies`, `services`, `projects`, `testimonials`, `case_studies` |
| `...0005_blog_supporting.sql` | `blog_categories`, `blog_posts`, `faqs`, `team_members`, `process_steps`, `pricing_plans` |
| `...0006_leads.sql` | `leads`, `lead_notes`, `lead_activity`, `form_submissions` |
| `...0007_seo.sql` | `redirects`, `seo_defaults` (singleton) |
| `...0008_rls.sql` | RLS enabled on all 23 tables, grants, and every policy |

Notable choices baked into the schema:

- **Honesty rules are check constraints, not conventions.** `projects` rejects a
  demo carrying a client name, a client project without one, an in-house product
  with a client, and demo credentials or variants on a non-demo row.
  `testimonials` refuses to publish without `consent_confirmed`.
  `media.alt_text` is `NOT NULL` with a non-blank check.
- **Audit by trigger, not by application call.** Lead status and assignment
  changes write to `lead_activity` automatically, and that table is
  insert-and-select only — `UPDATE` and `DELETE` are revoked, so the trail
  cannot be rewritten.
- **Derived values are derived.** `published_at`, `updated_at` and blog
  `reading_minutes` are all maintained by triggers, never by the client.
- **System pages cannot be deleted.** A `BEFORE DELETE` trigger blocks removal
  of any page a code route depends on.
- **Navigation depth is capped at two** by a trigger, so an unbounded
  self-reference can never reach the renderer.
- **Leads are unreachable anonymously at two independent layers** — `anon` holds
  no grant, and no policy names `anon`. Inserts arrive only through a Server
  Action holding the service role.
- **`page_sections` public read requires the parent page to be published**, or
  draft page bodies would leak through the sections table.
- `page_sections.type` is `text`, not an enum, so a new section type needs a
  component and a Zod schema — never a migration.

Also fixed during review: the four authorisation helpers were originally in
migration 0001, before `company.profiles` exists. A `language sql` body is
parsed at creation time, so that ordering would have failed on push. Moved to
the end of 0002.

`supabase init` run; `company` added to `[api] schemas` in `config.toml`.

**Schema deployed and verified against the live database:**

Migrations were applied through the Supabase SQL Editor (no Docker locally, and
the CLI has no access token yet), using the concatenated file at
`supabase/bootstrap/001_company_schema_full.sql`. All 23 tables and 11 functions
created. `company` added to Exposed schemas via Settings → Data API.

One real bug found by testing and fixed in migration `...0009`: **`service_role`
had no table grants.** Supabase issues those automatically in `public` but not in
a custom schema, so every server-side write failed with `42501`. The fix also
sets default privileges so future tables cannot reopen the gap, and keeps
`lead_activity` append-only even for `service_role`.

Live verification run against the deployed database — every check passed:

| Check | Result |
|---|---|
| Seeded singletons readable by `service_role` | ✅ `Apka Saathi Private Limited` |
| Demo project carrying a client name | ✅ **rejected**, `23514` |
| Client project with no client name | ✅ **rejected** |
| Testimonial published without consent | ✅ **rejected** |
| Media with blank `alt_text` | ✅ **rejected** |
| Valid demo project insert | ✅ accepted |
| `published_at` set by trigger | ✅ auto-populated |
| `anon` reading published content | ✅ allowed |
| `anon` reading `leads` | ✅ **permission denied** |
| `anon` inserting a project | ✅ **permission denied** |

**Type generation:** `scripts/generate-db-types.mjs` + `npm run db:types`.
Generates `src/types/database.ts` from the live PostgREST schema description —
23 tables, 6 enums, 1304 lines. Written because the official
`supabase gen types` needs an access token or the database password, neither of
which we hold. Output shape is deliberately CLI-compatible, so switching later
changes nothing downstream. **Run it after every migration.**

`Database` generic wired into all three Supabase clients. `tsc --noEmit` clean.

**End-to-end proven.** `src/lib/queries/site-settings.ts` is the first cached
query; the home page renders from it. The production build prerenders `/` as
**static**, and the emitted HTML contains live database values
(`default mode "system"`, `3D on`, `Apka Saathi Private Limited`).

That single result validates the central architectural bet: content is fully
database-driven *and* the page is statically served, with no query on the
visitor's request path.

---

## Phase 1 — public site (in progress)

**Content seeded.** `scripts/seed.mjs` + `npm run db:seed`, idempotent and safe
to re-run. Seeds site settings, SEO defaults, 28 navigation items, 22
technologies, 7 process steps, 7 services and 6 FAQs — all real, shippable copy
written to the honesty rules. No invented clients, statistics or testimonials;
where honest content does not exist yet the section is omitted rather than
filled.

The seeder talks to PostgREST over plain `fetch` rather than
`@supabase/supabase-js`, because that package builds a realtime client on import
and so requires Node 22. A seed script has no business failing on a Node
version. It also normalises key sets across bulk inserts, since PostgREST
rejects arrays whose objects differ (a nav child has `parent_id`, a top-level
item does not).

**Built:**

| Piece | Notes |
|---|---|
| `lib/queries/navigation.ts` | Cached, builds the two-level tree in one pass |
| `lib/queries/services.ts` | List (narrow column set) and per-slug detail with slug-scoped cache tags |
| `components/ui/button.tsx` | `Button` and `ButtonLink` as separate components, so the right element always reaches the accessibility tree |
| `components/site/header.tsx` | Server boundary — navigation fetched server-side so crawlers see the menu |
| `components/site/header-nav.tsx` | Client shell: frosted-on-scroll, hover dropdown with close delay, full-screen mobile panel with staggered entry, scroll lock |
| `components/site/footer.tsx` | Three navigation columns, contact block, legal entity named separately from the brand |
| `app/(site)/layout.tsx` | Route group, so `/admin` and the portal will not inherit the marketing chrome |
| `globals.css` | `fade-rise` / `fade-in` keyframes — transform and opacity only |

**Verified:** `tsc --noEmit` clean, production build green, `/` still prerendered
static. Live page carries the seeded navigation, all seven service cards, the
footer legal name, and prices formatted for India (`₹35,000`).

### Section system — built and live

The home page now holds no content of its own. It reads `company.pages` +
`company.page_sections` and renders through a registry, so the owner can
reorder, hide, duplicate or restyle any section from the admin panel without a
developer or a deploy.

Nine sections seeded and rendering, all verified present in the **static**
prerendered HTML:

`hero` · `what_we_build` · `services_grid` · `why_choose_us` ·
`product_promo` · `process_steps` · `tech_stack` · `faq` · `cta_band`

`page_sections.type` stays a text column, so a new section type needs a
component and a registry entry — never a migration.

**Motion:** `Reveal` / `Stagger` on IntersectionObserver, disconnecting after
first intersection, transform and opacity only, with a designed reduced-motion
state. The FAQ accordion animates `grid-template-rows` — the one deliberate
exception to the GPU-only rule, documented in the component, because a height
transition cannot be expressed any other way and runs only on a click.

**Type generator upgraded** to emit `Relationships` from the foreign-key
markers PostgREST publishes in column descriptions. Without them an embedded
select (`pages.select("*, page_sections(*)")`) resolves to `SelectQueryError`
instead of the joined shape. Same-schema targets only; cross-schema references
are skipped rather than emitted as relations to tables the types do not carry.

### Brand set — Apka Vission

**Name:** Apka Vission · **Hook line:** *Your Vision. We Make It Happen.*
**Legal entity:** Apka Saathi Private Limited (unchanged, named separately in the
footer and in `Organization` schema).

The doubled S was kept for a concrete reason, not a stylistic one:
`apkavision.com` and `apkavision.in` are **both already registered**;
`apkavission.com` and `apkavission.in` are **both available**. Register the pair
soon — spec Section 26.

Seeded through `site_settings.company_name`, the hero section content and
`seo_defaults`. No schema change was needed, because `company_name` and
`legal_name` were separate from the start.

### Three.js — three scenes, all admin-independent

| Scene | Where | What it is |
|---|---|---|
| `assemble` | Hero | Scattered fragments converge into the words **APKA VISSION**, hold while a band of light sweeps through the letterforms, then disperse. 8-second cycle. |
| `lattice` | Closing CTA | A node-and-edge sphere with a pulse travelling through it |
| `wave` | available, unused | A rippling point field |

The hero letterforms are **sampled from a 2D canvas at runtime**, not shipped as
a model — so the word follows a rename with a one-line change, needs no 3D asset
and adds no download.

Three real bugs found and fixed by testing in a browser rather than by reading
the code:

1. **The entire page was invisible without JavaScript.** `Reveal` started at
   `opacity: 0` and revealed via IntersectionObserver, so nothing rendered until
   hydration — and nothing ever rendered if a script failed. Rebuilt as pure CSS
   `animation-timeline: view()` behind an `@supports` guard: content is visible by
   default, animates as an enhancement, and the component is now a Server
   Component with no JavaScript at all.
2. **The brand text was clipped at the first and last letter.** Points were scaled
   to fixed world units while the visible area depends on the canvas aspect. Now
   normalised against the glyph bounding box and fitted to the live viewport, so
   it is correct at any size.
3. **Cache invalidation was missing entirely.** Seeding wrote to the database and
   the site kept serving the old content, because nothing called `revalidateTag`.
   Added `POST /api/revalidate` (constant-time secret check, fails closed) and the
   seeder now calls it. This same endpoint is what the super admin will use to
   invalidate the demo deployments.

### Verified in a browser, measured not eyeballed

| Width | Horizontal scroll | Canvas | Cards equal | Sections |
|---|---|---|---|---|
| 390 (phone) | none | 625×384 | — | all render |
| 768 (tablet) | none | 1229×384 | **6 × 279px** | 9, none zero-height |

WebGL now runs on phones at reduced quality (0.4 fragments, dpr 1) rather than
being switched off below 1024px.

### New requirements captured in the spec

- **Section 26** — brand, hook line, spelling rationale, domain status
- **Section 27** — client documents: scope, charges, payments, auditable signing
- **Section 28** — employees, and `is_active` as the estate-wide access switch
- **Section 29** — responsive as a release blocker, with the widths and the rules

### New requirement — layout templates (not yet built)

The owner picks a template and the whole site takes that layout. This is an
addition to the spec and needs:

- `layout_variant` on `page_sections` — each section type gets several layouts
  (hero: split / centred / full-bleed / minimal, and so on)
- a `templates` table — name, preview image, theme payload, section blueprint
- an admin gallery with live preview and an "apply" action that rewrites
  `site_settings.theme` and the page's section arrangement in one transaction

The existing architecture already carries most of the weight: sections are
rows, theme is data, and both are cache-tagged. A template is a saved bundle of
those two things rather than a new mechanism.

### Phase 3 — what the admin still needs

In the order that pays off soonest:

- ~~Leads~~ — **done**, see the entry above. Still missing from that screen:
  bulk actions on the list, a saved-view or date-range filter, and a way to
  reply from inside the admin rather than in a mail client. None of them blocks
  using it.
- ~~Page builder~~ — **done**, see the entry above. Still missing from it:
  drag-to-reorder on top of the move buttons, a section library with previews
  rather than a dropdown, and deleting a page (only sections can be deleted
  today, and `is_system` pages never will be).
- ~~Services~~ — **done**, see the entry above, and with it the shape every
  other content list now follows. Still missing from that screen: choosing an
  OG image (blocked on the media library) and the long-form `body` column, which
  no page renders yet.
- ~~Portfolio~~ — **done**, see the entry above, and complete since
  2026-08-28: the thumbnail, the social image and the gallery are all on the
  form. Nothing is missing from that screen.
- ~~Case studies~~ — **done**, see the entry above, and complete since
  2026-08-28: the header image and the screenshots are both on the form.
  Nothing is missing from that screen.
- ~~Blog~~ — **done**, see the entry above, posts and categories both. Still
  missing from that screen: the header image and the social preview, and a
  byline, which needs `team_members` to become a public-safe author source.
- ~~**The remaining content lists** — pricing, FAQs, team.~~ **Done
  2026-08-27**, see the entry below.
- ~~**Media library**~~ — **built 2026-08-27**, and the other half of
  [image-rules.md](image-rules.md) — the picker, the declared size on every
  field, the warning naming both numbers — landed with it. The last two image
  columns, `projects.gallery` and `case_studies.screenshots`, went in on
  2026-08-28 as repeaters. **All eleven image fields are now on their forms.**
- ~~**Users**~~ — **built 2026-08-27**, see the entry above, and with it roles
  as master data and the per-person menu. `npm run admin:create` still works and
  is still the way the *first* account is made on a fresh database, but nothing
  else needs it. Still missing from that screen: an audit trail of who changed
  whose access and when, and an invitation flow that lets somebody set their own
  first password instead of being sent a generated one.
- ~~**Navigation**~~ — **built 2026-08-28**, see the entry below. Still missing
  from that screen: drag-to-reorder on top of the move buttons, a check that an
  address actually resolves to a page on this site, and the `icon` and
  `badge_text` columns, which are deliberately not offered because nothing
  renders them.
- ~~**SEO**~~ — **built 2026-08-28**, see the entry below. Three columns are
  not on that form because nothing reads them: `ga_measurement_id`,
  `gsc_property` and `default_og_image_id`. **The last of those was looked at
  properly on 2026-08-28 and should stay unwired** — correcting what this file
  said earlier the same day. `src/app/(site)/opengraph-image.tsx` already gives
  every public route a card, and fifteen routes override it with one carrying
  their own name and summary. An explicit `openGraph.images` key suppresses
  that file-convention merge, so feeding a chosen picture into `buildMetadata`
  would replace fifteen per-page cards with one static image everywhere. The
  column is redundant rather than unfinished; the honest tidy-up is a migration
  that drops it, not three lines that use it.
- ~~**Command palette (Ctrl+K)**~~ — **built 2026-08-28**, see the entry below.
  Screens and actions filter instantly in the browser; records are searched on
  the server across eleven tables, and which of those are searched at all is
  decided by the caller's own menu, re-resolved server-side on every call.
  Still missing: per-screen shortcuts beyond it — spec §15.3 also asks for a
  keyboard layer, and Ctrl+K is the whole of it so far.

### Still to do in phase 1

- ~~Accessibility and both-theme pass~~ — **done**, see the entry above.
  What is *not* yet covered: a screen-reader run-through (NVDA or VoiceOver) of
  the mobile menu and the FAQ accordion. **The mechanical half was automated on
  2026-08-28** — sixteen checks per run, including the accordion driven from
  the keyboard with `aria-expanded` asserted — so what is left is the part that
  genuinely needs ears: whether what is announced is understandable.
- ~~**`/blog/category/[slug]`.**~~ **Built 2026-08-28**, and linked from every
  post's breadcrumb, so it is no longer "linked from nothing". All four
  categories prerender; each is empty until something is published, and says so.
- ~~**`FAQPage` on the other pages that carry an FAQ.**~~ **Done 2026-08-28**,
  and better than planned: rather than wiring the remaining routes one by one,
  the graph moved into the FAQ section, so every page that carries one gets it
  and no future page can be forgotten. The service pages turned out not to
  render FAQs at all, which is why they never appeared to be missing one.
- **A public source for a blog byline.** See the note above; needs
  `team_members` to be readable as an author, or an `author_name` column.
- **Product facts we do not hold yet.** The `SoftwareApplication` graph on
  `/products/apka-saathi` carries name and description only. Category,
  operating system and a store link need somewhere to live — the product row
  the spec's `/products` index would read.
- **The legal pages need a lawyer's read** before the site is indexed.
- ~~**The two public forms still carry their own copy of `Field`.**~~ **Done
  2026-08-28.** Both adopted `src/components/ui/field.tsx`, and with them the
  quote form's `name` prop — which existed only to pick a class the shared
  component takes as `className`.

### Section types now registered

`hero` · `page_intro` · `what_we_build` · `services_grid` · `why_choose_us` ·
`product_promo` · `process_steps` · `tech_stack` · `story` · `team` ·
`portfolio_grid` · `case_studies_grid` · `blog_list` · `pricing_table` ·
`feature_grid` · `legal_document` · `contact_channels` · `faq` · `cta_band`

Nineteen types, none of which needed a migration to add — `page_sections.type`
is a text column and the registry is where a string becomes a component.

---

## Decisions locked in

Full reasoning for each is in the spec's Section 23. Summarised here for quick recall:

| Decision | Short reason |
|---|---|
| Next.js + Supabase + R2, no separate backend server | Server Actions cover everything; nothing to host or maintain |
| One Supabase project, seven schemas | Free tier permits two projects; schemas give the same isolation |
| Six separate git repos, six Vercel projects | Independent deploys; a broken demo cannot block the company site |
| Tagged cache + admin invalidation | The only way to have fully dynamic content at static speed |
| Section-based page model | Owner restructures pages without a developer |
| Variants as data, not forked code | 15 industry demos from 5 codebases |
| Variant in the URL path | Every variant independently linkable and cacheable |
| ~~Desktop WebGL, mobile pre-rendered video~~ → **WebGL everywhere, at a quality the device can afford** | Superseded in the build and recorded 2026-08-28. A phone runs the real scene at 40% of the fragment count rather than a video: no second asset to produce for every scene, nothing to re-render when a word changes, and no video download on a connection that cannot afford one. The gate is in `scene-mount.tsx` and refuses outright on reduced motion, fewer than four cores, save-data, no WebGL2, or a viewport under 360px |
| Demos `noindex`; company site targets the keywords | Avoids deceptive ranking; concentrates domain authority |
| Company website shipped completely first | It is the only part that earns |
| Progress computed from tasks, never typed by hand | A manual percentage always drifts and destroys trust |
| Client tasks go to a triage queue, not the board | Scope-creep protection |
| Clients invited by secure link, not emailed a password | A password in an inbox is a password in the next breach |
| WhatsApp: click-to-chat now, Cloud API later | Stage 1 is free and takes a day |
| Unofficial WhatsApp libraries rejected | Violate terms, number gets banned |
| No AI-tooling references anywhere in the repo | User instruction, absolute |
| Nothing about this project in any tool's memory, and nothing published or uploaded anywhere | Owner instruction, absolute. The repo is the memory; secrets never enter a chat — [privacy-rules.md](privacy-rules.md) |
| Images never cropped, covered, distorted or upscaled; every image field states its exact pixel size | Owner instruction, absolute, and it binds all three projects — [image-rules.md](image-rules.md) |
| Every screen responsive, phone to desktop, in every project | Owner instruction. A release blocker, not a polish pass — [responsive-rules.md](responsive-rules.md) |
| Skeletons wherever content loads, alongside the brand loader | Owner instruction. Two different waits, two different treatments — [loading-rules.md](loading-rules.md) |

---

## Open questions — need the owner's answer

| # | Question | Blocks | Default if unanswered |
|---|---|---|---|
| 1 | Git commit author name? Email is set to `apkavission@gmail.com`. | First commit | `Apka Saathi` — already configured repo-locally. **Still nothing committed.** |
| 2 | Company domain — decided yet? | Phase 4 | Placeholder `apkasaathitech.com`, single constant |
| 3 | Logo and brand colours? | Phase 1 polish | Neutral wordmark, provisional accent per mode |
| 4 | Vercel account created? **R2 is done** — bucket `apka-vission-storage`, private, verified 2026-08-27. Supabase is live and all migrations are applied. | Phase 4 | Vercel unconfigured; deploys are local-only until then |
| 5 | Hosting: all on Vercel Hobby now, Pro later? | Phase 4 | Hobby now, move company site to Pro when revenue starts |

---

## Needed from the owner before launch (phase 4)

Not blocking development. Fallbacks are in place for all of them.

- Company domain
- Logo (light + dark), brand colours
- Apka Saathi app screenshots (5–8) and feature list
- Founder's real project experience and technologies — **no invention; section stays
  hidden until real content exists**
- Phone, WhatsApp number, email, registered address, CIN, GST
- Working hours and office location
- Vercel and Resend accounts (Supabase and Cloudflare R2 are both done)

---


**Brand identity chosen and wired in.** Six early candidates and two later
families were compared; the handshake mark won on the only test that decides a
web logo — what survives at 24px — and on being the one candidate with a symbol
separable from its wordmark. The teal accent was kept over gold on measured
contrast: no gold is both recognisably gold and legible on `#fcfcfd`, whereas
`#0e7c7b` / `#2dd4bf` already pass in both themes.

The chosen files are true vector, in both themes, coloured from the design
tokens, with the wordmark converted to outlines and every `viewBox` trimmed to
its ink. Full reasoning and measurements: [brand-assets.md](brand-assets.md).

Wired end to end and verified in the production build:

- `public/brand/` — four SVGs: symbol and full lockup, light and dark.
- `seedBrandMedia()` in `scripts/seed.mjs` — upserts the four `media` rows,
  pairs them through `dark_variant_id`, and points
  `site_settings.logo_light_id` / `logo_dark_id` at the **symbol** pair.
- `src/lib/queries/brand.ts` — `getBrandLogos()`, one embedded read, cached
  under the site-settings tag.
- `src/components/site/brand-logo.tsx` — emits both themes; `.theme-light-only`
  / `.theme-dark-only` in `globals.css` hide one. No JavaScript, so the right
  mark is painted in the first frame.
- Header (30px) and footer (36px) pair the symbol with the company name. The
  full lockup is deliberately not used at those sizes — its tagline needs about
  380px of width to be legible.
- `src/app/icon.svg` (theme-aware via its own `prefers-color-scheme` block),
  `favicon.ico` (16/32/48, replacing the scaffold's default) and
  `apple-icon.png` (180×180).

Verified: `tsc --noEmit` clean, `npm run build` succeeds, and the prerendered
HTML for `/` contains both `<img>` variants at both placements plus all three
icon `<link>` tags.

**Two pieces of design work remain before this is finished:** the source files
carry free-floating trace specks that should be deleted, and there is still no
square lockup — so a 32px favicon letterboxes the mark to 18px of height. Both
are tracked in [brand-assets.md](brand-assets.md).


---

**Service pages and the SEO layer shipped.**

Routes, all prerendered:

| Route | Kind | Source |
|---|---|---|
| `/services` | static | `pages` row `services` + its sections |
| `/services/[slug]` | SSG × 7 | one `services` row each |
| `/sitemap.xml`, `/robots.txt` | static | `seo_defaults` + the service list |

- **`/services` holds no copy of its own.** Like the home page it renders from
  `page_sections` — hero, services grid, process, CTA — so the introduction is
  editable and the seven cards come from `company.services`. Publishing an
  eighth service adds it to the grid, the navigation and the sitemap at once,
  with no code change.
- **`/services/[slug]` is a template over the row.** Hero, what's included, who
  it's for, how we deliver, the stack, and the other six services. `Json`
  columns are narrowed through a `stringList` guard, so a malformed edit drops
  a block instead of crashing the page.
- **`generateStaticParams` prerenders all seven**, and `dynamicParams` is left
  at its default — a service published from the admin between deploys is
  rendered on first request rather than 404ing until someone redeploys.
- **`Service` JSON-LD per page**, with the offer omitted where a service is
  custom-quote. `Organization` JSON-LD once per document in the root layout,
  from `seo_defaults.organization_schema`.

The SEO layer:

- `src/lib/seo.ts` — `buildMetadata()`. Every public route goes through it, so
  the title template, the fallback description and the crawl switch stay
  admin-editable and are applied in exactly one place.
- **The root layout no longer declares `title.template`.** The template string
  is database content and `buildMetadata` applies it; a template at the root as
  well applied it twice, and `/services` would have rendered as
  `Software Development Services | Apka Saathi Private Limited | Apka Vission`.
- `seo_defaults` reseeded to the public brand. The column defaults named the
  legal entity — right on a contract, wrong in a browser tab.
- `robots.ts` and `sitemap.ts` both read `site_noindex`, so going live is one
  boolean and the meta tags, robots.txt and sitemap all follow.
- A shared `src/lib/queries/technologies.ts` replaces the query that was
  private to `tech-stack.tsx`; the service pages filter the same cached list
  rather than making seven more round trips.

**Verified both ways.** With `site_noindex` on (the current, pre-launch state):
`robots.txt` is `Disallow: /`, the sitemap is an empty urlset, and every page
carries `noindex, nofollow`. Flipped off and rebuilt: `robots.txt` allows and
names the sitemap, the sitemap lists 9 URLs, and pages carry `index, follow`.
Restored to on. `tsc --noEmit` clean; `npm run build` prerenders 15 routes.

**Known, pre-existing:** `npm run lint` reports 5 errors from the React
compiler rules — `header-nav.tsx`, `theme-provider.tsx` and `wave-scene.tsx`
(×3). None is in the new code and none is new; they will block CI when it is
set up.
---

## Risks

| Risk | Mitigation | Status |
|---|---|---|
| ~~Node v20.20.1 installed; `@supabase/supabase-js` wants Node ≥22~~ | — | ✅ **Closed 2026-08-27.** Local Node is now v24.19.0; the mismatch is gone |
| Vercel Hobby is non-commercial; company site is commercial | Move company site to Pro when revenue starts | Accepted, revisit at phase 4 |
| Supabase free has no restorable backups | Nightly export to R2, 30-day retention | ✅ **Closed 2026-08-28** — `/api/cron/backup` nightly at 03:30, plus `npm run db:backup` by hand. Verified live. **Not** `pg_dump`: neither this machine nor a Vercel function has that binary |
| Supabase free project pauses after 7 days idle | Daily keep-alive cron | ✅ **Closed 2026-08-28** — `/api/cron/keep-alive`, scheduled in `vercel.json`, verified live. Runs a real query, not a ping |
| Lead emails landing in spam, invisibly | SPF + DKIM + DMARC before first real send | Planned, phase 4 — **launch blocker** |
| Demo sites filling with junk visitor data | Nightly reset to seed data, write rate limits | Planned, phase 9 |
| Scope is large; risk of nothing shipping for months | Block A ships alone and earns before B and C start | Mitigated by ordering |
| 3D breaking the mobile performance budget | Quality scaled to the device, and refused outright on reduced motion, <4 cores, save-data, no WebGL2 or <360px. The scene unmounts when it scrolls away | ✅ **Built** — `scene-mount.tsx`. Not yet measured with Lighthouse on a real handset, which is the remaining half |
| DPDP Act 2023 compliance for lead data | Consent notice, retention policy, erasure process | Planned, phase 4 — **legal** |
