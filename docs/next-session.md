# Starting the next session

Paste the block below as your first message. It is written so that a fresh
session picks up exactly where this one stopped, without you having to explain
any of it again.

**Everything on the previous version of this list is done.** The wide-screen
layout is fixed, all six demos have browser suites, and the clone button exists.
What is left is in [estate-status.md](estate-status.md), and most of it is not
code.

---

## The prompt

> `c:\Users\kumar\services\docs\estate-status.md` padho — poora estate wahi
> likha hai. Nau applications, aath schema.
>
> Pehle ek cheez batao: `cd services && npm run verify:estate` chala kar dekho
> kitni SQL baaki hai. Zero hai to maine sab chala di; nahi to mujhe list do aur
> aage mat badho.
>
> SQL chal chuki ho to ye karo, isi order me:
>
> 1. **Store demo ko pehli baar sach me chala kar dekho** — `demo-ecommerce`,
>    port 3800. Uski ek bhi line kabhi asli database ke saamne nahi chali.
>    `npm run gen:types` chalao, phir `npx playwright test` (52 tests), phir
>    `docs/testing.md` ki poori list — khaas kar basket, coupon aur checkout.
> 2. **Estate ke teen screen** — `/admin/estate`, uska inbox aur audit log.
>    Kabhi koi khola nahi hai. Inbox me kisi demo ka message dikhna chahiye jo
>    us demo ke apne panel me bhi ho.
> 3. **Clone button** — chhe demos me se kisi ek me ek business copy karke
>    dekho: poora aaya ya aadha, aur copy band (`link_only`, `is_active` false)
>    aayi ya nahi.
> 4. **`control.note` ke calls** — audit log bana hua hai aur khaali hai, kyunki
>    abhi koi action usme likhta nahi. Ye likhne chahiye: share link banana aur
>    band karna, variant clone, role badalna, account banana ya hatana.
>
> Niyam wahi: koi project doosre ka code import nahi karega, migration pehle
> transaction me chala kar rollback karke dikhao phir mujhe do, aur jo mera kaam
> ho wo `docs\estate-status.md` §5 me likhte jaana.

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
