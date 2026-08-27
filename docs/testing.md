# Testing — what exists, and what has never been checked

**Last updated: 2026-08-27.**

This file exists because "verified" was being used to mean two different things.
`tsc`, `npm run build` and a route returning 307 prove the code compiles and the
guard is wired. They prove nothing about whether a button does what its label
says. Both are written down here, separately, so neither gets mistaken for the
other.

---

## What runs today

| Command | What it actually checks |
|---|---|
| `npm run typecheck` | Types. Nothing about behaviour. |
| `npm run lint` | ESLint. 11 known problems in 7 pre-existing files — `services-grid`, `tech-stack`, `what-we-build`, `header-nav`, `theme-provider`, `vision-scene`, `wave-scene`, all from the React compiler rules. |
| `npm run build` | Every route compiles and every prerendered page renders against the live database. |
| `npm test` | Vitest. **22 tests, one file.** |

### The one test file

`src/lib/media/image-file.test.ts` — the image header parser, against bytes
assembled in the test plus the four committed brand SVGs and the apple touch
icon read off disk. It is tested because everything in
[image-rules.md](image-rules.md) is measured against what it returns.

`vitest.config.ts` was added at the same time. Before that the `npm test` script
existed with no config behind it, so it collected nothing and reported success.

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

## What has never been checked

Nothing below has been opened, clicked, or run. It is not known to be broken; it
is known not to have been looked at.

### Blocked on one thing

A browser click-through needs a signed-in session, and that needs the password
for **`kumarnitish4384@gmail.com`** — the test account. Not the owner account:
[the three-addresses rule](PROGRESS.md) puts every test login on that address.
The password is not in `.env.local` and `scripts/create-admin.mjs` deliberately
will not reset one; it comes from the Supabase dashboard or from the owner.

### The four screens, in a browser

| Screen | What to click |
|---|---|
| `/admin/pricing` | Create a plan · edit and save · the check-constraint message when publishing with no price and no custom-quote switch · duplicate (highlight must not carry across) · both move arrows · the delete dialog · the preview showing the whole row with drafts marked |
| `/admin/faqs` | The scope pills and their counts · the list filtering · **the bound move action** — arrows must reorder within one page, and the swap must be against what is on screen · create, which should attach to the filtered page · the preview accordion plus the hidden block underneath |
| `/admin/team` | Create · edit and save · duplicate (LinkedIn and GitHub must **not** carry across) · move · the delete dialog · the preview grid with drafts marked |
| `/admin/media` | **Upload a real file** · the dimension readout before sending · the under-400px warning · the over-8MB refusal · rename and re-save · the folder pills · the delete dialog naming what it will blank · the preview on white and on near-black |

### The image fields and the no-upscale rule

Wired 2026-08-27, none of it seen working:

- **A picker on every one of the nine fields** — the size printed before
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

Built 2026-08-27, none of it seen working — **and none of it can be, until the
two migrations are run.** Before them the screen renders from the roles compiled
into the application and every save fails on a missing column, which is the
expected behaviour and not the thing to test.

Once they are run, in this order:

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

- A screen-reader run (NVDA or VoiceOver) of the four new screens.
- The older gap, still open: the mobile menu and the FAQ accordion.
- The skeletons announcing once, not once per placeholder.

### Unit tests worth writing

Everything except the image parser is untested. In rough order of what would
catch a real bug:

1. **The record mappers** — `planToValues` / `valuesToRow` for pricing, FAQs,
   team and media. A round trip through both should return the row it started
   from. These are pure functions and the place a column gets silently dropped.
2. **The schemas** — the pricing cross-field rule, the slug and href patterns,
   the folder pattern, the optional-select accepting an empty string.
3. **`safeFilename`** — a JPEG named `.png` must be stored as `.jpg`; a name of
   nothing but punctuation must become `image`.
4. **`mediaUsageMap`** — the counting and the phrase-building.
5. **`aspectLabel`** — 1200 × 800 is "3:2"; 1201 × 800 is "1.50:1".

### No end-to-end harness

`@playwright/test` is in `devDependencies` and `npm run test:e2e` is a script,
but there is **no `playwright.config.ts` and no spec anywhere**. The command
would fail. If browser testing is going to happen more than once, this is the
thing to build first — the four screens above are exactly the flows a spec
should drive.

---

## The rule going forward

A screen is not "done" because it compiles. Say which of the two happened:

- **Compiles and builds** — `tsc`, `lint`, `build`, and any unit tests.
- **Verified** — someone signed in, clicked it, and looked at it in both themes
  and at phone width.

Where only the first has happened, say so in `PROGRESS.md` in those words, and
add the second to this file.
