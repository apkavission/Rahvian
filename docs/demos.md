# The demo portfolio

**What it is.** Five demonstration applications, each showing the same codebase
running as three completely different businesses. Fifteen visibly distinct sites
from five projects, every one of them working — the booking form books, the panel
shows it, the receptionist screen moves it along.

**Why it exists.** A prospect who is shown a slide deck is being asked to
imagine. A prospect who fills in a booking form on a site branded as their own
industry, and then watches their own request appear in a panel, has already seen
the thing they are buying.

---

## Where they live

| Project | Schema | Port | Businesses |
|---|---|---|---|
| `demo-clinic` | `demo_clinic` | 3300 | Dental Clinic, Cardiology Centre, Eye Care Hospital |
| `demo-restaurant` | `demo_resto` | 3400 | Fine Dining, Cafe and Bakery, Cloud Kitchen |
| `demo-school` | `demo_school` | 3500 | K-12 School, Coaching Institute, Degree College |
| `demo-realestate` | `demo_estate` | 3600 | Residential Broker, Commercial Property, Luxury Villas |
| `demo-crm` | `demo_crm` | 3700 | Sales CRM, Service Desk, Real Estate CRM |

Separate projects, separate schemas, separate deployments — a broken demo must
never take down the company site, and each one is a git repository of its own.
**No demo imports code from another project.** Where two of them need the same
plumbing it is copied, which is the estate's standing rule: a fix has to be made
in six places, and a mistake stays in one.

---

## The variant system, in one page

Every demo has one codebase, one schema, and several **variants**. A variant is a
whole business: name, logo, both colour palettes, navigation, every piece of
copy, services, staff, prices, reviews, questions, phone number, opening hours.

**Every content table carries `variant_id`, and is unique on `(variant_id,
slug)`** rather than on `slug` alone. That one decision is what allows three
clinics to each have a service called "consultation". Getting it wrong — a global
unique on `slug` — means the second business cannot have the same service name as
the first, which is absurd and is exactly what happens.

The variant is part of the path: `/dental/services`, `/cardiology/doctors`. Not a
query parameter and not a cookie, because a shared link must open the business
the sender was looking at.

### Both themes are stored, and neither is derived

`variants.theme` carries a light palette **and** a dark one, chosen separately:

```json
{
  "light": { "accent": "#0e7c7b", "bg": "#f5f8f8", "surface": "#ffffff", ... },
  "dark":  { "accent": "#2dd4bf", "bg": "#060b0b", "surface": "#0d1616", ... }
}
```

A colour that works on white almost never works on near-black. The cardiology
crimson reads as confident on a white page and as an error message on a dark one,
so the dark palette moves to a warmer rose. Deriving one from the other is how
demo sites end up looking broken in whichever mode nobody checked.

**The rule every palette must satisfy, in both modes:** the page is a step away
from the things sitting on it. In light the page is grey and cards are white; in
dark the page is near-black and cards are lifted above it. This was learned the
hard way in this estate's own applications, which ran for a fortnight with a page
at `#fcfcfd` under cards at `#ffffff` — two shades of white a printer cannot tell
apart, so nothing had edges and the whole panel looked unfinished in light mode.

---

## The link we send a prospect

Four properties, and each exists because of a specific way a demo link goes
wrong.

**It opens one business.** Otherwise the dental prospect finds the cardiology
site and concludes we sent the wrong link.

**It cannot reach the panel.** A prospect holding a share link is redirected away
from `/admin` before the sign-in page renders. They could not get in anyway — but
they should not find the door.

**It expires.** A link sent in March should not still be live in December,
quietly showing an old price list to somebody who found it in an old email.

**It can be closed now.** This is the one that matters: not the link expiring on
schedule, but the wrong link sent to the wrong person and noticed ten minutes
later. That is why the check is a database row read on every request rather than
a signed token — a signed token with the expiry baked in cannot be taken back.

The cookie a link leaves holds the token and nothing else. It is a hint about
*which* link to check, never a grant.

