# Apka Saathi Private Limited — Documentation

**Start here: [STATUS.md](STATUS.md)** — one page. Every project, how much is
built, how much is actually tested, and what is waiting on the owner. The
reasoning behind any line of it is in estate-status.md below.

**Where the whole estate stands right now, checked rather than remembered:**
**[estate-status.md](estate-status.md)** — all eight applications, every check
that was run and what it said, which SQL is outstanding (none), and the four
things only the owner can do. Written 2026-08-30.

**New session? Read these three files in this order:**

1. **[PROGRESS.md](PROGRESS.md)** — where the work currently stands. Read this first.
2. **[specs/2026-08-25-apkasaathi-design.md](specs/2026-08-25-apkasaathi-design.md)** —
   the full design specification. 25 sections. The authority on every architectural
   decision and why it was made.
3. **[plans/](plans/)** — task-by-task implementation plans. Pick the one PROGRESS.md
   names as current.

> **⚠ Before building any screen, in any project:** an image must never reach a
> page looking cut, covered, stretched, enlarged or blurry — and the admin panel
> must warn about a bad file in every place one can be chosen. This is the
> owner's standing instruction, it binds all three projects, and the way it is
> broken by accident is documented in **[image-rules.md](image-rules.md) → "The
> trap"**. Read that section before writing markup for any image.

**Then these three, before writing any UI.** Each is a standing instruction from
the owner, and each binds the task tracker and the demo repos as well as this one:

| File | Rule |
|---|---|
| **[image-rules.md](image-rules.md)** | Images are never cropped, covered, distorted or upscaled, and every image field states its exact pixel size |
| **[responsive-rules.md](responsive-rules.md)** | Every screen works from 360px up. A release blocker, not a polish pass |
| **[loading-rules.md](loading-rules.md)** | The brand loader for a wait the person caused; a shape-accurate skeleton for content that has not arrived |
| **[privacy-rules.md](privacy-rules.md)** | Nothing about this project in any tool's memory, nothing published or uploaded, no telemetry, and secrets never leave `.env.local` |

**The order of work is fixed, and it is the owner's**: build until nothing is
outstanding, **say plainly that everything is done**, mark it completed in the
phase table, and **only then** do the browser click-through, locally. Every
project also carries a counted percentage — done and left — at the end of every
session. Both rules are in [PROGRESS.md](PROGRESS.md), "finish, say so, then
test in a browser", and they bind the task tracker and the demo sites too.

**[testing.md](testing.md)** is the other one to know about: what is actually
tested, and the list of everything that has never been opened in a browser.
"It compiles" and "it works" are different claims and that file keeps them apart.
It is written up **as each screen is built** and run in one pass at the end —
the owner's decision, taken 2026-08-28.

**[owner-checklist.md](owner-checklist.md)** is the one to hand the owner: nine
steps covering everything on this site a developer cannot decide, from the
contact details to the switch that opens the site to search engines. Written in
plain language, in the order the work makes sense.

**[launch.md](launch.md)** is where everything held back for production lives —
accounts, the domain, the environment variables, deploy day in order. Nothing in
it is waiting on a developer. It is deliberately one file: a checklist spread
over three documents is a checklist half-remembered.

**[pre-production-cleanup.md](pre-production-cleanup.md)** is the one to read
before the site goes live: everything to fix, delete or rotate first, each with
the evidence for it. Section 1 is defects and the site should not launch with
any of them open — including a **soft 404** on every made-up record address,
confirmed in a production build.

---

## What this project is

Two things being built under one company:

| | What | Where |
|---|---|---|
| **Company website** | Services site + admin + client portal + messaging centre | `C:\Users\kumar\services` (this repo) |
| **Five demo apps** | Clinic, Restaurant, School, Real Estate, CRM — each with 3 industry variants | `demo-*`, beside this one (separate repos, later) |

Company website is being built and shipped **completely first**. Nothing else starts
until it is live and taking enquiries.

---

## Ground rules — these are absolute

1. **No AI-tooling fingerprints anywhere in the repository.** No tool-named folders,
   no references in code, comments, docs, `package.json`, README, meta tags, commit
   messages, commit authors, or contributors. Enforced through `.gitignore` and
   reviewed before every commit. Applies to the demo repos too.
2. **Everything stays local.** All source and assets on this machine. Secrets only
   in `.env.local` — never committed, never in a client bundle, never typed into a
   chat window. Nothing about this project goes into any tool's memory, profile or
   account; nothing is published, uploaded or shared to get a link; no telemetry or
   analytics is added without the owner's word. The only places project data may go
   are Supabase, Cloudflare R2, the mail sender and Vercel. Full rules:
   **[privacy-rules.md](privacy-rules.md)**.
3. **Nobody commits or pushes but the owner.** Not at the end of a piece of work,
   not as a tidy-up. Work is left in the working tree; `git status` reports it.
   A commit is the point at which ground rule 1 stops being fixable — an
   AI-tooling fingerprint in a working tree is a file to delete, and in a pushed
   commit it is history.
4. **`.env.example` and `.env.local` carry the same keys.** A variable added to
   one is added to the other in the same sitting — a documented variable that is
   not set is a feature that silently does nothing. Random secrets are generated
   on the spot; anything that comes from somebody's account is asked for by name.
   Values never leave `.env.local`.
5. **Truth in content.** No fake clients, testimonials, logos, statistics or awards.
   Product / Demo / Previous Experience / Client Project never mix. Some of this is
   enforced by database constraints — see spec Section 12.
6. **Speed is not negotiable.** Lighthouse mobile 90+, desktop 95+ on every public
   page. The visual ambition is delivered inside this budget, not in exchange for it.
7. **Everything dynamic.** No hardcoded copy, image, menu item, colour or logo in any
   component. All of it comes from the database and is editable from the admin.
8. **Both themes everywhere.** Dark and light are two designed themes, on every site,
   every variant, every admin panel.

---

## Directory map

```
C:\Users\kumar\services\
  docs\
    README.md              This file
    PROGRESS.md            Living state — always current
    specs\                 Design specification
    plans\                 Implementation plans
    decisions\             ADRs for anything decided after the spec was written
  src\                     Application code
  supabase\                Migrations and seed data
```

---

## How to resume work

1. Read `PROGRESS.md` — it names the current phase, the current plan file, the exact
   next task, and anything blocked.
2. Read the current plan file, find the first unchecked `- [ ]` step.
3. Continue from there.
4. **Update `PROGRESS.md` as you go.** It is the handoff. If it is stale, the next
   session starts blind.

## The demo portfolio

- **[demos.md](demos.md)** — the five demonstration applications, the variant
  system that makes one codebase run as three businesses, and the share links
  that open one of them for a limited time.
- **[demos-owner-tasks.md](demos-owner-tasks.md)** — the short list of things
  only the owner can do, and a walkthrough for trying it.
- **[next-session.md](next-session.md)** — the prompt to open the next session
  with, and what that session will need to know.
