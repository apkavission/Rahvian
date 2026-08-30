# The whole estate, checked — 2026-08-30

Eight applications, one database, seven schemas. This is what was verified, what
it said, what was wrong, and what is left for the owner.

**The short answer to the question that prompted it: there is no SQL left to
run.** Not "probably none" — the check reads every migration file in every
project and asks the database whether what it declares is actually there.

---

## 1. What is running

| | Application | Port | Its own progress |
|---|---|---|---|
| 1 | Company website and super admin | 3000 | [PROGRESS.md](PROGRESS.md) — 80% of block A |
| 2 | Internal panel | 3100 | `portal/docs/PROGRESS.md` — 24 of 24 |
| 3 | Task tracker | 3200 | `tracker/docs/PROGRESS.md` — 32 of 32 |
| 4 | Clinic demo | 3300 | `demo-clinic/docs/PROGRESS.md` — 83% |
| 5 | Restaurant demo | 3400 | `demo-restaurant/docs/PROGRESS.md` — 83% |
| 6 | School demo | 3500 | `demo-school/docs/PROGRESS.md` — 83% |
| 7 | Property demo | 3600 | `demo-realestate/docs/PROGRESS.md` — 83% |
| 8 | CRM demo | 3700 | `demo-crm/docs/PROGRESS.md` — 83% |

The five demos had no `PROGRESS.md` of their own until today, which broke the
standing rule that every project carries a counted percentage in its own file.
They have one each now, and a `docs/testing.md` each.

---

## 2. What was run, and what it said

Every one of these can be run again. That is the point of them — an answer you
can reproduce beats an answer you have to trust.

### The database

```
cd services && npm run verify:estate    40 applied · 14 not checkable · 0 to run
cd services && npm run check:effects    the 14, checked by what they produced
cd services && npm run check:demos      five schemas, asked as an anonymous visitor
cd services && npm run check:queries    every panel query, run on its own schema
cd portal   && npm run check:schema     23 things the code reads, by name
cd portal   && npm run check:policies   13 rules, tested by planting real rows
```

**`verify:estate` reads the SQL rather than trusting a list.** It parses every
migration file in all seven projects, extracts the schemas, tables, columns,
views and functions each one declares, and looks them up in the catalogue. It
also reads the whole project's SQL first, so a function deliberately dropped by
a later migration is not reported as a missing one.

It says plainly what it cannot see: fourteen files create no object that can be
looked up by name, because they only add policies, grants or seed rows. Those are
checked by `check:effects` instead — the catalogue rows arrived, the email
templates are there, every demo schema has its three businesses, no converted
request is missing its approval.

**One table has row-level security on and no policy at all**, and that is
correct: `company.form_submissions`, the rate-limiting table, is written only by
the service role and is meant to be unreachable by anybody signed in. It is now
named in the check with the reason, rather than reported as a failure every run —
a check that cries wolf is a check people learn to skip.

### The code

Typecheck, lint, unit tests and a production build, on all eight:

```
npm run typecheck && npm run lint && npm test && npm run build
```

**All eight pass all four.** Unit tests: 259 on the company site, and 27 in each
demo — which is 135 tests that did not exist this morning.

One caveat worth writing down, because it will happen again: **a production
build run while that project's dev server is up can fail for a reason that is
not a defect.** The build type-checks `.next/dev/types`, which the dev server is
regenerating underneath it, and the error reads `Cannot find name page`. The
company site failed exactly that way once and passed on the next run with
nothing changed. Build with the dev server stopped, or accept a re-run.

Every demo carried `"test": "vitest run"` and not one test file, so the script
failed on all five. A red result that means nothing is worse than no script: it
teaches whoever sees it that red is normal. They now test the rules a demo fails
*silently* on — a malformed palette must not take a site down mid-demonstration,
and a date must render identically on the server and in the browser.

### The browser

| | Result |
|---|---|
| Company website | **219 passed**, none skipped, in 3.9 minutes |
| Task tracker | **49 passed, 13 skipped** |
| Internal panel | **4 passed, 4 skipped** |

The company site's suite walks every public page at six widths, both themes, the
SEO layer and the admin, and it had not been run since the two master lists were
added. It has been now, and it is green.

**The 17 skipped tests are all waiting on the same thing** — a signed-in session
for the owner's own account, which is deliberately not a password in a file. One
minute each, and it is item 2 in the list below.

The five demos have no browser suite at all. That is the only phase not done in
any of them.

---

## 3. What was actually wrong

