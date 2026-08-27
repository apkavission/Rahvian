# Apka Saathi Private Limited — Company Website & Demo Portfolio
## Design Specification

- **Date:** 2026-08-25
- **Status:** Draft — awaiting review
- **Scope:** Company services website (public + admin + super admin) and five demo
  projects, each with a public site, an admin panel, and multiple industry variants

---

## 1. Goals and Non-Negotiables

### 1.1 What we are building

A company website that presents Apka Saathi Private Limited as a software services
company, generates business enquiries, and demonstrates capability through five
self-built demo applications. Everything visible on every site — text, images, logo,
navigation, colours, section order — is editable from an admin panel without
touching code.

Five things make this more than a website:

1. **Industry variants.** Selecting "Dental Clinic" turns the clinic demo into a
   dental clinic: logo, name, colours, menu, copy, images and data all change.
   Selecting "Cardiology" turns the same codebase into a heart-care centre. A live
   prospect sees their own industry on screen within a second.
2. **A visual standard that stops people.** Cinematic 3D, scroll-driven motion, and
   micro-interaction detail on every control — delivered without breaking the speed
   budget. The site itself is the strongest sales argument we have.
3. **One super admin.** Every demo's admin panel is controlled from a single super
   admin inside the company website. One login, one inbox, one place to see and
   manage all six applications. Section 14.
4. **A client portal and task tracker.** Every signed client receives a login. They
   see their project's phases, live progress, which developer is assigned, what is
   done and what remains; they raise requests, approve deliverables, and chat with
   the team in real time. Developers work the same data from a board. Section 24.
5. **A messaging centre.** Email and WhatsApp sent from inside the admin, with
   replies landing back in the same threaded inbox. Section 25.

### 1.2 Non-negotiables

These constraints govern every decision below. When decisions conflict, the higher
rule wins.

1. **Truth.** No fake clients, testimonials, logos, statistics, awards, or revenue
   figures. Categories never mix: Product, Demo, Previous Experience, Client Project.
2. **Speed with the spectacle.** Lighthouse mobile performance stays at 90 or above,
   desktop at 95 or above, on every public page. The visual ambition is delivered
   *within* this budget, not in exchange for it. Section 9 and Section 17 specify how.
3. **Dynamic content.** No hardcoded copy, image path, menu item, colour, or logo in
   any component. All of it comes from the database.
4. **Both themes, everywhere.** Dark and light are equal first-class designs on every
   site, every variant, and every admin panel. Neither is an afterthought or an
   inverted afterimage of the other.
5. **SEO.** Every public page renders complete HTML on the server with correct
   metadata and structured data before any JavaScript runs.
6. **Local first.** All source, assets and secrets live on the D: drive. Secrets only
   in `.env.local`, never in source, never in client bundles.
7. **Free-tier viable.** The whole system runs on Supabase free, Vercel hobby,
   Cloudflare R2 free and Resend free at launch.

### 1.3 Resolving the tension in the brief

The source brief says "avoid excessive gradients, random animations, overly flashy
templates". The instruction now is that the UI must stop people in their tracks.

These are not in conflict once stated precisely. What the brief rejects is *cheap*
spectacle — decoration applied at random, motion with no meaning, gradients standing
in for design. What we are building is *expensive-feeling* spectacle: restrained
palette, generous whitespace, exceptional typography, and then a small number of
genuinely cinematic moments executed to a very high standard.

The working rule: **every animation must be triggered by the user and must explain
something.** Nothing loops for decoration. Nothing moves without being watched.

### 1.4 Explicitly out of scope for v1

Careers portal, multi-language, client login portal, invoice generation, proposal
generation, live chat, payment collection. The schema leaves room for these; we do
not build them now.

---

## 2. Repository and Folder Architecture

Six independent applications on the D: drive, each its own git repository and its own
Vercel project.

```
D:\services\                  Company website + SUPER ADMIN   Vercel #1
D:\demo-clinic\               Clinic demo    (public + admin)  Vercel #2
D:\demo-restaurant\           Restaurant demo(public + admin)  Vercel #3
D:\demo-school\               School demo    (public + admin)  Vercel #4
D:\demo-realestate\           Real estate    (public + admin)  Vercel #5
D:\demo-crm\                  Business CRM   (public + admin)  Vercel #6
D:\apkasaathi-shared\         Shared package, consumed by all six
```

### 2.1 Why separate repositories rather than a monorepo

Each site deploys to its own domain on its own schedule. A broken demo must never
block a company-site deploy. Vercel hobby treats each as a separate project, keeping
build minutes independent. The shared package is consumed by file path during
development (`npm link`) and pinned by version at build time.

### 2.2 Structure inside every application

Identical across all six, so knowledge transfers between them.

```
<app>\
  src\
    app\
      (site)\                 Public routes. Server Components by default.
        layout.tsx            Loads variant, branding, theme, nav, footer from DB
        page.tsx
      admin\
        layout.tsx            Auth gate
        (dashboard)\
        super\                Company app only — cross-app control plane
        login\
      api\
        revalidate\           Cross-app cache invalidation (demo apps)
        upload\               Presigned R2 URLs
      sitemap.ts
      robots.ts
      opengraph-image.tsx
    components\
      sections\               One component per page-section type
      ui\                     Primitives. No business logic.
      motion\                 Reveal, parallax, counter, text-split primitives
      three\                  Scenes, materials, loaders, poster fallbacks
      admin\
      seo\
    lib\
      supabase\               server.ts, client.ts, admin.ts, control.ts
      variant\                Resolution, theming, scoped queries
      theme\                  Token resolution, mode script, contrast checks
      queries\                All DB reads, each wrapped in a cache tag
      mutations\              All DB writes, each invalidating its tags
      validation\             Zod schemas, shared by form and server action
      seo\
      r2\
    types\
      database.ts             Generated from Supabase, never hand-edited
  public\
  .env.local                  Never committed
  .env.example                Committed, values blank
```

### 2.3 Shared package contents

`D:\apkasaathi-shared\` holds only what genuinely repeats across all six apps.

- Design tokens for light and dark as a Tailwind preset
- Runtime theming layer that overrides tokens from a variant's theme record
- Theme mode provider, flash-free init script, and mode toggle
- UI primitives: Button, Input, Select, Textarea, Card, Badge, Dialog, Toast, Tabs
- Brand loader (overlay, spinner, busy provider) and the `vision` WebGL scene
- Motion primitives: Reveal, StaggerGroup, TextSplit, Counter, Marquee, Magnetic,
  Tilt, ScrollProgress, PageTransition
- Three.js runtime: canvas wrapper, capability detection, poster fallback, loaders
- Admin shell: sidebar, topbar, data table, pagination, filter bar, image picker
- Variant switcher components, public and admin
- Supabase client factories and auth helpers
- SEO helpers: `buildMetadata()`, JSON-LD builders
- R2 upload helper and image URL builder
- Form primitives wired to Zod and react-hook-form

It does **not** hold page sections or business logic. A clinic's appointment section
has nothing to do with a CRM's pipeline view.

---

## 3. Backend Architecture

### 3.1 One Supabase project, seven schemas

Supabase free tier allows two active projects per organisation, so six separate
projects is not possible. Instead: one project, one Postgres database, isolated
schemas.

| Schema | Purpose |
|---|---|
| `company` | D:\services — company site content, leads, users |
| `control` | Super admin control plane, app registry, audit log |
| `demo_clinic` | D:\demo-clinic |
| `demo_resto` | D:\demo-restaurant |
| `demo_school` | D:\demo-school |
| `demo_estate` | D:\demo-realestate |
| `demo_crm` | D:\demo-crm |

Each app connects with a role whose `search_path` and grants cover only its own
schema. Row Level Security is enabled on every table in every schema. A demo app that
is compromised cannot read company leads.

`auth.users` is shared, which is what we want: one login across all six admin panels
and the super admin. Authorisation per app comes from a `profiles` row carrying an
`app_access` array.

### 3.2 Why no separate Node/NestJS server

Everything the sites need — form intake, admin mutations, upload signing, email
dispatch, cross-app control — fits in Next.js Server Actions and Route Handlers. A
separate server would add a host to pay for, a deploy to maintain and a network hop,
with no capability gained. The brief's instruction stands.

### 3.3 Storage

Cloudflare R2 for all media: images, 3D `.glb` models, video posters, PDFs. Free tier
gives 10 GB and zero egress cost, against Supabase Storage's 1 GB. With fifteen
variants of imagery plus 3D assets and pre-rendered hero footage, this margin is
decisive.

Upload flow: admin requests a presigned PUT URL from a Route Handler (which checks
auth), the browser uploads directly to R2, then the handler records a row in `media`.
The R2 secret never reaches the browser. Public reads go through a Cloudflare custom
domain in front of the bucket, so everything is CDN-cached.

### 3.4 Email

> **Three addresses, and no fourth.** Anything sent while testing — a form
> submission, a template preview, a bounce check — goes to
> `kumarnitish4384@gmail.com`. `apkavission@gmail.com` is the project's own
> address, used for git authorship and wherever a document names the owner's
> contact. `info@apkasaathi.com` stays the business address that real enquiries
> reach. The owner's personal mailbox is none of these and is never written
> down anywhere — not in code, not in configuration, and never in seed or demo
> data.

Resend, free tier, 3000 emails per month. Templates: internal lead notification,
enquirer acknowledgement, and a daily super-admin digest of all activity across the
six apps. Sending happens after the database write, and a send failure never fails
the form submission — the lead is already saved.

---

## 4. How "Everything Dynamic" Works Without Losing Speed

This is the central architectural decision. Read it before anything else.

### 4.1 The problem

Fully dynamic content normally means a database query on every page view, which means
no static caching, which means slow pages and poor Core Web Vitals. That directly
contradicts non-negotiable #2.

### 4.2 The solution: tagged cache with admin-triggered invalidation

Every database read is wrapped in Next.js `unstable_cache` with a named tag and an
indefinite lifetime. Pages render statically and stay cached at the edge. Every admin
write calls `revalidateTag()` for the tags it affects.

```
Visitor  ->  edge cache hit  ->  no database call, no server render
Admin saves logo  ->  revalidateTag('branding:dental')  ->  that cache cleared
Next visitor  ->  one server render  ->  new logo  ->  cached again
```

Content changes appear within seconds of saving, and visitors still receive
statically-served HTML.

### 4.3 Cross-app invalidation

When the super admin edits a demo from the company app, that demo's Next.js cache
lives on a different Vercel deployment and must be told to clear.

Each demo exposes `POST /api/revalidate`, authenticated by a shared secret header,
accepting a list of tags. The super admin's mutation layer calls it after every write.
Failures are queued and retried, and a stale-cache warning appears in the super admin
if a call has not succeeded.

### 4.4 Tag registry

Tags are declared in one file so invalidation is never guessed. In demo apps every tag
is suffixed with the variant slug, so editing the dental variant never invalidates the
cardiology variant's cache.

| Tag | Invalidated when |
|---|---|
| `site-settings` | Contact details, feature toggles change |
| `branding:<variant>` | Logo, name, colours, fonts, theme of that variant change |
| `navigation:<variant>` | Any menu item added, edited, reordered, hidden |
| `page:<variant>:<slug>` | That page or any of its sections change |
| `services`, `service:<slug>` | Services change |
| `projects`, `blog`, `post:<slug>` | Portfolio or blog content changes |
| `faqs`, `tech-stack`, `process`, `pricing`, `testimonials`, `team` | Respective table changes |

### 4.5 The page-section model

A page is a row in `pages` plus an ordered list of rows in `page_sections`. Each
section row has a `type` and a `content` JSONB payload. The renderer maps type to
component.

```
pages: { slug: 'home', variant_id: <dental>, title: 'Home', ... }
page_sections:
  { type: 'hero_3d',       sort: 1, content: { heading, sub, cta_primary, ... } }
  { type: 'services_grid', sort: 2, content: { heading, service_ids: [...] } }
  { type: 'doctors',       sort: 3, content: { heading, doctor_ids: [...] } }
```

The admin offers a section library. The owner can add, reorder by drag, hide, or
delete a section on any page without a developer.

Each section type has a Zod schema. The admin form is generated from that schema, so
adding a section type means one component plus one Zod schema, and the admin UI
appears automatically.

### 4.6 Section type registry (company site v1)

`hero_3d`, `hero_simple`, `what_we_build_bento`, `services_grid`,
`service_detail_intro`, `why_choose_us`, `product_showcase_3d`, `demo_projects`,
`founder_experience`, `process_scroll`, `tech_stack_marquee`, `stats_strip`,
`pricing_table`, `faq`, `blog_teaser`, `testimonials`, `cta_band`, `rich_text`,
`image_text_split`, `contact_block`, `lead_form`, `map_embed`.

Adding more later requires no schema migration, only a new component and Zod schema.

---

## 5. The Variant System

This is what makes a single demo codebase show a dental clinic to one prospect and a
cardiology centre to the next.

### 5.1 The idea

Every demo app has one codebase, one schema, and several **variants**. A variant is a
complete, self-contained content set: brand identity, theme in both modes, navigation,
pages, sections, images and all domain data. Switching variant swaps the entire
visible site. Nothing is shared between variants except the code.

```
demo-clinic  ->  variant 'dental'      Smile Care Dental Studio   (teal, rounded)
             ->  variant 'cardiology'  HeartLine Cardiac Centre   (crimson, sharp)
             ->  variant 'eyecare'     ClearView Eye Hospital     (indigo, soft)
