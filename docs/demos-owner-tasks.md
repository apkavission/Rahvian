# The demos — what only you can do

**This file is now the demos' half of a bigger one.** Everything across all nine
applications — what was built, what was found wrong, and the ten SQL files
waiting — is in [estate-status.md](estate-status.md). Read that first; this is
the demo detail behind it.

**Six demos now, not five.** An online store was added on 2026-09-02, on port
3800, and it is the only one that transacts: a real basket, real stock, discount
codes and a checkout. Its migrations have not been run yet, which is why it
answers `Invalid schema` until you do.

Each demo now carries its own `docs/PROGRESS.md` and `docs/testing.md`, which
did not exist when this file was written.

---

## 1. Give yourself access to the demo panels — two minutes

Each demo panel refuses every account that does not carry that demo in its
applications list. Right now that is **everybody, including you** — which is
correct, and looks like a broken panel if you were not expecting it.

1. Company website admin → **Users** → your own account.
2. Under **Applications**, tick all six demos: clinic, resto, school, estate,
   crm, shop. The store only appears once its migration and the registry
   migration have been run.
3. Save.

Then open any panel and sign in with the same account you use everywhere else:

| | |
|---|---|
| Clinic | `http://localhost:3300/admin` |
| Restaurant | `http://localhost:3400/admin` |
| School | `http://localhost:3500/admin` |
| Property | `http://localhost:3600/admin` |
| CRM | `http://localhost:3700/admin` |
| Store | `http://localhost:3800/admin` |

Your role decides what you see. **Owner or super admin** gets the whole panel,
including *Businesses* and *Share links*. Anything else with demo access gets
content, enquiries and messages — the two super-admin screens are absent rather
than greyed out.

---

## 2. There is SQL to run now

**This section said "nothing to run in SQL" and that was true on 2026-08-30.**
Since then a sixth demo and five clone functions have been written, and none of
them is applied. The list, in order, is in
[estate-status.md](estate-status.md) §5 — or ask the database rather than a file:

```
cd services && npm run verify:estate
```

Sixteen migrations are applied and verified across the five older demos. Every schema was checked afterwards by asking it, as an anonymous
visitor, whether the content is readable and the enquiries are not:

```
cd services && npm run check:demos     # content readable, enquiries not
cd services && npm run check:queries   # every panel query runs on its own schema
```

The second one exists because of a real bug found on 2026-09-01: the four newer
panels were forked from the clinic and still asked for `services` and `doctors`,
which do not exist in their schemas. PostgREST refused the join, the page turned
the error into an empty list, and every dashboard showed no enquiries at all
while looking perfectly healthy. TypeScript could not see it — an embed is
unchecked when the generated types declare no relationships — so the check reads
the query out of the source file and asks the database.

**One thing was changed outside SQL and you should know about it.** A schema that
Supabase is not serving answers `Invalid schema` to every request, however full
of rows it is. The exposed list now reads:

```sql
alter role authenticator set pgrst.db_schemas =
  'public, graphql_public, company, portal, demo_clinic, demo_resto,
   demo_school, demo_estate, demo_crm';
```

The company website, the panel and the tracker were re-checked afterwards and are
unaffected. To undo it: `alter role authenticator reset pgrst.db_schemas;`

---

## 3. Try it — the clinic first, then one other

**As a visitor** — `http://localhost:3300`

- [ ] It lands on the dental clinic. Use **Viewing: Dental Clinic** in the top
      bar to switch to Cardiology and Eye Care. The whole site changes — name,
      colours, services, doctors, phone number.
- [ ] Switch to dark with the moon button. Each business has its own dark
      palette: cardiology goes rose rather than staying red, and the fine-dining
      restaurant on 3400 is gold on near-black.
- [ ] Book an appointment, and send a message from the contact page.

**As the panel** — `http://localhost:3300/admin`

- [ ] Your booking is there. Move it from *Requested* to *Confirmed*.
- [ ] **Content** → change a price, save, reload the public page. Already
      different.
- [ ] Untick *Shown on the site* for one service and watch it disappear from the
      public list.

**Share links** — super admin only

- [ ] **Share links** → create one for the Eye Care Hospital, lasting three days,
      labelled with a name you would recognise.
- [ ] Copy it, open it in a private window. It lands on eye care.
- [ ] From that window try `/dental` — it sends you back. Try `/admin` — the
      same.
- [ ] **Businesses** → set Eye Care to **Link only**. Open `/eyecare` in a third
      window with no link: *this link is no longer open*.
- [ ] Back in **Share links**, press **Close it**. Refresh the private window —
      dead immediately.

That last step is the one worth doing. It is the case the whole design is shaped
around: a link sent to the wrong person, closed ten minutes later.

**Then one more demo** — pick 3400 or 3600 and walk the same path. The point of
looking at a second one is to check it does not read like the clinic with the
words swapped: the restaurant asks how many are coming, the agency asks your
budget, the school asks which class and who the parent is.

---

## 4. Tell me what to fix

Anything that refused when it should not have, or allowed when it should not
have. The refusals are the half that matters — a screen that lets somebody do
something they should not is the bug nobody reports.

---

## What is deliberately not on this list

**Nothing is committed or pushed.** That stays yours.

**Nothing has left this machine.** No data of any kind — see
[privacy-rules.md](privacy-rules.md).

**Images.** Every demo runs on type, colour and layout alone: there is a `media`
table and no photographs in it. That is a content job — a stock photograph of a
smiling stranger would make these look like every other template, and a real
photograph of a real clinic would be a lie.

**Photographs.** Still true, and still deliberate.

~~**Cloning a business from the panel.**~~ Built on 2026-09-02 — it is a *Copy
this one* button on the Businesses screen of every demo. The walk lives in the
database because it has to be one transaction. It needs its migration run.

~~**Browser tests for the demos.**~~ Written on 2026-09-02: 42 per demo at
desktop and phone widths, 52 for the store. 210 are green; the store's cannot
run until its schema exists.
