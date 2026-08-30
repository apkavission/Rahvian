# Starting the next session

Paste the block below as your first message. It is written so that a fresh
session picks up exactly where this one stopped, without you having to explain
any of it again.

---

## The prompt

> Demos ho chuke hain — paanchon. `c:\Users\kumar\services\docs\demos.md` aur
> `docs\demos-owner-tasks.md` padho.
>
> Ab ye karo:
>
> 1. **Sabki testing ek saath** — paanch demos, teen-teen variant, dono theme,
>    aur teeno purane app (services, portal, tracker). Browser me chala kar
>    dekho, screenshot lekar. Jo toote wo theek karo.
> 2. **Wide screen ka layout** — services, portal aur tracker me kai screen
>    1440px pe patli column me sikud kar aadha page khaali chhod dete hain. Rang
>    theek ho chuka hai, layout nahi.
> 3. **Demos ke liye browser tests** — abhi ek bhi nahi hai.
> 4. **Variant clone** — panel se ek business ki copy banane ka button. Abhi ye
>    database ka kaam hai.
>
> Niyam wahi: koi project doosre ka code import nahi karega, migration likh ke
> chalao aur phir database se verify karo, aur jo mera kaam ho wo
> `docs\demos-owner-tasks.md` me likhte jaana.

## What that session will need to know, and where it is written

Everything below is already in the repository. The prompt above points at it; this
list is here so nothing has to be rediscovered.

**The pattern to copy** — `c:\Users\kumar\demo-clinic`. Four migrations, a
`[variant]` route tree, `proxy.ts` doing the share-link check, `lib/theme.ts`
turning a stored palette into CSS, and a panel whose menu is built from the role.

**The design rules** — [demos.md](demos.md). The variant system, why both themes
are stored rather than derived, why the share-link check reads a row on every
request, and who may administer a demo.

**The estate's standing rules** — [privacy-rules.md](privacy-rules.md),
[brand rules](../../tracker/docs/brand-rules.md), and the one that shapes the
demos most: **no project imports another's code**. Plumbing is copied. A fix has
to be made in six places; a mistake stays in one.

**How migrations get applied.** Written into the demo's own
`supabase/migrations/`, then applied and verified against the live database.
Every demo schema must also be added to the exposed-schema list, or every query
answers `Invalid schema` while the tables sit there full of rows:

```sql
alter role authenticator set pgrst.db_schemas =
  'public, graphql_public, company, portal, demo_clinic, demo_resto, ...';
```

**Ports** — clinic 3300, restaurant 3400, school 3500, real estate 3600, CRM
3700. Services 3000, portal 3100, tracker 3200.

---

## What is still open outside the demos

Two things, both small and both deliberately left rather than forgotten:

**The layout on wide screens**, in the company website, the panel and the
tracker. The colours were fixed — light mode had no separation between the page
and the cards, which is why it looked flat — but several screens are still a
narrow column on a 1440px display with half the page empty. That is per-screen
design work rather than a token change.

**One sign-in**, to let the admin browser tests run:

```
cd tracker && node e2e/save-admin-session.mjs
cd portal  && node e2e/save-admin-session.mjs
```

Seventeen tests skip until then. The account is the owner's own, so its password
is deliberately in no file a test can read.