**Every failure looks the same from outside** — expired, closed, used up, never
existed all give the same screen. Telling them apart tells somebody probing which
tokens are real, and it is worth nothing to an honest visitor whose link does not
work either way.

A variant can also be marked **link-only**, which means the address alone gives
nothing: the only way in is a live link. One business per demo stays public so
the company site can link to a live example.

---

## Who can administer a demo

**There is no account list in any demo, and there must not be one.** The estate
has exactly one, in this project: `company.profiles`, with a role from
`company.roles` and an `app_access` array saying which applications each account
may reach.

A demo reads its own caller's row through a view (`demo_clinic.me`) and asks two
questions:

- is this account active, with `clinic` (or `resto`, `school`, …) in
  `app_access`? → **admin**: the content, and the appointments and messages that
  come in.
- does its role carry `is_owner`? → **super admin**: everything above, plus which
  businesses exist and who has been sent a link to which one.

The split is not cosmetic. Issuing a share link hands somebody outside the
company a view of our work; cloning a variant changes what every future prospect
sees. Both belong with whoever is accountable for the estate.

**Consequence, and it is the first thing to do:** an account with no `clinic` in
its `app_access` is refused by the demo panel — correctly, and silently as far as
they are concerned. Add the application to your own account under
**Users → your account → Applications** before expecting `/admin` to open.

---

## What is built, and what is not

### All five — complete

Every demo has, for each of its three businesses:

- **Real copy.** What it offers with prices written the way that trade writes
  them, the people behind it with one concrete thing each of them does, reviews
  **labelled as examples**, and the questions that trade actually gets asked.
- **A public site**: home, the offer list, the people, reviews, questions,
  contact, and an enquiry form that writes a real row.
- **A panel**: sign-in, a dashboard that differs by role, enquiries with a status
  somebody can move, messages, content editing per business, a public/link-only
  switch per business, and share links with create, copy and close.
- **Share links** with expiry, revocation and the link-only mode, checked in
  `proxy.ts` on every request.

The enquiry differs per demo because it has to: a restaurant asks how many are
coming, a school asks which class and who the parent is, an agency asks a budget,
a trial request asks the company and the team size. Those are the fields that
make an enquiry usable by whoever picks it up.

| Demo | Offers | People | Enquiry | States |
|---|---|---|---|---|
| Clinic | services | doctors | appointments | requested → confirmed → attended / missed |
| Restaurant | dishes | team | reservations | requested → confirmed → seated / no-show |
| School | courses | faculty | admissions | enquired → visited → admitted / lapsed |
| Property | listings | agents | viewings | requested → confirmed → viewed / no-show |
| CRM | features | team | trials | requested → contacted → started / lost |

The last column is worth reading. `missed`, `no_show`, `lapsed` and `lost` are
the states nobody puts in a demo and everybody needs in real life — a clinic's
no-show rate decides whether it takes deposits, and an agency's decides how a
week is planned.

**One check covers all five:**

```
cd services && npm run check:demos
```

It asks each schema, as an anonymous visitor, whether the content is readable and
the enquiries are not.

---

## Things worth knowing before touching this

**Every demo is `noindex`.** These are invented businesses with invented doctors
and invented prices. A search result for "Smile Care Dental Studio Patna" leading
a real patient to a demonstration is the one harm this application could do in
the world.

**Reviews are labelled as examples on the page itself**, not only in the small
print. Inventing a patient's testimonial and presenting it as genuine is the one
thing a demonstration must not do.

**A demo schema must be exposed to the API** before anything works. Supabase
serves only schemas on its exposed list; until `demo_clinic` was added, every
query answered `Invalid schema` while the tables sat there full of rows.

**Regenerate the types after every migration** — `npm run gen:types` in the demo.
The generator reads `information_schema` directly, because `supabase gen types`
needs either a management token with privileges this account does not have or
Docker, and a tool nobody can run is not a tool.