```

### 5.2 Data model

Every demo schema carries a `variants` table, and **every content table in that schema
has a `variant_id` foreign key** with a composite unique constraint on
`(variant_id, slug)`.

**`variants`**
`slug (unique)`, `name`, `industry_label`, `business_name`, `tagline`, `description`,
`logo_light_id`, `logo_dark_id`, `favicon_id`, `og_image_id`, `theme jsonb`,
`contact jsonb`, `features jsonb`, `default_mode`, `allow_mode_toggle`, `noindex`,
`is_default`, `is_active`, `sort_order`

The `theme` payload carries **both modes**, because a colour that works on white
rarely works on near-black:

```json
{
  "light": {
    "accent": "#0E7C7B", "accentFg": "#FFFFFF",
    "bg": "#FFFFFF", "surface": "#F7F8F8", "text": "#0B1220"
  },
  "dark": {
    "accent": "#2DD4BF", "accentFg": "#04201F",
    "bg": "#07090C", "surface": "#0E1218", "text": "#E8EDF4"
  },
  "headingFont": "Sora", "bodyFont": "Inter",
  "radius": "lg", "heroStyle": "split-image", "grain": true
}
```

The `contact` payload holds that variant's phone, WhatsApp, email, address, map embed,
working hours and social links, so even the footer is variant-specific.

### 5.3 Resolution and routing

The variant is part of the URL path, which keeps every variant independently linkable,
shareable and cacheable:

```
/                      -> redirects to the default variant
/dental                -> dental home
/dental/services       -> dental services
/dental/appointments   -> dental booking
/cardiology/doctors    -> cardiology doctors
```

Implemented as a dynamic `[variant]` segment. `generateStaticParams()` enumerates
active variants at build, so every variant's pages are statically generated.
Middleware validates the segment and redirects unknown slugs to the default.

Query parameters and cookies are deliberately not used. A query parameter produces
duplicate URLs and confuses caching; a cookie makes a shared link show the wrong
industry to the person you sent it to.

### 5.4 The variant switcher

**Public:** a compact control inside the demo banner — "Viewing: Dental Clinic ▾" —
listing available industries. Selecting one navigates to that variant's equivalent
page, animated through the View Transitions API so the brand appears to morph rather
than reload. This is the sales moment.

**Admin:** a variant selector pinned in the sidebar header. Everything below it is
scoped to the selected variant. All queries and mutations carry the `variant_id`,
enforced in the data layer, so cross-variant edits are structurally impossible.

### 5.5 Cloning a variant

The highest-value admin action. "Clone variant" copies every row belonging to the
source variant — branding, theme, navigation, pages, sections, media references and
domain data — under a new variant with a new slug. The owner then edits names, colours
and images.

Result: a new industry demo in roughly thirty minutes of content editing, no developer
involved. When a prospect from an unusual niche appears, we can build their version
before the second meeting.

Implemented as one Postgres function per schema, running inside a transaction, walking
tables in dependency order and remapping foreign keys through an in-memory id map.

### 5.6 Planned variants

Three per demo at launch, more added later by cloning.

| Demo | Variants |
|---|---|
| Clinic | Dental Clinic, Cardiology Centre, Eye Care Hospital |
| Restaurant | Fine Dining, Cafe and Bakery, Cloud Kitchen |
| School | K-12 School, Coaching Institute, Degree College |
| Real Estate | Residential Broker, Commercial Property, Luxury Villas |
| CRM | Sales CRM, Service Desk CRM, Real Estate CRM |

Fifteen visibly distinct sites, each in two theme modes, from five codebases.

### 5.7 What varies and what does not

**Varies:** business name, logo (per mode), favicon, both colour schemes, fonts,
corner radius, hero style, navigation, every piece of copy, every image, services,
staff, pricing, testimonials, FAQs, contact details, seed domain data.

**Does not vary:** the feature set and page structure. A clinic variant does not gain
a feature the other clinic variants lack. Genuinely industry-specific behaviour is
toggled through the `features` flag rather than forked into new code.

### 5.8 Cost of this decision

Roughly 20% additional engineering in phase 4 to build the variant layer, clone
function and switcher. Every subsequent variant then costs content-entry time rather
than development time. The clinic demo alone repays it at the second variant.

---

## 6. Theme System — Dark and Light

Dark and light are two designs, not one design and its inverse. Both are drawn, both
are reviewed, both ship.

### 6.1 Token architecture

Every colour is a CSS custom property defined once per mode. Nothing in any component
references a hex value.

| Group | Tokens |
|---|---|
| Surface | `--bg`, `--surface`, `--surface-2`, `--surface-3`, `--overlay` |
| Border | `--border`, `--border-strong`, `--ring` |
| Text | `--text`, `--text-muted`, `--text-subtle`, `--text-inverse` |
| Accent | `--accent`, `--accent-hover`, `--accent-fg`, `--accent-soft` |
| Semantic | `--success`, `--warning`, `--danger`, `--info`, each with `-soft`, `-fg` |
| Depth | `--shadow-1/2/3`, `--glow`, `--highlight` |

The Tailwind preset in the shared package maps utilities to these variables, so
`bg-surface` and `text-muted` behave correctly in both modes with no `dark:` prefix
anywhere in application code.

### 6.2 What actually changes between modes

Not just colours. Dark mode is where a technology site looks most expensive, so it
gets the more considered treatment:

- **Depth inverts.** Light mode uses shadows for elevation; dark mode uses a lighter
  surface plus a 1px top highlight border, because shadows are invisible on near-black.
- **Accent shifts.** A colour readable on white is usually too dark on near-black. Each
  variant stores a separate accent per mode, validated for contrast.
- **Images swap.** `logo_light_id` and `logo_dark_id` are separate records. Screenshots
  and illustrations can carry a dark counterpart; where one is absent, a subtle
  brightness and contrast adjustment is applied through CSS rather than shipping a
  wrong-looking asset.
- **3D scene changes.** Different environment map, material roughness, emissive
  intensity and fog. The dark scene reads as glass and light; the light scene reads as
  matte and clean. Section 9.
- **Grain and glow.** Dark mode carries a faint film grain overlay and soft accent glow
  behind focal elements. Light mode carries neither — it would look dirty.
- **Never pure values.** Never `#000` and never `#FFF`. Near-black `#07090C` and
  off-white `#FCFCFD`, which is what keeps large surfaces comfortable to read.

### 6.3 Mode resolution, without the flash

Three states: `light`, `dark`, `system`. Default is `system`.

1. A tiny blocking inline script in `<head>` — under 500 bytes, no dependency — reads
   `localStorage.theme`, falls back to `prefers-color-scheme`, and stamps
   `data-theme` on `<html>` before the first paint.
2. `color-scheme` is set so native form controls and scrollbars match immediately.
3. The server-rendered HTML already carries the variant's theme variables, so branding
   colours never flash either.
4. The toggle writes `localStorage` and updates the attribute. No reload, no
   re-fetch, no layout shift.
5. Mode transitions animate through the View Transitions API where supported — a
   200ms cross-fade rather than a hard snap — and fall back to an instant switch.

### 6.4 Coverage

Both modes ship on: the company public site, the company admin, the super admin, every
demo public site, every demo admin, every variant, every email template (via
`prefers-color-scheme` media queries), every generated OG image (mode-appropriate
version generated per route), and the 404 and error pages.

### 6.5 Admin control

Per variant: `default_mode` (light, dark or system) and `allow_mode_toggle`. So a
cardiology variant can default to light and a CRM variant can default to dark, each
matching its industry's expectation.

The branding editor's colour picker runs a live WCAG contrast check for **both** modes
and refuses to save a combination falling below 4.5:1 against its foreground. This is
how fifteen variants stay accessible without fifteen manual audits.

---

## 7. Design System and Visual Language

### 7.1 The target

A visitor should feel they are looking at the site of a company that is more expensive
than they expected. That feeling comes from restraint executed precisely, not from
volume of effect.

Reference standard: the product sites of Linear, Vercel, Stripe and Framer. Dark,
typographically confident, enormous whitespace, one accent used sparingly, and two or
three moments of real craft that people remember.

### 7.2 Layout

- 12-column grid, 1280px container, generous responsive gutters
- Vertical rhythm on a 4px base; sections breathe at 96–160px on desktop
- Asymmetry used deliberately — content rarely centred by default
- Bento grid for "What We Build": tiles of different sizes, each with its own small
  interaction, which reads as far more considered than a row of identical cards
- Sticky-scroll storytelling for the process section: the visual pins while steps
  advance beside it

### 7.3 Typography

Type carries most of the impression, so it gets the most attention.

- **Display and headings:** a distinctive geometric or grotesque sans with tight
  tracking at large sizes. Candidates: Sora, Satoshi, General Sans, Cabinet Grotesk.
- **Body:** Inter, optically sized, with `font-feature-settings` for tabular numerals
  in data contexts.
- **Mono:** JetBrains Mono for code samples and technical labels.
- Fluid scale with `clamp()`; the display size is genuinely large on desktop —
  restraint everywhere else earns it.
- Self-hosted through `next/font`. No external request, no layout shift.
- Optical corrections applied: negative tracking above 32px, balanced text wrapping on
  headings via `text-wrap: balance`, and a maximum measure of 68 characters on body.

Variants choose from a curated set of six pairings, all self-hosted, so no variant can
produce a bad combination.

### 7.4 Colour discipline

Neutral-dominant. One accent. The accent appears on primary actions, active states,
focus rings and a small number of highlight moments — nowhere else. Gradients are used
only as very low-contrast atmospheric washes behind dark sections, never on text and
never on buttons.

### 7.5 Surface craft

The details that separate expensive from ordinary:

- 1px borders at low opacity, with a brighter top edge on elevated dark surfaces to
  simulate a light source
- Layered shadows (two or three stacked at different blurs) rather than one soft blob
- A faint noise or grain texture over dark backgrounds at roughly 3% opacity, which
  removes banding and adds perceived depth
- Frosted-glass headers with `backdrop-filter`, applied only where content scrolls
  behind them
- Rounded corners consistent to the variant's radius token, never mixed arbitrarily

### 7.6 Accessibility

WCAG 2.1 AA in both modes. 4.5:1 on body text, 3:1 on large text and UI boundaries,
visible focus rings that survive both themes, full keyboard navigation, correct ARIA on
menus and dialogs, one H1 per page, ordered headings, and alt text mandatory at upload.

Every motion effect respects `prefers-reduced-motion`; the reduced variant is designed,
not merely disabled — content still reveals, it simply appears rather than travels.

---

### 7.7 The loader — one wait screen, everywhere

There is exactly one loader in the estate. Not one per application, not a
variant for route changes and another for saves: the same component, the same
gesture, the same colours, on the company site, in the admin, in the client
portal and in every demo. A visitor who waits twice sees the same thing twice.

**The animation.** The mark sits in the centre. The two halves of the name
come out from behind it and settle outward — "Apka" to the left, "Vission" to
the right — so the name appears to emerge from the logo rather than fly at it.
Underneath, the mark's own rising arrow draws itself and clears, looping for as
long as the wait lasts. A sliding progress bar sat there first and was replaced:
a generic indicator under a brand lockup is the one part of the screen that
could have belonged to any product.

**Behind the lockup, a WebGL field.** The `vision` scene: an elliptical field of
points that reads as an iris, drifting on a slow path the way an eye does when
it is watching something rather than staring, blinking every few seconds, and
then drawing the arrow through itself. The blink is what makes the shape read
as *someone looking*; without it the same ellipse is a decoration. The brand is
called Vission and its mark is a rising arrow, so the wait animates exactly
what the name means — look, then move.

The scene is scoped to the lockup, never to the whole overlay: centred on the
container it drifts down over the copy on the not-found and error screens and
fights it for the same pixels. The hero's `assemble` scene was tried here first
and was wrong — it renders the words itself, so a second, half-formed "Apka
Vission" sat behind the real one and read as a rendering fault.

**It is an overlay, not a replacement.** The loader lies over whatever is
already on screen, dimmed and blurred behind it. The header, the form being
submitted and everything else stay where they were, so a wait reads as "this is
working" rather than as "your page is gone".

**Where it appears.**

| Wait | How |
|---|---|
| Navigation, reload, a segment fetching data (`GET`) | `loading.tsx`, at the root and in each route group |
| A write — `POST`, `PUT`, `PATCH`, `DELETE` | `BusyProvider` / `useBusy()`; anything that writes calls `start()` and `stop()`, or wraps the call in `run()` |
| Not found | `not-found.tsx` — the same overlay, carrying the message and the way out instead of a wait |
| A route that threw | `error.tsx` — likewise, with one retry button |
| The root layout itself failing | `global-error.tsx`, the one deliberate exception: no shared component can be trusted at that point, so it draws the lockup with its own values |
| In place — a button mid-submit, a row saving | `BrandSpinner`, the compact form. A full lockup on a 32px button is not a loader, it is a mistake |

**Rules it is built to.**

- It never reads the database. A loading screen that awaits a query is a
  loading screen for a loading screen. The mark comes from the committed files
  in `public/brand/`, preloaded in the document head so the first wait of a
  session paints complete rather than with a hole where the mark belongs.
- It ships no JavaScript of its own. Pure CSS on a Server Component, so it
  paints in the frame the HTML arrives; the WebGL field loads after hydration
  and is atmosphere only.
- The 3D obeys the same rules as every other scene here: no reduced motion, no
  fewer than four cores, no save-data connection, no WebGL2 — and a static glow
  in all of those cases.
- Responsive is not an afterthought. The lockup stays on one line at 320px:
  wrapping it would break the very gesture it exists for.

## 8. Motion and Interaction System

Motion is a system with rules, not a collection of effects.

### 8.1 Principles

