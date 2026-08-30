# Where everything stands

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
| **Company website** | 3000 | **80%** | 259 ✅ | 219 ✅ | Phase 4 — launch. Almost none of it is code |
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
| **Browser tests** | **429 written**, **377 green**, 17 skipped, 52 never run |
| **The database, asked directly** | `verify:estate`, `check:effects`, `check:demos`, `check:queries`, `check:schema`, `check:policies` |

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
   un-skips the 17.
5. Walk the screens. Each project has its own `docs/testing.md`.

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

## 5. The four defects fixed on 2026-08-31

Three of them were invisible to every check that existed, which is the reason
each one is written down rather than just corrected.

| | What it was |
|---|---|
| **Every forked demo panel asked for the clinic's key** | `auth.ts` in four demos still read `includes("clinic")`. An account with `crm` and not `clinic` could not open its own panel; one with `clinic` could open all five. `APP_KEY` now sits beside `DB_SCHEMA` in the one file every fork has to edit |
| **A tick box that did something else** | The company admin offered "Task tracker". The tracker does not read that column at all — what the box actually unlocked was the property demo. Label corrected, value left alone so nobody lost access |
| **A 500 on every page of the company site** | Tailwind v4 finds its own sources and skips what git ignores. An unignored build directory got scanned and produced CSS containing a control character. Typecheck, lint and 259 unit tests stayed green through it; `curl` found it |
| **Apostrophes in `--` comments** | Two migrations that were never wrong, failing on paste. §3 |

---

## 6. Git

All nine repositories are committed on `main`, authored as
**Apka Vission &lt;apkavission@gmail.com&gt;**, each pointed at its GitHub remote.

**Nothing has been pushed.** Before committing, every file git would include was
scanned against the real values in the local `.env` files: **no key, password or
token appears in any of them.** What does appear, in documentation, is the
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
