# Apka Saathi Private Limited — Documentation

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

**[testing.md](testing.md)** is the other one to know about: what is actually
tested, and the list of everything that has never been opened in a browser.
"It compiles" and "it works" are different claims and that file keeps them apart.

---

## What this project is

Two things being built under one company:

| | What | Where |
|---|---|---|
| **Company website** | Services site + admin + client portal + messaging centre | `D:\services` (this repo) |
| **Five demo apps** | Clinic, Restaurant, School, Real Estate, CRM — each with 3 industry variants | `D:\demo-*` (separate repos, later) |

Company website is being built and shipped **completely first**. Nothing else starts
until it is live and taking enquiries.

---

## Ground rules — these are absolute

1. **No AI-tooling fingerprints anywhere in the repository.** No tool-named folders,
   no references in code, comments, docs, `package.json`, README, meta tags, commit
   messages, commit authors, or contributors. Enforced through `.gitignore` and
   reviewed before every commit. Applies to the demo repos too.
2. **Everything stays local.** All source and assets on the D: drive. Secrets only in
   `.env.local`, never committed, never in a client bundle.
3. **Truth in content.** No fake clients, testimonials, logos, statistics or awards.
   Product / Demo / Previous Experience / Client Project never mix. Some of this is
   enforced by database constraints — see spec Section 12.
4. **Speed is not negotiable.** Lighthouse mobile 90+, desktop 95+ on every public
   page. The visual ambition is delivered inside this budget, not in exchange for it.
5. **Everything dynamic.** No hardcoded copy, image, menu item, colour or logo in any
   component. All of it comes from the database and is editable from the admin.
6. **Both themes everywhere.** Dark and light are two designed themes, on every site,
   every variant, every admin panel.

---

## Directory map

```
D:\services\
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