1. **User-triggered.** Motion responds to entry, scroll, hover, focus or click. Nothing
   loops for decoration.
2. **GPU-only.** Only `transform` and `opacity` animate. Never `width`, `height`,
   `top`, `left`, `box-shadow` or `filter` in a running animation.
3. **Physical.** Spring easing on interaction, custom cubic-bezier on entry. No linear.
4. **Fast.** Micro-interactions 120–200ms, entrances 400–600ms, page transitions 300ms.
   Anything slower feels broken rather than premium.
5. **Once.** Entry animations play once per element, not every time it re-enters view.

### 8.2 The motion library

| Primitive | Behaviour | Where |
|---|---|---|
| `Reveal` | Fade and rise 24px on entry | Every section |
| `StaggerGroup` | Children reveal 60ms apart | Card grids, lists |
| `TextSplit` | Heading animates in by line, then by word | Hero, section headings |
| `Counter` | Number counts up when scrolled into view | Stats strip |
| `Magnetic` | Button subtly attracts the cursor within 40px | Primary CTAs only |
| `Tilt` | Card rotates 3–6° toward the cursor with a moving specular highlight | Bento tiles, demo cards |
| `Marquee` | Continuous logo strip, pauses on hover, duplicated for seamlessness | Tech stack |
| `ScrollProgress` | Thin accent bar at viewport top | Blog posts, long pages |
| `StickyScene` | Visual pins while adjacent steps advance | Process section |
| `ImageReveal` | Clip-path mask wipes the image in | Portfolio, case studies |
| `PageTransition` | Cross-page morph via View Transitions API | Every navigation |

### 8.3 Implementation and cost

- Section reveals use native CSS `animation-timeline: view()` where supported, which is
  scroll-driven animation with **zero JavaScript**. An IntersectionObserver fallback
  handles older browsers. This is the single biggest reason the site can be heavily
  animated and still fast.
- Interaction-driven motion (magnetic, tilt, page transitions) uses Framer Motion,
  imported per-component and lazily, never in the root bundle.
- The View Transitions API gives cross-page morphing — a portfolio thumbnail expanding
  into the detail page's hero — at essentially no JavaScript cost.
- Total motion JavaScript budget on a public route: **under 25 KB gzipped.**

### 8.4 Micro-interaction inventory

Every interactive element has designed hover, focus, active, loading, disabled, error
and success states. Specifically: buttons compress 2% on press and show an inline
spinner that replaces the label without resizing; inputs animate their label to the
border on focus; form validation appears inline with a 6px shake and never shifts
layout; toasts slide and stack; skeletons morph into content rather than being replaced;
navigation dropdowns animate height and opacity together with an arrow that follows the
active item; the mobile menu is a full-screen panel with staggered item entry.

This inventory is where "premium" actually lives. It is more important than the 3D.

---

## 9. Three.js and 3D

The most visible ambition, and the biggest performance risk. This section is therefore
prescriptive.

### 9.1 The strategy that makes both possible

**Desktop gets live WebGL. Mobile gets pre-rendered footage that looks identical.**

Every 3D scene is also rendered offline to a compressed, muted, looping video (AV1 with
an H.265 fallback) and a static AVIF poster. Capability detection at runtime chooses:

| Condition | What loads |
|---|---|
| Desktop, WebGL2, 4+ cores, no reduced-motion | Live interactive WebGL scene |
| Mobile, tablet, or low-end device | Pre-rendered video loop, ~200 KB, decoded on the GPU |
| Reduced motion, or no WebGL, or save-data | Static AVIF poster, ~60 KB |

The visual impression is preserved on every device. The phone never runs a render loop,
so mobile Lighthouse stays above 90 and the handset stays cool. This is the decision
that lets us be ambitious without lying about performance.

### 9.2 Where 3D appears

**Company site:**

1. **Hero.** An abstract structure — layered glass panels with refraction, a slow
   drifting particle field, and light that responds to cursor position. Distorted
   material that reacts subtly to pointer velocity. Two full palettes so it reads
   correctly in both themes.
2. **Product showcase.** A 3D phone model displaying the Apka Saathi app, rotating as
   the section scrolls, with screens swapping at scroll checkpoints.
3. **Process section.** A scroll-linked scene where geometry assembles step by step as
   the reader advances through Discovery to Support. The 3D explains the content, which
   satisfies the rule in 1.3.
4. **Demos index.** Five cards arranged in shallow 3D space, drifting with cursor
   parallax, each lifting on hover.

**Demo sites:** none by default. A variant may enable a lightweight hero effect through
its `features` flag where its industry suits it.

### 9.3 Technical rules

1. `react-three-fiber` and `drei` load through `next/dynamic` with `ssr: false`, always
   behind the poster. LCP is measured against the poster, never the canvas.
2. Frame loop set to `demand` wherever the animation permits; the loop stops entirely
   when the canvas leaves the viewport (`IntersectionObserver`) or the tab is hidden
   (`visibilitychange`).
3. `dpr` clamped to `[1, 1.75]`. Antialiasing off, with post-process FXAA instead.
4. Instanced meshes for anything repeated. Shared materials. No per-frame allocation.
5. Models Draco-compressed `.glb`, hard budget **300 KB each**, textures KTX2 basis
   compressed.
6. Shaders written by hand where a `drei` helper would pull in unnecessary weight.
7. Total 3D payload on the heaviest route: **under 800 KB, all lazy, none blocking.**
8. Every scene is theme-aware — environment map, roughness, emissive and fog swap with
   the mode, animated over 200ms so a mode toggle looks intentional.

### 9.4 Admin control

`site_settings.three_d_enabled` is a global kill switch. Each `hero_3d` section stores
its scene preset, model reference, poster image and video reference. If 3D ever causes
a problem in production, the owner turns it off without a deploy, and the site falls
back to the poster path already designed for mobile.

### 9.5 The rule

If a Lighthouse mobile run drops below 90 or desktop below 95 with 3D enabled, the
scene is reduced or moved to the video path. Speed and SEO outrank the visual — but
because of 9.1, this rule should never need to be invoked.

---

## 10. Company Website — Sitemap

The company site is single-tenant. It has no variants.

```
/                                     Home
/about                                About
/services                             Services index
/services/web-development             Website Development
/services/web-application-development Web Application Development
/services/mobile-app-development      Mobile App Development
/services/custom-software-development Custom Software Development
/services/ai-development              AI Development & Automation
/services/seo                         SEO
/services/digital-marketing           Digital Marketing
/portfolio                            Portfolio index (filterable)
/portfolio/[slug]                     Individual portfolio item
/case-studies                         Case studies index
/case-studies/[slug]                  Individual case study
/products                             Products index
/products/apka-saathi                 Apka Saathi product page
/demos                                Demo projects index
/demos/[slug]                         Demo detail, variant list, live links
/pricing                              Pricing and engagement models
/blog                                 Blog index
/blog/[slug]                          Blog post
/blog/category/[slug]                 Category archive
/contact                              Contact
/request-a-quote                      Quote request form
/privacy-policy                       Privacy policy
/terms-and-conditions                 Terms
/sitemap.xml                          Generated
/robots.txt                           Generated

Reserved for phase 10, not built in v1:
/software-development-company-ghaziabad
/software-development-company-noida
```

Location pages are deliberately deferred. Two genuinely different pages beat six thin
ones, and thin location pages are a ranking liability.

### 10.1 Admin routes

```
/admin/login
/admin                       Dashboard
/admin/leads                 List, filter, search
/admin/leads/[id]            Detail, status, notes, activity
/admin/pages                 Page list
/admin/pages/[id]            Section builder
/admin/navigation
/admin/services
/admin/portfolio
/admin/case-studies
/admin/blog
/admin/blog/categories
/admin/products
/admin/testimonials
/admin/team
/admin/faqs
/admin/tech-stack
/admin/process
/admin/pricing
/admin/media                 R2 library
/admin/seo                   Global defaults, redirects, verification
/admin/settings              Logo, contact, social, theme defaults, toggles
/admin/users                 Admin accounts and roles
```

Super admin routes are specified in Section 14.

---

## 11. Page-by-Page Content Structure

Every page below is a `pages` row with `page_sections`. The structures listed are the
seed data we ship; the owner can change any of it afterwards.

### 11.1 Home

| Order | Section type | Content |
|---|---|---|
| 1 | `hero_3d` | H1 "Build Better. Grow Faster." animated in by line. Sub: company builds websites, mobile apps, custom software, AI solutions. CTA "Start Your Project" (magnetic) to `/request-a-quote`. Secondary "View Our Work" to `/portfolio`. Live 3D scene on desktop, video on mobile. |
| 2 | `what_we_build_bento` | Bento grid, five tiles of varying size: Business Websites, Web Applications, Mobile Apps, Custom Software, AI Automation. Each tile tilts toward the cursor. |
| 3 | `services_grid` | Live from `services`; seven cards with icon, name, one line, link. |
| 4 | `why_choose_us` | Four points grounded in fact: custom development not templates, direct access to the developer, built for maintenance, honest scoping. No numbers we cannot support. |
| 5 | `product_showcase_3d` | Apka Saathi, labelled "Our Product". 3D phone rotating through screens on scroll. Three key features. Link to the product page. |
| 6 | `demo_projects` | Five demo cards from `projects` where type is `demo`, each showing its variant count — "3 industry versions". |
| 7 | `founder_experience` | Positioning paragraph plus technology chips. Labelled "Previous Professional Experience". |
| 8 | `process_scroll` | Sticky 3D scene assembling through Discovery, Proposal, Design, Development, Testing, Launch, Support. |
| 9 | `tech_stack_marquee` | Two counter-scrolling logo rows from `technologies`, pausing on hover. |
| 10 | `faq` | Six entries scoped to `home`, accordion with animated height. |
| 11 | `cta_band` | "Have a project in mind?" plus quote CTA and WhatsApp CTA over a dark atmospheric wash. |

### 11.2 About

Company introduction, what Apka Saathi Private Limited does, how we work, our
principles, founder and team, technologies, CTA. No invented founding milestones, no
employee counts we cannot support.

### 11.3 Services index

Intro, a card per service from `services`, then process, FAQ and CTA.

### 11.4 Service detail (template, all seven)

Hero with the service name as H1 and a "Request a Quote" CTA; what is included; who it
is for; our approach; technologies; related portfolio work; pricing indication;
service-specific FAQ; inline lead form with the service pre-selected.

Every field is editable per service, so the seven pages read differently rather than
being one page with a swapped noun.

### 11.5 Portfolio

Filter tabs: All, In-house Products, Demo Projects, Previous Experience, Client
Projects. The Client Projects tab stays hidden while its count is zero, rather than an
empty state that advertises having no clients.

Each card carries a visible type badge and animates into the detail page via View
Transitions. Detail pages show problem, solution, features, technologies, screenshots
and CTA. Demo items additionally show a persistent "Self-developed Demo Project" banner
and links to each live variant.

### 11.6 Products / Apka Saathi

Labelled "Our Product" throughout. 3D device showcase, feature grid (document
reminders, OCR extraction, AI assistance, reminder engine), how it works, subscription
information, technology overview, access CTA, and a clear statement that it is built
in-house.

### 11.7 Demos index and detail

Index: five demos in a 3D-parallax card layout with thumbnail, category, description,
variant count, and buttons for "View Demo" and "Read Case Study".

Detail: thumbnail, name, category, description, problem, solution, features,
screenshots, technologies, key capabilities, CTA "Want something similar for your
business?" leading to "Discuss Your Project".

Each detail page also lists that demo's variants as separate cards with their own
thumbnails and direct links, so a dental prospect reaches the dental version in one
click rather than by discovering a switcher. Read-only demo admin credentials are
published here.

### 11.8 Contact and Request a Quote

Contact: form, phone, email, WhatsApp button, address, working hours, map embed.

Request a Quote: name, company, email, phone/WhatsApp, service required, approximate
budget, project description, timeline, plus optional existing website URL and preferred
contact method. Multi-step with a progress indicator, because a single long form
converts worse.

### 11.9 Blog

Index with featured post, category filter and pagination. Post pages carry author,
date, reading time, scroll progress bar, table of contents for long posts, related
posts and a CTA. Seven seed posts from the brief.

### 11.10 Pricing

Starter Website, Business Website, Custom Software, Mobile App, AI Solutions.
"Starting from" where a floor is honest, "Custom Quote" where it is not. Every tier's
CTA opens the quote form with that tier pre-selected.

---

## 12. Database Schema — `company`

Conventions: `id uuid primary key default gen_random_uuid()`, `created_at`,
`updated_at` on every table, `updated_at` maintained by trigger. Slugs are unique and
immutable once published, with old values captured in `redirects`.

### 12.1 Enumerated types

```sql
create type project_type   as enum ('inhouse','demo','client','previous');
create type lead_status    as enum ('new','contacted','qualified',
                                    'proposal_sent','negotiation','won','lost');
create type content_status as enum ('draft','published','archived');
create type user_role      as enum ('super_admin','owner','admin','editor','demo_viewer');
create type nav_location   as enum ('header','footer_primary','footer_secondary',
                                    'footer_legal','mobile');
create type theme_mode     as enum ('light','dark','system');
```

### 12.2 Identity and access

**`profiles`** — extends `auth.users`
`id (fk auth.users)`, `full_name`, `avatar_url`, `role user_role`,
`app_access text[]`, `is_active`, `last_login_at`, `preferred_mode theme_mode`

### 12.3 Global site content