Three things, all found by the checks rather than by reading.

### A 500 on every page of the company site

Making the build output directory overridable — so a verification build could
run without disturbing a dev server — had a consequence nothing would predict.
**Tailwind v4 discovers its own sources and skips whatever git ignores.**
`/.next/` was ignored; the new `.next-verify` was not. So Tailwind scanned the
compiled build output, pulled class-shaped strings out of it, and emitted CSS
containing a raw control character:

```
Error: Parsing CSS source code failed — Unexpected token Delim('\u{e}')
```

Every page importing `globals.css` answered 500. **Typecheck, lint and every
unit test stayed green through it.** What found it was `curl` against the
running dev server — the cheapest check in this whole document, and the only one
that could have.

Fixed by ignoring `/.next-*/` everywhere, with the reason written beside the
rule so the next person adding an output directory does not repeat it.

### Four demos were not repositories

`demo-restaurant`, `demo-school`, `demo-realestate` and `demo-crm` had no `.git`
at all. Beyond the obvious — no history, nothing to commit, no way to see what
changed — Turbopack infers the workspace root by walking up until it finds a
lockfile, and with no repository boundary to stop it, it found a stray
`package.json` in `C:\Users\kumar` left by an unrelated install. An inferred root
that high means module resolution and file watching cover the entire home
directory.

Both fixed: each of the four is now a repository, **with nothing committed** —
committing stays the owner's — and all eight pin `turbopack.root` to themselves.

### Four demo panels asked for tables that do not exist

Found earlier in the week and worth repeating here, because it is the shape of
bug this estate is most exposed to. Four demo panels were forked from the clinic
and still embedded `services(name)` and `doctors(full_name)`. PostgREST refused
the join, the page turned the error into an empty list, and the dashboard showed
no enquiries while looking perfectly healthy.

TypeScript could not catch it — an embed is unchecked when the generated types
declare no relationships. `check:queries` now reads the select string **out of
the source file** and runs it, so it tests the query the code actually sends
rather than a copy of it.

---

## 4. What only the owner can do

Four things. None takes long.

### 1. Tick the five demos on your own account — two minutes

Company website admin → **Users** → your account → **Applications** → tick
clinic, resto, school, estate, crm → save.

Every demo panel refuses an account that does not carry that demo. Right now that
is everybody including you, which is correct and looks exactly like a broken
panel if you were not expecting it.

### 2. Sign in once for the browser tests — one minute each

```
cd tracker && node e2e/save-admin-session.mjs
cd portal  && node e2e/save-admin-session.mjs
```

A browser opens; sign in as yourself; it saves the session and closes. That
un-skips the 17 tests. The session expires after a few weeks and the specs say
so plainly rather than failing as though something broke.

### 3. Know about one change made outside SQL

A schema Supabase is not serving answers `Invalid schema` to every request,
however full of rows it is. The exposed list now reads:

```sql
alter role authenticator set pgrst.db_schemas =
  'public, graphql_public, company, portal, demo_clinic, demo_resto,
   demo_school, demo_estate, demo_crm';
notify pgrst, 'reload config';
```

To undo it: `alter role authenticator reset pgrst.db_schemas;`

### 4. Then walk the screens

Each project has its own click-through list, and the order is the owner's own
rule — build until nothing is left but this, then walk it once, on something
finished.

| | |
|---|---|
| Company website | [testing.md](testing.md) |
| Internal panel | `portal/docs/testing.md` |
| Task tracker | `tracker/docs/testing.md` |
| Each demo | `demo-*/docs/testing.md` |

---

## 5. What is not built, said plainly

**Phase 10, the super admin.** The `control` schema, an app registry, one inbox
across all eight applications, an audit log, an estate dashboard. Never started.
Eight panels are opened by hand today, and that is the cost of not having it.

**Ten of the fifteen planned demo sites.** Five exist, with three businesses
each. Stopping at five is a decision, not an oversight — but the plan said
fifteen and this file is where that difference gets recorded.

**Browser tests for the demos.** The only phase missing in all five.

**Photographs.** Every demo runs on type, colour and layout. There is a `media`
table and nothing in it.

**A clone button for variants.** Adding a fourth business to a demo is a database
job: the clone has to walk every table in dependency order and remap the ids.

**Wide-screen layout** in the company site, the panel and the tracker. They are
correct from 320px up and stop using the space above roughly 1600px.

**Anything committed or pushed, anywhere.** Eight repositories, all with
uncommitted work in them. That stays the owner's.