**`site_settings`** — single row, enforced by a check constraint
`company_name`, `legal_name`, `tagline`, `logo_light_id`, `logo_dark_id`,
`favicon_id`, `og_default_id`, `phone`, `whatsapp`, `email`, `address_line1`,
`address_line2`, `city`, `state`, `postal_code`, `country`, `map_embed_url`,
`working_hours jsonb`, `cin`, `gst`, `social jsonb`, `theme jsonb`,
`default_mode theme_mode`, `allow_mode_toggle`, `three_d_enabled`,
`motion_level`, `maintenance_mode`, `announcement_bar jsonb`

**`nav_items`**
`location nav_location`, `label`, `href`, `parent_id (self fk)`, `sort_order`,
`is_external`, `open_new_tab`, `icon`, `badge_text`, `is_active`

Two levels of nesting, which covers a Services dropdown.

**`media`**
`r2_key`, `public_url`, `filename`, `mime_type`, `size_bytes`, `width`, `height`,
`alt_text (not null)`, `caption`, `folder`, `uploaded_by`, `blurhash`,
`dark_variant_id (self fk, nullable)`, `attribution`

`alt_text` is required at the database level. Missing alt text becomes impossible
rather than merely discouraged. `dark_variant_id` links an asset to its dark-mode
counterpart.

**Revised 2026-08-27: the R2 bucket is private.** There is no public r2.dev or
custom domain in front of it, so nothing in it is reachable from the internet
directly. `public_url` therefore holds *this site's* path to the asset, not a
Cloudflare address: uploads are signed server-side and reads go through a route
in this application that decides who may see the object before streaming it or
issuing a short-lived signed URL. The trade is one hop through the app instead
of straight off a CDN, taken because client work will live in the same bucket
and must not be a public URL the moment it is uploaded.

### 12.4 Pages and sections

**`pages`** — `slug (unique)`, `title`, `status content_status`, `is_system boolean`,
`seo_title`, `seo_description`, `seo_keywords text[]`, `og_image_id`, `canonical_url`,
`noindex`, `schema_type`, `published_at`

`is_system` marks pages whose route exists in code; they can be edited, not deleted.

**`page_sections`** — `page_id`, `type text`, `sort_order int`, `is_active`,
`content jsonb`, `custom_class`, `background_variant`, `motion_preset`

### 12.5 Services

**`services`** — `slug (unique)`, `name`, `short_name`, `icon`, `summary`,
`hero_heading`, `hero_subheading`, `body jsonb`, `included_items jsonb`,
`audience jsonb`, `approach jsonb`, `technology_ids uuid[]`, `price_from numeric`,
`price_note`, `is_custom_quote`, `sort_order`, `status`, plus the standard SEO columns.

### 12.6 Portfolio and case studies

**`projects`** — `slug (unique)`, `title`, `type project_type`, `category`,
`client_name`, `summary`, `problem`, `solution`, `features jsonb`,
`capabilities jsonb`, `technology_ids uuid[]`, `service_ids uuid[]`, `thumbnail_id`,
`gallery jsonb`, `live_url`, `admin_demo_url`, `demo_credentials jsonb`,
`variants jsonb`, `year`, `is_featured`, `sort_order`, `status`, plus SEO columns.

`variants` holds the live variant list for a demo — label, slug, thumbnail, URL — so
the company site renders them without querying another schema.

A constraint enforces the honesty rule: `type = 'client'` requires a non-null
`client_name`, and `type = 'demo'` requires `client_name` to be null.

**`case_studies`** — `slug (unique)`, `project_id`, `title`, `client_name`, `industry`,
`problem`, `solution`, `features jsonb`, `technology_ids uuid[]`, `screenshots jsonb`,
`results jsonb (nullable)`, `testimonial_id (nullable)`, `duration`, `published_at`,
`status`, plus SEO columns.

`results` and `testimonial_id` are nullable by design. We never manufacture outcomes to
fill a field.

### 12.7 Blog

**`blog_categories`** — `slug`, `name`, `description`, `sort_order`, SEO columns
**`blog_posts`** — `slug (unique)`, `title`, `excerpt`, `content (markdown)`,
`featured_image_id`, `category_id`, `tags text[]`, `author_id`, `status`,
`published_at`, `reading_minutes`, `is_featured`, `view_count`, SEO columns

### 12.8 Supporting content

**`faqs`** — `question`, `answer`, `scope text[]`, `sort_order`, `is_active`
**`testimonials`** — `author_name`, `author_role`, `company`, `avatar_id`, `quote`,
`rating`, `project_id`, `status`, `consent_confirmed boolean`
**`team_members`** — `name`, `role`, `bio`, `photo_id`, `linkedin_url`, `github_url`,
`skills text[]`, `sort_order`, `status`
**`technologies`** — `name`, `category`, `logo_id`, `description`, `sort_order`
**`process_steps`** — `step_number`, `title`, `description`, `icon`, `duration_note`
**`pricing_plans`** — `name`, `tagline`, `price_from`, `currency`, `price_note`,
`is_custom_quote`, `features jsonb`, `is_highlighted`, `cta_label`, `cta_href`,
`sort_order`, `status`

`testimonials.consent_confirmed` must be true before publication. This makes the
honesty rule structural rather than procedural.

### 12.9 Leads

**`leads`** — `name`, `company`, `email`, `phone`, `whatsapp`, `service_id`,
`budget_range`, `timeline`, `description`, `existing_website`, `preferred_contact`,
`source_page`, `referrer`, `utm jsonb`, `status lead_status`, `assigned_to`,
`value_estimate`, `ip_hash`, `user_agent`, `is_spam`, `archived_at`

`ip_hash` is a salted hash, never a raw IP, which keeps rate limiting possible without
storing personal data unnecessarily.

**`lead_notes`** — `lead_id`, `author_id`, `body`
**`lead_activity`** — `lead_id`, `actor_id`, `action`, `from_value`, `to_value`

### 12.10 SEO infrastructure

**`redirects`** — `from_path (unique)`, `to_path`, `status_code`, `hit_count`
**`seo_defaults`** — title template, default description, default OG image, Google and
Bing verification codes, GA4 id, GSC property, `organization_schema jsonb`

### 12.11 Row Level Security

- Public anonymous role: `select` only, only on rows where `status = 'published'`, and
  only on public-facing tables. No access at all to `leads`, `lead_notes`,
  `lead_activity`, `profiles`.
- Lead insert goes through a Server Action using the service role, never from the
  browser, so the anonymous role needs no insert grant anywhere.
- Authenticated admins: access gated on `profiles.role` and
  `'company' = any(profiles.app_access)`.
- The service-role key exists only in Vercel environment variables and `.env.local`.

---

## 13. Demo Schema Pattern

Every demo schema shares this base, then adds its domain tables. Every table below
except `media` carries `variant_id`.

**`variants`** — as specified in 5.2, carrying both theme modes
**`nav_items`**, **`pages`**, **`page_sections`** — same columns as the company site
**`media`** — shared across variants; a clone copies references, not files
**`enquiries`** — `variant_id`, `name`, `phone`, `email`, `message`, `source_page`,
`status`, `ip_hash`
**`settings`** — per-variant feature flags and integration toggles

RLS: the anonymous role gets `select` on published rows of active variants and nothing
else. `enquiries` is insert-only through a Server Action.

Every query in a demo app goes through a helper that requires a `variant_id`. There is
no code path that reads demo content without scoping, which is what prevents one
variant's data appearing on another's page.

---

## 14. Super Admin Control Plane

One place to run all six applications. This lives inside the company website's admin,
at `/admin/super`, and is visible only to the `super_admin` role.

### 14.1 What problem it solves

Without it, running this system means six logins, six dashboards, six inboxes and no
way to answer "how many enquiries came in this week?" without opening six tabs. The
super admin makes the whole estate feel like one product.

### 14.2 The boundary — what it does and does not do

This is the most important design decision in this section.

**The super admin owns the control plane:** variants, branding, themes, publish state,
enquiries, users, media usage, audit, health, cache.

**Each demo's own admin owns its content plane:** menu items, doctors, properties,
students, deals — the domain data specific to that application.

Rebuilding every demo's domain forms inside the super admin would mean maintaining
each form twice, and the two copies would drift. Instead, the super admin **deep-links**
into a demo's own admin, at the exact record, already authenticated — because
`auth.users` is shared, the session carries across. One click, no second login, no
duplicated code.

### 14.3 Architecture

A dedicated `control` schema holds the cross-app plumbing. The company app never
queries a demo schema directly; it calls `SECURITY DEFINER` functions in `control`,
which are granted only to the `super_admin` role.

This matters because it means there is exactly one auditable doorway between
applications, rather than the company app holding broad grants across six schemas.

```
Company app  ->  control.inbox()            ->  unions enquiries from all schemas
             ->  control.list_variants(app) ->  reads that app's variants
             ->  control.clone_variant(...) ->  runs that app's clone function
             ->  control.set_app_status(...)->  maintenance mode on a demo
                        |
                        +-> writes control.audit_log on every call
                        +-> app calls demo's /api/revalidate afterwards
```

### 14.4 `control` schema

**`apps`** — the registry
`slug`, `name`, `schema_name`, `public_url`, `admin_url`, `vercel_project`,
`revalidate_endpoint`, `icon`, `accent`, `sort_order`, `status`,
`last_health_check_at`, `health_status`, `health_detail`

**`audit_log`**
`actor_id`, `app_slug`, `variant_slug`, `entity`, `entity_id`, `action`,
`before jsonb`, `after jsonb`, `ip_hash`, `created_at`

Every super-admin mutation writes here. Nothing is exempt. This is what makes a
multi-app admin safe to operate.

**`revalidation_queue`**
`app_slug`, `tags text[]`, `attempts`, `last_error`, `succeeded_at`

Cross-app cache invalidation is a network call and can fail. Failures queue and retry,
and unresolved entries raise a warning in the dashboard rather than silently leaving a
demo stale.

**`inbox_view`** — a view unioning every demo's `enquiries` with the company's `leads`,
normalised to `app_slug`, `variant_slug`, `name`, `contact`, `subject`, `message`,
`status`, `created_at`.

**Functions:** `control.inbox(filters)`, `control.stats()`, `control.list_variants(app)`,
`control.upsert_variant(app, payload)`, `control.clone_variant(app, source, new_slug)`,
`control.set_variant_active(app, slug, bool)`, `control.set_app_status(app, status)`,
`control.storage_usage()`, `control.health_check()`.

### 14.5 Super admin routes

```
/admin/super                     Estate dashboard
/admin/super/apps                All six apps: status, health, versions, links
/admin/super/apps/[slug]         One app: variants, settings, health, deep links
/admin/super/variants            Every variant across every app, one table
/admin/super/variants/[id]       Branding and theme editor with live preview
/admin/super/inbox               Unified inbox — all leads and enquiries
/admin/super/users               Users and per-app access across the estate
/admin/super/media               Storage usage per app, orphan detection
/admin/super/audit               Full audit trail, filterable
/admin/super/cache               Revalidation status, manual purge
```

### 14.6 Estate dashboard

The landing screen answers, at a glance:

- Total enquiries today, this week, this month, across all six apps, with a sparkline
- A live activity feed: which app, which variant, what happened, when
- Six app cards: name, status badge, variant count, enquiries this week, health dot,
  last deploy, and a "Open admin" button
- Alerts: an app failing health check, a queued revalidation that has not succeeded,
  storage above 80%, content missing SEO fields, a variant failing its contrast check
- Storage and quota meters for R2, Supabase database size and Resend send count

### 14.7 Unified inbox

Every enquiry from every app and every variant in one table, with columns for app,
variant, name, contact, message excerpt, status and age. Filter by app, variant,
status, date. Search across name, email, phone and message. Assign, change status, add
a note, mark spam, export to CSV.

This is the feature that changes daily work most: one screen to check each morning
instead of six.

### 14.8 Cross-app variant management

Every variant across the estate in a single table — app, variant, business name,
industry, both accent colours, status, page count, last edited.

From here: clone a variant (including into a different app's pattern), edit branding
and theme with a live preview showing header, hero and card in both modes, toggle
active, set as default, toggle `noindex`, and preview the live URL.

The branding editor is the same component the demo admins use, imported from the shared
package, so there is one implementation and no drift.

### 14.9 Health and deploy visibility

A daily Vercel Cron job on the company app calls `control.health_check()`, which pings
each app's `/api/health` endpoint. That endpoint reports app version, database
reachability, variant count and cache state. Results land in `apps.health_status` and
surface on the dashboard. A manual "Check now" button runs it on demand.

### 14.10 Security

- `super_admin` is a distinct role above `owner`. Only a `super_admin` may create
  another.
- Every `control` function is `SECURITY DEFINER`, checks the caller's role internally
  rather than trusting the client, and writes to `audit_log` before returning.
- The control-plane database role is used only inside those functions. The company
  app's own connection has no direct grants on demo schemas.
- Cross-app revalidation calls are authenticated by a per-app shared secret, stored in
  environment variables and never in the database.
- Destructive actions — deleting a variant, deleting an app registration — require
  typing the variant or app name to confirm, and are soft-deleted with a 30-day window.

---

## 15. Admin Panel

### 15.1 Authentication

Supabase Auth, email and password, with the sign-up endpoint disabled. Accounts are
created by an owner from `/admin/users`. Middleware protects every `/admin` route.
Sessions are httpOnly cookies. Admin routes are `noindex` and excluded from sitemaps.

**How an account comes into existence.** An owner enters a name, an email address
and a role. The system generates a strong password, Supabase Auth stores only its
hash, and the address receives it with a link to sign in. No one can read an
existing password back — not an owner, not a developer, not the database.

**Changing a password.** Everyone can change their own from their account screen,
after confirming the current one. An owner can reset anyone else's, which issues a
fresh generated password to that person's address rather than letting the owner
choose one: an owner who types a colleague's password knows it.

**Blocking.** `profiles.is_active = false` is one switch and it is absolute. The
login refuses the account after authenticating it, the session helper treats it as
signed out on the next request, and every RLS policy tests `is_active`, so the
database refuses the rows too. It is never a deletion — notes, assignments and
history stay attached to the person.

**The menu is the permission, and it is per person.** Each role has a default
menu. Any individual can then be granted **extra items** beyond that default, or
have items **removed** from it — a senior employee who also handles enquiries, a
new one who should not reach settings yet. Whatever a person's resolved menu
turns out to be is exactly what they may reach; any other URL answers as if the
route does not exist.

Hiding a link is never the mechanism: the route checks the resolved menu and RLS
refuses the data underneath it regardless.

**Two employee panels, kept apart by `app_access`.** The employee who manages
this services site and the employee who manages the task tracker are separate
people with separate panels. An account granted `company` reaches this admin; an
account granted the tracker reaches that one; an account may hold either, both or
neither. One employee account never implies the other panel.

**This admin is the control plane for the estate.** The task tracker and every
demo application are administered *from here* — accounts, access, menus, content
invalidation and the variant system — which is what Section 14 describes. Their
own panels are for the people doing the day-to-day work in them; this one is
where those panels are set up and switched off.

This holds identically in the client portal and the task tracker — a client sees
their own projects, an employee sees the work assigned to them, and neither
reaches the other's screens by guessing.

Demo admins additionally expose a read-only demo account whose credentials are
published on the company site. It can view everything and change nothing, enforced by
RLS rather than by hiding buttons.

### 15.2 Roles

| Role | Can do |
|---|---|
| `super_admin` | Everything across all six apps, plus the control plane |
| `owner` | Everything within one app, including its users |
| `admin` | All content and leads in one app; cannot manage users |
| `editor` | Content only; cannot see leads or settings |
| `demo_viewer` | Read-only, demo apps only |

### 15.3 Admin visual standard

The admin is designed, not bolted on. Both themes, the same typography and motion
system, keyboard shortcuts, a command palette (Ctrl+K) for navigation and search,
optimistic updates with rollback on failure, inline editing where it beats a modal,
and skeletons that morph into content.

The owner will spend more time here than anywhere else, and a good admin is also
something we can show a prospect.

**Feedback is a toast, and every toast is themed.** Every admin action that
succeeds or fails says so in a toast — never a bare browser alert, never a silent
save, never a banner left behind by the previous screen. One toast component,
taken from the shared UI primitives, used across the whole admin:

- Colours, text and surfaces come from the theme tokens, so a toast is correct
  in light and dark with no second set of styles and no hardcoded hex anywhere
  in it. This is the same rule as the rest of the site, and the admin is where
  it is most often broken — a toast is usually written in a hurry.
- Four variants — success, error, warning, info — each a token pair rather than
  an inline colour.
- The copy is specific: "Service saved", "Could not save — that slug is already
  in use". "Something went wrong" on its own tells the owner nothing.
- Everything clears itself: success and info after four seconds, errors and
  warnings after six. Hovering or focusing a toast pauses its timer, and the
  dismiss button is always present, so a long message is never pulled away
  mid-sentence and a read one never lingers.
- Anchored to the top — full width below the header on a phone, a fixed column
  at the top right from `sm` up. A toast fires just after a form is submitted,
  which on a phone is when the keyboard is open; a bottom toast is behind it.
- At most three on screen, newest first.
- Toasts stack, and the stack is a polite live region so a screen reader
  announces them.

**Confirmation is a modal, and never the browser's.** `window.confirm`,
`window.alert` and `window.prompt` are not used anywhere in the estate. One
shared dialog component, mounted once beside the toast and reached with
`useConfirm()`, asks every "are you sure":

- Built on the native `<dialog>` with `showModal()`, so focus is trapped inside
  it, Escape dismisses it, the rest of the page is inert to a screen reader,
  and it renders in the browser's top layer where no `z-index` can cover it.
- Colours from the theme tokens, correct in light and dark with no second set
  of styles, and a tone — danger, warning, info — that colours the confirming
  button so the destructive choice is never the neutral-looking one.
- A title that asks the question and a sentence saying what will happen and
  whether it can be undone. Where a reversible alternative exists, the sentence
  names it: "to take it off the page without losing it, hide it instead".
- **Cancel holds the focus**, not confirm. A dialog that acts on a stray Enter
  is how something nobody meant to delete disappears.

The browser dialog is refused for concrete reasons, not taste: it ignores the
theme, it names the origin rather than the company, its buttons read "OK" and
"Cancel" whatever was asked, and on some platforms it offers to suppress every
later dialog on the page — which disables the safety rail for the whole
session.

### 15.4 Dashboard

Lead counters, recent leads, content counts, quick actions, and a list of content
missing SEO descriptions or alt text. Demo dashboards show the same for their own
domain, scoped to the selected variant.

### 15.5 Lead management

List view with search across name, company, email and phone; filters on status,
service, date range and assignee; sortable columns; CSV export. Detail view shows the
submission, a status selector writing to `lead_activity`, threaded notes, assignment
and archive. Deletion is soft.

### 15.5a One layout for every management screen

Every screen that manages records uses the same three-part shape, and none is
allowed to invent another. Someone who has learnt one screen has learnt all of
them.

```
  list            editor                preview
  ─────────────   ───────────────────   ──────────────────
  every record    the selected one,     what it will
  in order        as a form             actually look like
```

- **List on the left** — every record, in order, with its state visible. The
  selected record is held in the query string, so the back button steps through
  the history and a link to one record can be sent to someone.
- **Editor in the middle** — the selected record's fields, generated from the
  descriptors that validate them, with one save button, errors beside their
  fields, and the outcome in the shared toast.
- **Preview on the right** wherever the record is something a visitor sees. The
  real rendering, refreshed on save — never a second implementation.

Three columns from `xl`, stacked below it. Per-record actions live on the row in
the list, never scattered between columns. Where a record has no meaningful
preview the third column is dropped and the other two keep their positions: the
layout narrows, it never rearranges.

### 15.6 Page builder

Left: ordered section list, drag to reorder, toggle visibility, duplicate, delete.
Right: a form for the selected section, generated from its Zod schema. Top: "Add
section" opens the section library. A preview link opens the page in draft mode, in
either theme.

Field types: text, textarea, rich text, image picker with dark-variant slot, image
array, link, select, boolean, number, colour with contrast check, icon picker, motion
preset, repeater, and reference picker.

### 15.7 Variant manager (demo apps only)

Lists variants with thumbnail, name, industry, both accents, status and page count.
Actions: create, clone, edit branding and theme, set default, activate, preview,
delete. Same component as the super admin's, from the shared package.

### 15.8 Media library

Grid view, folder filter, search by filename and alt text, drag-and-drop upload with
client-side compression, required alt text, and a dark-variant slot. Usage tracking
shows where a file is referenced; deletion warns when a file is in use.

### 15.9 SEO panel

Per-record SEO fields on every content form: SEO title and meta description with
character counters, OG image, canonical override, noindex toggle, and a live
Google-result preview. A global page manages defaults, verification codes and redirects.

---

## 16. SEO Architecture

### 16.1 Rendering

Every public page is a Server Component. HTML is complete before JavaScript. No content
that matters to search appears only after hydration. Animation never gates content — a
reveal animates an element that is already in the DOM and already visible to crawlers.
Variant pages are statically generated per variant.

### 16.2 Metadata

`generateMetadata()` on every route, sourced from the database with fallback to
`seo_defaults`. Produces title, description, canonical, Open Graph with dimensions,
Twitter card and robots directives. Dynamic OG images generated per route with
`next/og`, per variant, in a mode-appropriate design, cached at the edge.

### 16.3 Structured data

| Schema | Where |
|---|---|
| `Organization` | Company root layout |
| `WebSite` with `SearchAction` | Company root layout |
| `LocalBusiness` | Company contact page; location pages when built |
| `Service` | Each service detail page |
| `BreadcrumbList` | Every page below the root |
| `Article` | Each blog post |
| `FAQPage` | Any page carrying a `faq` section |
| `SoftwareApplication` | Apka Saathi product page |
| `CreativeWork` | Portfolio and demo detail pages |
| `MedicalBusiness` / `Dentist` | Clinic demo, chosen per variant |
| `Restaurant` with `Menu` | Restaurant demo |
| `EducationalOrganization` | School demo |
| `RealEstateAgent` / `Residence` | Real estate demo |

Emitted as JSON-LD from typed builders, so a schema change is a type error rather than
a silent breakage. Demo schema type is a variant-level field, which is why the dental
variant emits `Dentist` while the cardiology variant emits `MedicalClinic`.

### 16.4 Sitemaps and robots

`sitemap.ts` queries the database and emits every published page, service, project,
case study, post and category with accurate `lastModified`. Demo sitemaps emit every
variant's pages. Admin, API and draft routes are excluded. `robots.ts` allows crawling,
disallows `/admin` and `/api`, and points at the sitemap.

### 16.5 Internal linking

Services cross-link to related portfolio items and blog posts. Blog posts link to
relevant services. Portfolio items link back to the services they demonstrate.
Breadcrumbs on every deep page. No orphan pages: the sitemap generator warns when a
published record has no inbound internal link.

### 16.6 Demo SEO — the deliberate decision

Demo sites are built to a full technical SEO standard: server-rendered, complete
metadata, correct structured data, generated sitemap, semantic HTML, 95+ Lighthouse.
That standard is itself the demonstration of capability.

They are **not** aimed at ranking for their industry's keywords. A fictional dental
clinic competing for "best dentist in Ghaziabad" is deceptive to searchers, risks a
manual action, and would embarrass the company that built it. With fifteen variants the
risk multiplies, since near-duplicate industry sites are exactly the pattern search
engines penalise.

Instead:

- Every demo carries a persistent, visible banner identifying it as a demo built by
  Apka Saathi Private Limited, linking back to the company site.
- Demo sites are `noindex, follow` by default, controlled per variant from the super
  admin so the decision can be revisited.
- The company site hosts the pages that target real search demand:
  `/demos/clinic-website-and-appointment-system` and its siblings, optimised for terms
  such as "clinic website development", "hospital management software", "restaurant
  website with online booking", "school management software", "real estate CRM
  software", "custom CRM development India".
- Search traffic lands on the company site, reads the case study, and clicks through to
  the live demo. Every backlink accrues to the company domain rather than being diluted
  across six.

### 16.7 Analytics

GA4 and Google Search Console, configured from the admin panel. Vercel Analytics for
Core Web Vitals. Conversion events on form view, form start and form submit. Demo sites
record which variant a visitor viewed and whether they clicked through to the company
site, which tells us which industries actually convert — surfaced in the super admin
dashboard. No third-party script that is not doing measurable work.

---

## 17. Performance Budget

The budget is split by device class, because that is what makes the visual ambition
honest rather than aspirational.

| Metric | Mobile | Desktop |
|---|---|---|
| Lighthouse Performance | 90+ | 95+ |
| Lighthouse SEO / Best Practices / Accessibility | 100 / 95+ / 95+ | same |
| Largest Contentful Paint | under 2.0s on 4G | under 1.2s |
| Interaction to Next Paint | under 200ms | under 150ms |
| Cumulative Layout Shift | under 0.05 | under 0.05 |
| First-load JS, public routes | under 130 KB gz | under 130 KB gz |
| Motion JavaScript | under 25 KB gz | under 25 KB gz |
| 3D payload | 0 KB — video path, ~200 KB | under 800 KB, all lazy |
| Hero asset | under 120 KB AVIF | poster then WebGL |

Enforced by a CI Lighthouse run on pull requests, on both mobile and desktop profiles,
and by `@next/bundle-analyzer`. A pull request that regresses a budget fails.

Techniques: Server Components wherever content is static, `next/image` with correct
`sizes` and explicit dimensions, `priority` only on the LCP image, self-hosted fonts
with preload, route-level code splitting, native scroll-driven CSS animation instead of
JavaScript observers where supported, edge caching with tag invalidation, and cache
headers on the media route that fronts R2 (the bucket is private — see §"media").

Variant theming and mode switching cost nothing at runtime: both are CSS custom
properties inlined in server HTML, not client-side theme engines.

---

## 18. Security

- Admin routes protected by middleware and re-checked in every Server Action. Never
  trust the client for authorisation.
- RLS enabled on every table in every schema, denying by default.
- Variant scoping enforced in the data layer and in RLS, not in the UI.
- Cross-app access only through `control` `SECURITY DEFINER` functions that verify the
  caller's role internally and write an audit entry before returning.
- Zod validation on both client and server. The server validation is authoritative.
- Rate limiting on public forms: per-IP-hash and per-email, sliding window, using a
  Postgres table at launch and Upstash Redis if volume demands it.
- Spam protection: honeypot field, minimum time-to-submit, and Cloudflare Turnstile.
- File upload: MIME and magic-byte validation, extension allowlist, size cap,
  randomised storage key, presigned direct-to-R2 upload so no file transits our server.
- Security headers via `next.config.js`: CSP, HSTS, `X-Frame-Options`,
  `Referrer-Policy`, `Permissions-Policy`. The CSP allows `blob:` and `data:` for
  WebGL textures and nothing wider.
- No secret in any file that reaches the browser. `.env.local` in `.gitignore`,
  `.env.example` committed with blank values.
- Demo read-only accounts enforced by RLS, not by hidden buttons.

---

## 19. Demo Project Specifications

All five follow the same shape: a public site and an admin panel, both fully dynamic
from their own schema, both variant-aware, both in light and dark, built to the same
design and performance standards as the company site. Each ships with realistic seed
data clearly marked as fictional.

Shared across all five: a persistent demo banner with variant switcher and theme
toggle, read-only admin credentials published on the company case-study page, three
launch variants each with its own identity, and registration in the super admin.

**The loader is the same one.** Demos import the brand loader rather than
writing their own wait screen; only the mark and the two halves of the name
change with the variant. See §7.7.

**Every address in demo seed data, and every address used to test anything, is
`kumarnitish4384@gmail.com`.** Never the owner's own address. This covers demo
login accounts, fictional customers and patients, staff records, form
submissions made while testing, and anything else that would put a real
personal mailbox into seed data or into a live send. See §3.4.

### 19.1 Demo 1 — Clinic and Healthcare Platform

Variants: **Dental Clinic**, **Cardiology Centre**, **Eye Care Hospital**.

**Public site:** home with hero and trust signals, about, treatments and services with
detail pages, doctors with profiles and availability, online appointment booking with
department, doctor, date and slot selection, patient information, health articles,
gallery, insurance and payment information, testimonials, location with map, contact,
floating WhatsApp and click-to-call.

**Admin panel:** dashboard with today's appointments, pending confirmations and new
enquiries; appointment management with status workflow (requested, confirmed,
completed, cancelled, no-show) and day and week calendars; doctor management with
specialisation, qualifications, photo, fee and weekly availability; department and
treatment management with pricing; patient records with visit history; slot
configuration and holiday blocking; enquiries inbox; article publishing; testimonials
with consent flag; analytics by department, doctor and day; variant and branding
management.

**Schema `demo_clinic`:** `variants`, `departments`, `treatments`, `doctors`,
`doctor_availability`, `time_slots`, `holidays`, `appointments`, `patients`, `visits`,
`articles`, `testimonials`, `insurance_partners`, `enquiries`, `gallery`, `nav_items`,
`pages`, `page_sections`, `settings`, `media`.

**Demonstrates:** healthcare website plus appointment scheduling plus operational
admin — the highest-demand category among Indian small businesses.

**Variant differences:** dental shows implants and orthodontics in a warm teal identity;
cardiology shows diagnostics, angiography and cardiac packages in a clinical crimson
identity with prominent emergency contact; eye care shows LASIK, cataract and optical
services in an indigo identity with a spectacles catalogue.

### 19.2 Demo 2 — Restaurant and Hospitality Platform

Variants: **Fine Dining**, **Cafe and Bakery**, **Cloud Kitchen**.

**Public site:** home with hero and ambience gallery, menu with categories and dietary
tags, table booking with date, time, party size and availability check, offers and
events, gallery, about and chef, location, contact, WhatsApp enquiry.

**Admin panel:** dashboard with today's bookings and covers; menu management with
availability toggle; booking management with status workflow and calendar day view;
table and capacity configuration; offers and events; enquiries inbox; analytics on
bookings by day, popular items and peak hours; variant and branding management.

**Schema `demo_resto`:** `variants`, `menu_categories`, `menu_items`, `tables`,
`bookings`, `booking_slots`, `offers`, `events`, `gallery`, `enquiries`,
`testimonials`, `nav_items`, `pages`, `page_sections`, `settings`, `media`.

**Demonstrates:** business website plus booking system plus operational admin.

### 19.3 Demo 3 — School and Education Management System

Variants: **K-12 School**, **Coaching Institute**, **Degree College**.

**Public site:** home, about, academics and courses, admissions with enquiry form,
faculty, facilities, news and notices, events calendar, gallery, results and
achievements, contact.

**Admin panel:** dashboard with student, teacher and attendance summary; student
management with class and section assignment and guardian contacts; teacher management
with subject allocation; class and section setup; attendance with monthly grid and
reporting; fee structure, invoicing, payment recording and outstanding report; notices
with audience targeting; events; results entry; a parent portal view showing one
student's attendance, fees and results; variant and branding management.

**Schema `demo_school`:** `variants`, `classes`, `sections`, `students`, `guardians`,
`teachers`, `subjects`, `attendance`, `fee_structures`, `fee_invoices`, `fee_payments`,
`notices`, `events`, `results`, `admission_enquiries`, `nav_items`, `pages`,
`page_sections`, `settings`, `media`.

**Demonstrates:** custom software, role-based dashboards, records at scale.

### 19.4 Demo 4 — Real Estate Platform

Variants: **Residential Broker**, **Commercial Property**, **Luxury Villas**.

**Public site:** home with prominent search, listings with filters (type, price,
bedrooms, locality, status, amenities), map view, property detail with gallery, floor
plans, amenities, locality information and EMI calculator, agent profiles, saved
shortlist, per-property enquiry form, WhatsApp enquiry.

**Admin panel:** dashboard with listing and lead counts; property management with
multi-image upload, status and featured flag; locality and amenity masters; agent
management with assignment; lead management with per-property attribution, pipeline and
notes; enquiry inbox; analytics on views per property and leads per source; variant and
branding management.

**Schema `demo_estate`:** `variants`, `properties`, `property_images`,
`property_features`, `localities`, `amenities`, `agents`, `leads`, `enquiries`,
`saved_searches`, `nav_items`, `pages`, `page_sections`, `settings`, `media`.

**Demonstrates:** filtered search at scale, lead capture and attribution.

### 19.5 Demo 5 — Business CRM

Variants: **Sales CRM**, **Service Desk CRM**, **Real Estate CRM**.

Admin-first: a marketing site plus a full application.

**Public site:** a compact SaaS marketing site — hero, features, screenshots, pricing
tiers, FAQ, and a "Try the demo" CTA leading straight into the app.

**Application:** dashboard with pipeline value, conversion rate and activity feed; lead
management with source, status and owner; customer records with contact history; a
drag-and-drop kanban pipeline across configurable stages; follow-up scheduling with due
and overdue views; task management; notes and activity timeline per record; reports
(pipeline by stage, won and lost analysis, activity by user); user management with
roles; settings for stages, sources and custom fields.

**Schema `demo_crm`:** `variants`, `crm_users`, `leads`, `customers`, `contacts`,
`pipeline_stages`, `deals`, `activities`, `tasks`, `notes`, `lead_sources`,
`custom_fields`, `nav_items`, `pages`, `page_sections`, `settings`, `media`.

**Demonstrates:** genuine SaaS and business-software capability.

**Variant differences:** here variants change vocabulary and workflow rather than only
visuals — the service-desk variant renames deals to tickets and stages to SLA states,
and the real-estate variant adds a property reference field. This demonstrates
configurability, which is what CRM buyers actually ask about.

---

## 20. Asset Strategy

Fifteen variants in two themes need a great deal of imagery, and the brief rules out
generic stock photography for the company site.

- **Company site:** no stock photography. Abstract 3D, custom illustration, real
  product screenshots, real team photographs when available.
- **Demo sites:** licensed photography is acceptable and expected, since a clinic demo
  needs to look like a clinic. Unsplash and Pexels under their licences, with
  attribution recorded in `media.attribution`.
- **3D assets:** authored in Blender, exported Draco-compressed `.glb`, textures KTX2.
  Each scene also rendered to a looping AV1 video and an AVIF poster for the mobile path.
- Every image is processed at upload: resized to a maximum long edge, converted to AVIF
  with WebP fallback, given a blurhash placeholder, and optionally paired with a
  dark-mode counterpart.
- A variant's images live in an R2 folder named after the variant, so cloning and
  cleanup stay simple.
- Demo variant logos are generated as simple wordmarks from the design system rather
  than sourced, which keeps them clearly fictional.

---

## 21. Development Roadmap

The company website is completed first, in full, before anything else begins. That is
the instruction and it is also correct: it is the only part that earns money.

### 21.1 Block A — The company website (build this first, ship it, then stop)

| Phase | Deliverable | Depends on |
|---|---|---|
| **0. Foundation** | Supabase project, schemas, `company` migrations, RLS, generated types, R2 bucket and CDN domain, shared package with dual-theme tokens, theme provider and flash-free script, UI and motion primitives, admin shell, `D:\services` scaffolded, GitHub and Vercel set up | — |
| **1. Company public site** | All public routes, section renderer, full motion system, both themes, complete SEO layer, responsive down to 320px, seed content, lead forms wired to database and Resend | 0 |
| **2. 3D layer** | Hero scene, product showcase, process scroll scene, demos parallax, theme-reactive materials, pre-rendered video and poster fallbacks, capability detection | 1 |
| **3. Company admin** | Auth, dashboard, lead management, page builder, all content modules, media library, SEO panel, settings, users | 1 |
| **4. Company launch** | Domain, deploy, Search Console and GA4, sitemap submission, Lighthouse and accessibility audit on both themes, real content entered, backups and monitoring live | 2, 3 |

**At the end of phase 4 the company site is live, fully dynamic, and taking enquiries.**
Nothing beyond this point blocks revenue.

### 21.2 Block B — Delivering work to clients

Built next, because the first client can sign at any time and this is what makes the
company look like a company rather than a freelancer. It also demonstrates capability
in sales conversations before a single client exists.

| Phase | Deliverable | Depends on |
|---|---|---|
| **5. Messaging centre — stage 1** | Email send and threaded inbound via Cloudflare Email Routing, WhatsApp click-to-chat with per-page context, owner notification on WhatsApp, unified contact timeline | 4 |
| **6. Client portal core** | `portal` schema, client accounts and invite flow, projects, phases, tasks, requirements, progress computation, client dashboard, developer board, request triage | 4 |
| **7. Portal collaboration** | Realtime chat with presence and attachments, file sharing, approvals, activity feed, notifications | 6 |

### 21.3 Block C — Demos and the estate

| Phase | Deliverable | Depends on |
|---|---|---|
| **8. Variant framework** | Variant tables, routing, runtime dual-mode theming, switchers, clone function, branding editor with live preview. Built inside the clinic demo, then extracted to the shared package | 0, 4 |
| **9. Demo 1 — Clinic** | Public site plus admin plus three variants, seeded, deployed, with its company-site case study | 8 |
| **10. Super admin** | `control` schema and functions, app registry, unified inbox, cross-app variant manager, audit log, revalidation queue, health checks, estate dashboard | 9 |
| **11. Demo 2 — Restaurant** | Same, three variants | 9 |
| **12. Demo 3 — School** | Same, three variants | 11 |
| **13. Demo 4 — Real Estate** | Same, three variants | 12 |
| **14. Demo 5 — CRM** | Same, three variants | 13 |

### 21.4 Block D — Growth

| Phase | Deliverable | Depends on |
|---|---|---|
| **15. Messaging centre — stage 2** | WhatsApp Cloud API, two-way threading, approved templates, 24-hour window handling | 5 |
| **16. Growth** | Seven blog posts, cost estimator, company profile PDF, two location pages, internal-link pass, performance re-audit | 4 |

### 21.5 Notes on ordering

Phase 8 is the slowest stretch, because it establishes the variant pattern every later
demo reuses; phase 9 is next slowest for the same reason. Phases 11 to 14 are each
substantially faster.

Phase 10 lands after the first demo rather than at the end, because the super admin is
what makes operating five demos practical — building it late would mean months of
managing six panels by hand. With only one demo live it is not yet needed.

The clinic demo leads because clinic, dental and diagnostic businesses are the strongest
small-business software market in India, and the demo doubles as a sales asset the day
it ships.

WhatsApp is deliberately split. Stage 1 is free and takes a day. Stage 2 requires Meta
business verification, a dedicated phone number and approved templates, and is only
worth the effort once message volume justifies it.

---

## 22. Open Items

Needed before phase 4 (launch), not before phase 0 (development start).

| Item | Needed by | Fallback until then |
|---|---|---|
| Company domain | Phase 4 | Single config constant, `apkasaathitech.com` placeholder |
| Logo and brand colours, light and dark | Phase 1 | Neutral wordmark, provisional accent for each mode |
| Supabase, Vercel, Cloudflare, Resend accounts | Phase 0 | Local Supabase via CLI |
| Apka Saathi screenshots and feature list | Phase 1 | Placeholder frames |
| Founder's real project experience and technologies | Phase 1 | Section hidden rather than filled with invention |
| Phone, WhatsApp, email, registered address, CIN, GST | Phase 1 | Placeholders flagged in the admin dashboard |
| Working hours and office location | Phase 1 | Section hidden |
| Blender availability for 3D authoring | Phase 2 | Procedural geometry, no imported models |
| Demo domains or subdomains | Phase 7 | Vercel default `.vercel.app` URLs |

Nothing on this list blocks the start of work.

---

## 23. Decisions Recorded

| Decision | Reason |
|---|---|
| One loader for the whole estate, shown as an overlay | A wait is one of the few moments a visitor is definitely looking; two treatments would mean two versions of the brand one click apart |
| One test recipient, `kumarnitish4384@gmail.com`, everywhere | Keeps test traffic and demo seed data out of the owner's personal mailbox, permanently and in every app |
| Admin feedback is one themed toast component | The admin is where the theme rule is most often broken; stating it once stops it being decided per screen |
| Six separate repositories, not a monorepo | Independent deploys and domains; a broken demo cannot block the company site |
| One Supabase project, seven schemas | Free tier permits two projects; schema isolation gives the same separation |
| Tagged cache with admin invalidation | The only way to have fully dynamic content and static-speed delivery together |
| Section-based page model | Lets the owner restructure pages without a developer |
| Variants as data, not forked code | Fifteen industry demos from five codebases; new industries cost content time, not development time |
| Variant in the URL path, not a cookie or query parameter | Every variant stays independently linkable, shareable and statically cacheable |
| Dark and light as two designed themes, not an inversion | Depth, accent and imagery all have to change; an inverted palette looks cheap, which defeats the visual goal |
| Theme mode resolved by a blocking inline script | The only way to avoid a flash of the wrong theme on first paint |
| Both accents stored per variant, contrast-checked on save | Fifteen variants times two modes is thirty palettes; automated checking is the only way it stays accessible |
| Desktop WebGL, mobile pre-rendered video, poster fallback | Delivers the cinematic impression on every device while keeping mobile Lighthouse above 90 |
| Native CSS scroll-driven animation where supported | Heavy animation with near-zero JavaScript; the reason speed and spectacle coexist |
| Motion must be user-triggered and explain something | Reconciles the brief's "no random animation" with the demand for a striking UI |
| Super admin as a `control` schema with `SECURITY DEFINER` functions | One auditable doorway between apps, instead of broad cross-schema grants |
| Super admin owns the control plane; demo admins own the content plane | Rebuilding every domain form twice would guarantee drift; deep-link with shared session instead |
| Super admin built at phase 6, not last | Operating five demos by hand for months is the alternative |
| Cross-app revalidation queued and retried | A network call between deployments will eventually fail; silent staleness is worse than a warning |
| Every super-admin mutation writes an audit entry | A multi-app admin is only safe to operate if every action is traceable |
| Demos `noindex`, company site targets the keywords | Avoids deceptive ranking and near-duplicate penalties across fifteen variants; concentrates domain authority |
| Cloudflare R2 over Supabase Storage | 10 GB versus 1 GB free, no egress cost — decisive with fifteen variants plus 3D and video |
| Alt text required at the database level | Makes an SEO and accessibility rule impossible to skip |
| `consent_confirmed` required on testimonials | Makes the honesty rule structural |
| Client Projects tab hidden while empty | Honest without advertising the absence |
| Company website built and shipped completely before anything else | It is the only part that earns; every other block is added to a site that is already working |
| Client portal inside the company app, not a separate deployment | It shares auth, media, clients and notifications with the admin; splitting it would duplicate all four |
| Chat over Supabase Realtime, browser to Supabase directly | Serverless never sits in the socket path, so instant messaging works with no server to run |
| Progress computed from tasks, never typed in by hand | A manually-set percentage always drifts from reality and destroys the client's trust in the whole portal |
| Client-created tasks land in a triage queue, not the board | Protects scope; the client still sees their request acknowledged and tracked |
| Internal comments and estimates hidden from the client by a column, not by a UI check | A visibility rule enforced in the database cannot be leaked by a forgotten conditional |
| Clients invited by secure link, not emailed a password | A password in an inbox is a password in a breach; the invite flow also looks more professional |
| WhatsApp split into click-to-chat now, Cloud API later | Stage 1 is free and takes a day; stage 2 needs Meta verification and a dedicated number, and is only worth it at volume |
| Unofficial WhatsApp libraries rejected outright | They violate WhatsApp's terms and get the number banned — unacceptable for a company's main contact channel |
| Inbound email received through Cloudflare Email Routing | Free, reliable, and keeps replies threaded in the same inbox as everything else |

---

## 24. Client Portal and Task Tracker

When a client signs, they receive a login. From that moment they can see exactly what
is happening on their project, without asking.

This is a genuine differentiator. A freelancer sends WhatsApp updates when asked. A
company gives the client a portal. It costs us less time than the status calls it
replaces, and it can be demonstrated in a sales meeting before a single client exists.

### 24.1 Where it lives

Inside the company application, at `/portal`, backed by a new `portal` schema.

Not a separate deployment, because it shares authentication, media, client records and
notifications with the admin panel. Splitting it would mean maintaining all four twice.

### 24.2 The three views on one dataset

| View | Who | Sees |
|---|---|---|
| **Client portal** `/portal` | The client's people | Their projects only. Phases, progress, tasks marked client-visible, assigned developer, files, approvals, chat. Never estimates, internal notes, costs, or another client's anything. |
| **Work board** `/admin/work` | Developers | Their assigned tasks across projects, as a kanban board. Tick tasks done, log time, write internal notes. |
| **Delivery admin** `/admin/work` | Owner, admin | Everything. Create projects, define phases, assign developers, triage client requests, set visibility, see cost and time. |

### 24.3 Data model — `portal` schema

```sql
create type project_stage  as enum ('discovery','design','development',
                                    'testing','launch','support','on_hold','closed');
create type task_status    as enum ('backlog','todo','in_progress',
                                    'in_review','blocked','done','cancelled');
create type task_priority  as enum ('low','normal','high','urgent');
create type request_status as enum ('submitted','under_review','accepted',
                                    'declined','converted');
```

**`clients`** — `name`, `company_name`, `email`, `phone`, `whatsapp`, `gst`, `address`,
`logo_id`, `lead_id (fk company.leads)`, `status`, `notes`

Linking back to `company.leads` closes the loop: an enquiry becomes a client, and the
whole history stays connected.

**`client_users`** — `client_id`, `auth_user_id`, `full_name`, `role`
(`primary`, `member`, `viewer`), `is_active`, `invited_at`, `accepted_at`

More than one person from a client company can log in. The primary contact can invite
their own colleagues, capped by us.

**`client_projects`** — `client_id`, `name`, `slug`, `summary`, `stage project_stage`,
`start_date`, `target_date`, `actual_end_date`, `progress_percent (computed)`,
`health` (`on_track`, `at_risk`, `delayed`), `contract_value`, `currency`,
`is_client_visible`, `archived_at`

Named `client_projects` deliberately, so it is never confused with `company.projects`,
which is the public portfolio.

**`project_phases`** — `project_id`, `name`, `description`, `sort_order`,
`status`, `start_date`, `target_date`, `completed_at`, `weight`, `progress_percent (computed)`

**`project_members`** — `project_id`, `user_id`, `role` (`lead`, `developer`,
`designer`, `qa`, `manager`), `is_client_visible`, `assigned_at`

`is_client_visible` lets us show the client their developer without exposing everyone
who touched the repository.

**`requirements`** — `project_id`, `phase_id`, `title`, `description`, `source`
(`contract`, `client_request`, `internal`), `status`, `sort_order`

The agreed scope, itemised. This is what answers "kitna ho gaya, kitna baaki hai" with
something more meaningful than a task count.

**`tasks`** — `project_id`, `phase_id`, `requirement_id`, `title`, `description`,
`status task_status`, `priority task_priority`, `assignee_id`, `created_by`,
`created_by_type` (`team`, `client`), `due_date`, `estimate_hours`, `logged_hours`,
`sort_order`, `is_client_visible`, `blocked_reason`, `completed_at`

**`task_comments`** — `task_id`, `author_id`, `body`, `is_internal`, `attachments jsonb`

`is_internal` is a database column, not a UI condition. RLS filters it before the row
ever leaves Postgres, so no forgotten conditional in a component can leak an internal
note to a client.

**`client_requests`** — `project_id`, `client_user_id`, `title`, `description`,
`attachments jsonb`, `status request_status`, `reviewed_by`, `review_note`,
`converted_task_id`, `is_scope_change`

**`milestones`** — `project_id`, `name`, `description`, `due_date`, `completed_at`,
`requires_approval`, `payment_note`

**`approvals`** — `project_id`, `milestone_id`, `phase_id`, `requested_by`,
`approved_by`, `status`, `note`, `requested_at`, `responded_at`

**`project_files`** — `project_id`, `media_id`, `uploaded_by`, `category`
(`document`, `design`, `deliverable`, `reference`), `is_client_visible`, `version`

**`activity_log`** — `project_id`, `actor_id`, `actor_type`, `action`, `entity`,
`entity_id`, `summary`, `is_client_visible`

This drives the client's "what happened recently" feed. Every meaningful change writes
here automatically through triggers, so the feed can never fall out of sync with reality.

**`time_entries`** — `task_id`, `user_id`, `minutes`, `note`, `logged_on`

Team-only. Never exposed to the portal.

### 24.4 Progress, computed and never typed

A manually-entered percentage always drifts from reality, and once a client notices,
the entire portal loses credibility. So progress is derived:

```
phase.progress   = sum(estimate_hours of done, client-visible tasks in phase)
                 / sum(estimate_hours of all client-visible tasks in phase)

                   (falls back to task count where estimates are absent)

project.progress = weighted average of phase progress, by phase.weight
```

Recomputed by a Postgres trigger on every task status change. The developer ticks a
task; the client's percentage moves within a second. Nobody updates a number by hand.

`health` is derived too: `at_risk` when a phase passes 80% of its elapsed time under
60% complete, `delayed` when past its target date and unfinished.

### 24.5 The client's experience

```
/portal                        All their projects, each with progress and health
/portal/p/[slug]               Overview: phases, timeline, team, recent activity
/portal/p/[slug]/tasks         What is done, in progress, and pending
/portal/p/[slug]/requirements  The agreed scope, with status against each item
/portal/p/[slug]/requests      Their own requests and where each stands
/portal/p/[slug]/files         Documents, designs, deliverables
/portal/p/[slug]/chat          Real-time conversation with the team
/portal/p/[slug]/approvals     What is waiting on them
/portal/settings               Profile, team members, notification preferences
```

The overview is designed to answer four questions above the fold, without scrolling:
how far along are we, what is happening right now, what is waiting on me, and who do I
talk to.

### 24.6 Client-created tasks — and why they go to a queue

The client can add tasks. But a client task does not land directly on the board.

It becomes a **request**, which appears in the team's triage queue. The owner reviews
it, then either converts it to a task (choosing phase, priority and assignee), or
declines it with a written reason, or flags it as a scope change requiring a quote.

The client sees their request the whole time, with its status. Nothing disappears
silently.

This one design decision is what keeps a portal from becoming a scope-creep machine.
Without it, every client conversation ends with "but I added it to the tracker".

### 24.7 The developer's experience

`/admin/work/board` is a personal kanban: To Do, In Progress, In Review, Blocked, Done,
filtered to the logged-in developer across all projects. Drag to change status, or use
the keyboard. Each card shows project, phase, priority, due date and estimate.

Ticking a task done triggers, in order: status write, progress recomputation, activity
log entry, realtime push to the client's portal, and a notification to the client if
the task was client-visible.

Internal notes, estimates and time logging live on the same card, behind the
`is_internal` boundary.

### 24.8 Accounts and invitations

The owner creates the client from a won lead, which carries the contact details across.
The client then receives a **secure invite link**, valid for 72 hours, on which they set
their own password.

We do not email a password. A password sitting in an inbox is a password in the next
breach of that inbox, and the invite flow looks considerably more professional besides.
If a client insists on being sent credentials, the admin can generate a one-time
password that must be changed at first login.

Optional two-factor via email OTP for clients whose projects carry sensitive data.

### 24.9 Real-time chat

Per project, threaded, with the team on one side and the client's users on the other.

**`conversations`** — `project_id`, `type` (`client`, `internal`), `title`,
`last_message_at`
**`messages`** — `conversation_id`, `sender_id`, `sender_type`, `body`,
`attachments jsonb`, `reply_to_id`, `edited_at`, `deleted_at`
**`message_reads`** — `message_id`, `user_id`, `read_at`

Every project has two conversations: one with the client, and an internal one the
client cannot see and does not know exists.

**Why this works without a server:**

```
Client browser  ──WSS──►  Supabase Realtime  ◄──WSS──  Developer browser
                                │
                          Postgres (messages)

Next.js is not in this path at all.
```

Supabase Realtime is a separate WebSocket service. The browser holds the socket
directly. Next.js serverless functions never participate, so there is nothing to keep
running and no VPS required.

- **Delivery:** Postgres Changes on the `messages` table, filtered by conversation.
  Moves to Broadcast if volume ever justifies it.
- **Typing indicators and online status:** Realtime Presence — ephemeral, no database
  writes at all.
- **Unread counts:** `message_reads`, computed per user.
- **Attachments:** presigned direct upload to R2, exactly as elsewhere.
- **Offline fallback:** if a recipient has not opened the message within fifteen
  minutes, an email goes out; the owner also gets a WhatsApp ping.
- **Free-tier headroom:** 200 concurrent connections and 2 million messages a month.
  With ten active clients this is not a constraint we will approach.

### 24.10 Notifications

Configurable per user, per event: task completed, phase completed, new message,
approval requested, request answered, file uploaded, milestone reached.

Channels: in-app bell, email, and WhatsApp for the owner. Clients default to in-app plus
a daily email digest, because a notification for every ticked task becomes noise within
a week.

### 24.11 Security

- RLS on every table, scoped by project membership. A client user can read a row only
  where the project is one of theirs.
- `is_client_visible` and `is_internal` filtered in the policy, not in application code.
- Clients and developers are distinct roles in `user_role`; the portal and the admin are
  separate route groups with separate middleware.
- Every state change writes to `activity_log` with its actor.
- Files served through presigned, short-lived URLs — never a public bucket path.
- Rate limiting on client-initiated writes, so a stuck client script cannot flood a board.

---

## 25. Messaging Centre — Email and WhatsApp

A section in the company admin where the owner types a number or address, writes a
message, presses send — and sees the reply come back in the same place.

### 25.1 What it replaces

Today that conversation is scattered across a personal WhatsApp, a personal inbox and a
lead record that says nothing about either. The messaging centre makes one contact have
one timeline, whatever channel each message arrived on.

### 25.2 Routes

```
/admin/messages                Unified inbox — all channels, all threads
/admin/messages/[threadId]     One conversation, full history
/admin/messages/compose        New message: pick channel, recipient, template
/admin/messages/templates      Reusable email and WhatsApp templates
/admin/messages/settings       Channel configuration and health
```

### 25.3 Data model (`company` schema)

**`contacts`** — `name`, `email`, `phone`, `whatsapp`, `company_name`,
`lead_id`, `client_id`, `tags text[]`, `last_contacted_at`

One person, one row, regardless of how many channels they use. This is what makes a
unified timeline possible.

**`message_threads`** — `contact_id`, `channel` (`email`, `whatsapp`, `form`),
`subject`, `status` (`open`, `waiting`, `closed`), `assigned_to`, `last_message_at`,
`unread_count`

**`channel_messages`** — `thread_id`, `direction` (`outbound`, `inbound`), `channel`,
`body`, `html_body`, `attachments jsonb`, `provider_message_id`, `in_reply_to`,
`status` (`queued`, `sent`, `delivered`, `read`, `failed`, `bounced`), `error`,
`template_id`, `sent_by`, `created_at`

**`message_templates`** — `name`, `channel`, `subject`, `body`,
`variables text[]`, `whatsapp_template_name`, `approval_status`, `category`

### 25.4 Email

**Sending:** Resend. Compose with a template or free text, variable substitution
(`{{name}}`, `{{service}}`), attachments from the media library, and a preview in both
themes before sending.

**Receiving — the half most people skip:** replies are captured through **Cloudflare
Email Routing**, which is free. Mail to `hello@domain` is routed to a Worker, which
POSTs to a webhook on the company app, which parses and stores it against the right
thread.

**Threading:** every outbound email carries a `Reply-To` of
`reply+<thread-token>@domain`. The token identifies the thread on the way back, so a
reply lands in the right conversation even when the client changes their subject line
or writes from a different address.

**Delivery visibility:** Resend webhooks update each message's status through delivered,
opened, bounced and complained. A bounce raises an alert, because a silently failing
address is a lost client.

**Deliverability is a launch blocker.** SPF, DKIM and DMARC must be configured on the
domain before the first real email is sent. Without them, lead notifications land in
spam and the failure is invisible.

### 25.5 WhatsApp — stage 1, free, ships immediately

Click-to-chat via `wa.me` links, with the message pre-filled from page context:

```
Service page  ->  "Hi, I'm interested in Mobile App Development for my business."
Pricing page  ->  "Hi, I'd like a quote for the Business Website plan."
Demo page     ->  "Hi, I saw your dental clinic demo. Can we discuss something similar?"
```

Plus outbound notification to the owner's WhatsApp whenever a lead arrives — because a
WhatsApp is read in minutes and an email is read in hours.

**The honest limitation:** click-to-chat opens WhatsApp. The reply arrives on the
owner's phone, not in the admin panel. Stage 1 gives fast outbound and no inbound
visibility.

### 25.6 WhatsApp — stage 2, two-way in the panel

Real two-way messaging requires the **WhatsApp Business Cloud API** from Meta.

**What it needs:**
- A Meta Business account with business verification
- A phone number dedicated to the API — it cannot also be used in the normal WhatsApp
  app, so a second SIM is required
- Message templates submitted to Meta and approved before use

**The rule that shapes the whole feature:** free-form messages may only be sent within
**24 hours** of the contact's last message. Outside that window, only an approved
template may be sent. The compose screen therefore shows a live countdown on each
thread and switches automatically to template-only mode when the window closes.

**Cost:** Meta charges per conversation, priced by category and country, with some
service conversations free. Rates change; they must be checked against Meta's current
pricing before committing, and are not assumed anywhere in this document.

**Inbound:** Meta POSTs to a webhook — a Next.js Route Handler — which verifies the
signature, resolves the contact, appends to the thread and pushes to the open admin UI
through Supabase Realtime. Fully serverless; nothing to keep running.

**Explicitly rejected:** unofficial libraries that drive WhatsApp Web (Baileys,
whatsapp-web.js). They violate WhatsApp's terms and get numbers banned. Losing the
company's main contact number is not a risk worth taking to save a setup fee.

### 25.7 Unified inbox

One list. Every channel. Columns for contact, channel icon, last message, status, age
and assignee. Filter by channel, status, assignee and date; search across body, name,
email and phone.

Opening a thread shows the entire history with that person across every channel in one
timeline — the website form they submitted, the email they replied to, the WhatsApp
they sent — with a reply box that defaults to the channel they used last.

The sidebar of the thread shows their lead record, their client record if they have one,
their projects, and any open requests. Whoever is answering has the full picture without
opening another screen.

This inbox is also the one the super admin surfaces across all six applications
(Section 14.7).

### 25.8 Guardrails

- Rate limiting on outbound sends, per hour and per day
- Every send written to `activity_log` with its author
- Templates version-controlled; editing an approved WhatsApp template resets its status
- Opt-out honoured and enforced at the database level, per channel, permanently
- No bulk or marketing sending in v1 — this is a conversation tool, not a campaign tool,
  and building it as the latter is how a number gets reported and blocked

---

## 26. Brand — Apka Vission

**Brand name:** Apka Vission
**Hook line:** *Your Vision. We Make It Happen.*
**Legal entity:** Apka Saathi Private Limited

The services business trades as **Apka Vission**. The legal entity is unchanged
and is named explicitly wherever it matters — the footer, contracts, invoices,
`Organization` schema — so a visitor can always tell who they would actually be
contracting with. `site_settings` already separated `company_name` from
`legal_name`, so this needed no schema change.

### 26.1 On the spelling

"Vission" is not the standard English spelling. It was kept deliberately, and the
reason is concrete rather than stylistic:

| Domain | Status |
|---|---|
| `apkavision.com` | taken |
| `apkavision.in` | taken |
| **`apkavission.com`** | **available** |
| **`apkavission.in`** | **available** |

The correctly-spelled domains are already registered. The doubled S secures both
`.com` and `.in` under one consistent name, which is worth more than orthographic
correctness for a brand whose audience will reach it by link and by card far more
often than by typing it from memory.

Both should be registered together, and soon. A brand name without its domain is
a decision that can be taken away.

### 26.2 Family

- **Apka Saathi** — the product, an AI personal assistant
- **Apka Vission** — the services business
- **Apka Saathi Private Limited** — the company that owns both

The shared prefix is an asset: the two brands reinforce each other rather than
competing for recognition.

---

## 27. Client Documents — Scope, Charges and Payments

A generated document the client can read, covering what was agreed, what it
costs, what has been paid and what remains. It lives in the admin and surfaces in
the client portal.

### 27.1 Why it belongs in the product

Today this conversation happens over WhatsApp and gets lost. A client who cannot
see, at any moment, what they agreed to and what they still owe will eventually
ask — and every one of those questions is a call somebody has to take. Generating
it once, from data the system already holds, removes the entire class of question.

It is also the single artefact that most makes a small company look like a company.

### 27.2 Data model — extends the `portal` schema

```sql
create type document_kind as enum
  ('proposal','agreement','scope','invoice','receipt','completion');
create type document_status as enum
  ('draft','sent','viewed','signed','void');
```

**`documents`** — `project_id`, `client_id`, `kind document_kind`, `number`
(sequential, per kind, per financial year), `title`, `summary`, `currency`,
`subtotal`, `tax_rate`, `tax_amount`, `total`, `issued_on`, `due_on`,
`status document_status`, `terms`, `notes`, `pdf_media_id`, `created_by`

**`document_line_items`** — `document_id`, `description`, `quantity`,
`unit_price`, `amount`, `sort_order`

**`document_milestones`** — `document_id`, `milestone_id`, `label`, `percentage`,
`amount`, `due_on`

**`payments`** — `project_id`, `document_id`, `amount`, `paid_on`, `method`
(`bank`, `upi`, `cash`, `cheque`, `gateway`), `reference`, `note`, `recorded_by`,
`receipt_media_id`

**`document_signatures`** — `document_id`, `signer_type` (`client`, `company`),
`signer_name`, `signer_email`, `signed_at`, `ip_hash`, `user_agent`,
`consent_text`, `signature_image_id`

### 27.3 The numbers are derived

`paid_total`, `outstanding` and `payment_progress` are computed from `payments`,
never stored as editable fields. The same rule as portal progress, for the same
reason: a figure typed by hand drifts from reality, and a client who catches one
wrong number stops trusting every other number on the page.

Document numbering runs through a Postgres sequence per kind and financial year,
so two people issuing invoices at the same moment cannot produce a duplicate.

### 27.4 Signing

Not a legal e-signature service, and it must never claim to be. What it records is
an auditable acceptance: the client, logged in, reads the document and confirms
it, and the system stores who confirmed, when, from what hashed IP, and the exact
text they agreed to. A copy goes to both parties by email at the moment of signing.

That is sufficient for ordinary commercial agreement in India and is honest about
what it is. If a project ever needs a qualified digital signature, that is a
separate integration, and the schema leaves room for it.

Once signed, a document is immutable. Changes are issued as a new version
referencing the old one — amending a signed document in place destroys the only
thing signing was for.

### 27.5 Where each side sees it

**Admin** `/admin/work/[id]/documents` — create from a template, add line items,
attach to milestones, preview, issue, record payments, download the PDF, void with
a reason.

**Client portal** `/portal/p/[slug]/documents` — every document issued to them,
with status, a clear outstanding figure, payment history, and a sign action on
anything awaiting them.

PDFs are generated server-side, stored in R2 and referenced by `pdf_media_id`, so
what the client downloads today is byte-identical to what they downloaded a year
ago.

---

## 28. Employees and Access Control

### 28.1 Employee management

`/admin/team` in the services admin — the internal record, distinct from the
public `team_members` used on the About page.

**`employees`** (in `portal`) — `auth_user_id`, `full_name`, `email`, `phone`,
`role_title`, `department`, `employment_type`, `joined_on`, `left_on`,
`hourly_cost`, `skills text[]`, `is_active`, `notes`

The owner can invite an employee, assign them to projects, see their workload
across projects, and deactivate them.

`hourly_cost` is visible to `owner` and `super_admin` only, enforced by policy
rather than by hiding a field in the interface.

### 28.2 Cutting off access — the requirement stated plainly

When a project finishes, or an employee leaves, their login must stop working.
Immediately, and without deleting anything.

**Deactivation, not deletion.** Setting `is_active = false` on the profile is the
single switch. Every RLS helper already tests `is_active`, so a deactivated
account can read nothing anywhere in the estate — no separate revocation logic to
remember, and therefore none to forget.

The record stays. Their comments, completed tasks and time entries remain attached
and readable, because deleting a user would silently rewrite the project history
everyone else depends on.

**What has to happen for it to be immediate:**

1. `profiles.is_active = false`
2. Revoke all Supabase refresh tokens for that user, so an open session cannot
   silently renew itself
3. Middleware re-checks `is_active` on every request, not only at sign-in — a
   valid unexpired JWT must not outlive the decision to revoke it
4. Write to `control.audit_log`: who revoked whom, when, and why

**Per-project rather than per-account.** A client whose project is complete should
usually keep read access to their own history — the documents and the delivered
work — while losing the ability to raise requests or open new threads.
`client_users.access_level` (`full`, `read_only`, `revoked`) covers that without
disabling the account outright.

**Scheduled revocation.** A project marked complete can carry a date after which
client access drops to `read_only` automatically. Done by hand, it is done late or
not at all.

### 28.3 What this adds

`developer` and `client` already exist in `company.user_role`. What this section
establishes is that **`is_active` is the master switch for the entire estate**, and
that it is enforced in Postgres rather than in application code — because an
authorisation rule living in a component is one refactor away from being removed by
accident.

---

## 29. Responsive — a Release Blocker

Recorded at the owner's explicit instruction, as a rule rather than an aspiration.

**Nothing ships until it is correct on phone, tablet, laptop and desktop.** Not
"acceptable" — correct. A layout that only holds together at one width is not
finished work.

### 29.1 Widths that must be checked

| Class | Width | Notes |
|---|---|---|
| Small phone | 360px | The floor. Below this we do not optimise. |
| Phone | 390–430px | Most real traffic |
| Tablet portrait | 768px | |
| Tablet landscape / small laptop | 1024px | |
| Laptop | 1280–1440px | |
| Desktop | 1920px | Content must not simply stretch |

### 29.2 Rules that make it hold

- **Layouts must survive any item count.** Section content is admin-editable, so a
  grid that only looks right with exactly six items is a defect. The process
  section was rebuilt as a timeline for this reason: seven steps in a four-column
  grid left a hole, and the step count is editable.
- **Equal heights are enforced, not hoped for.** `auto-rows-fr` on the grid plus
  `h-full` and a column flex on the card. Either alone is insufficient.
- **Text length must not break a card.** Every card absorbs slack with `flex-1`, so
  a one-line body and a five-line body still end level.
- **No page-level horizontal scroll, ever.** Wide content scrolls inside its own
  container; decorative overflow is contained with `overflow-hidden` on the section.
- **Decoration must not sit on text.** Where a scene sits behind copy on narrow
  screens, it is masked away from the type.
- **WebGL scales, it does not switch off.** Phones run a reduced fragment count at
  device pixel ratio 1. The scene is not a desktop-only feature.
- **3D content fits its container at runtime.** Scene contents are scaled from the
  live viewport rather than fixed world units — the brand text clipped its first
  and last letter on narrow containers until this was fixed.

### 29.3 How it is verified

Every section is checked in a real browser at each width above, in **both themes**,
before it is considered done — and measured, not eyeballed: page-level horizontal
overflow, per-card heights within a grid, non-zero section heights, canvas
dimensions. A visual pass follows the measurements; it does not replace them.
