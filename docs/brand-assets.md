# Brand Assets — Logo

**Status:** decided — the handshake mark, in teal. Production files still to be made.
**Recommended master:** `APKA_VISSION_TEAL.svg` + `APKA_VISSION_FAVICON_TEAL.svg`
**Location of all candidates:** `C:\Users\Pratiek A Jain\Downloads\`

---

## The candidates

Two separate families were supplied, and they are not variations of each other.

| Family | Files | Mark |
|---|---|---|
| **A — early six** | `apka_vission_logo_1..6.png` | tent, bulb ×2, shield, mountain, planet — each with a photographic city skyline inside |
| **B — handshake** | `APKA_VISSION.svg`, `APKA_VISSION_favicon.svg`, `APKA_VISSION_TEAL.svg`, `APKA_VISSION_FAVICON_TEAL.svg`, `APKA_VISSION_TEAL.png` | an `A` whose right stroke becomes a rising arrow, with a handshake at its centre |

Family B is the better mark, and the teal version of it is the one to ship.

---

## Evidence

### The 24px test decides it

The header renders the mark at roughly 24px. Each candidate's symbol was isolated
(wordmark cropped away, so the six got a fair hearing), resized to 24px tall, then
magnified with nearest-neighbour so what survives can be seen.

| Candidate | At 24px |
|---|---|
| **Handshake mark** | silhouette holds — the `A` and the rising arrow both stay legible |
| 1 — tent | reads as a plain triangle; the arrow inside is gone |
| 2, 3 — bulb | outline survives, interior is mud |
| 4 — shield | mud |
| 5 — mountain | mud, and the peak dissolves into a light background |
| 6 — planet | mud |

The cause is the same in all six: **a photographic city skyline inside the mark.**
A photograph is not a logo. It cannot survive being made small, cannot be printed
in one colour, and cannot be recoloured by the theme.

### The handshake mark is the only one with a separable symbol

Candidates 1–6 were supplied as fixed lockups — symbol above, wordmark below, one
file. There is no symbol on its own, so there is nothing to put in a favicon, an
app icon, or a social avatar. Family B ships the symbol as its own file.

### Meaning

Bulb, shield, globe and mountain are the four most-used stock ideas in software
branding; none of them says anything specific about this company. The handshake
inside a rising arrow says *partnership* and *growth* — which is what a services
business actually sells — and it hides an `A` in the silhouette.

---

## The accent decision: teal, not gold

Measured contrast against the two theme backgrounds (`--bg` light `#fcfcfd`,
dark `#0e1218`). WCAG needs 4.5:1 for text and 3:1 for UI shapes.

| Colour | vs light | vs dark |
|---|---|---|
| logo gold `#f5d878` | **1.37** ✗ | 13.39 ✓ |
| deep gold `#b79649` | **2.74** ✗ | 6.68 ✓ |
| dark gold `#886747` | 5.02 ✓ | 3.65 ✓ |
| **teal light `#0e7c7b`** (current) | **4.89 ✓** | 3.74 ✓ |
| **teal dark `#2dd4bf`** (current) | 1.82 | **10.09 ✓** |

**There is no gold that is both still recognisably gold and legible on white.**
By the time it passes at 5.02:1 it is the brown `#886747` — and a brown accent is
not the premium signal gold was chosen for. Gold works only against dark, so a
gold accent would mean a site that is honest in dark mode and broken in light.

The teal pair already passes in both themes, the WebGL scenes read the accent from
CSS, and the contrast pass is already done. **Keep teal. Adopt the teal logo.**

Note the distinction: the logo's own teal `#2ec4b6` scores 2.11 on white, which is
fine — a *mark* is not held to text contrast. It is the *accent token* driving
buttons, links and focus rings that must pass, and `#0e7c7b` / `#2dd4bf` do.
The logo colour and the accent token stay separate values.

Gold is not wasted. It is a good **secondary** — dark-surface hero panels,
certificates, invoices, print.

---

## Four defects to fix before this ships

Measured from the supplied files. None is a reason to reject the mark.

### 1. The SVGs are not vectors

All four contain exactly one `<image>` tag holding a base64 PNG. Zero `<path>`
elements.

```
APKA_VISSION.svg              417 KB   <image>:1  <path>:0
APKA_VISSION_TEAL.svg         398 KB   <image>:1  <path>:0
APKA_VISSION_favicon.svg      289 KB   <image>:1  <path>:0
APKA_VISSION_FAVICON_TEAL.svg 259 KB   <image>:1  <path>:0
```

So they are heavier than the PNG they wrap, still soft on retina, and still
cannot be recoloured by the theme. **A real vector redraw is required.**

### 2. 55% of the mark is black, and dark mode is black

| | |
|---|---|
| Near-black pixels | **55.1%** of the opaque mark |
| Contrast of that black vs `--bg` dark `#0e1218` | **1.12:1** |

Better than half the logo is invisible in the dark theme. Only the teal edge
highlight survives. **A dark-theme version is required**, with the black raised to
a light neutral. `site_settings.logo_light_id` / `logo_dark_id` already exist for
this, so it costs no schema work.

### 3. The favicon file is not square

`APKA_VISSION_favicon.svg` is a 692×692 canvas, but the ink inside measures
**652×352 — aspect 1.85**, with 170px of dead space above it. Used as a favicon it
renders about 32×17px. **The symbol needs a genuinely square-cropped lockup**,
tightened, possibly with the arrow shortened.

### 4. Padding is uneven everywhere

`APKA_VISSION_TEAL.png` is a 1536×1024 canvas holding a 713×497 mark — 432px of
slack on the left. Uneven padding makes a logo look misaligned in a header no
matter how the CSS is written. **Trim every master to the ink.**

---

---

## Round 2 — the hand-drawn SVG redraw (reviewed)

Files: `APKA_VISSION_LIGHT.svg`, `APKA_VISSION_DARK.svg`,
`APKA_VISSION_FAVICON_LIGHT.svg`, `APKA_VISSION_FAVICON_DARK.svg`.

**Verdict: keep this round's file format and colour, go back to round 1's drawing.**

### What round 2 got right

- **Real vector.** Actual `<path>` geometry, no embedded raster. Defect 1 solved.
- **Both themes shipped**, and coloured straight from the design tokens.
  Every value passes:

  | | Contrast |
  |---|---|
  | dark ink `#E8EEF2` on `--bg` dark `#0e1218` | 16.04 ✓ |
  | dark accent `#2DD4BF` on `#0e1218` | 10.09 ✓ |
  | light ink `#18212A` on `--bg` light `#fcfcfd` | 15.88 ✓ |
  | light accent `#0E7C7B` on `#fcfcfd` | 4.89 ✓ |

  The dark ink is within a hair of `--text` dark `#e8edf4`. Defect 2 solved —
  nothing disappears in dark mode any more.

### Where the drawing went backwards

Rendered side by side at 24px, round 1 still reads and round 2 does not.

- **The handshake is gone.** It has collapsed into an angular zigzag that reads as
  noise. The handshake was the entire idea — it is what made this mark mean
  *partnership* instead of being another abstract letterform.
- **The `A` and the arrow no longer connect.** In round 1 the `A`'s right stroke
  *became* the rising arrow — one continuous gesture, and the clever part of the
  design. Round 2 draws a solid `A` and a detached shape beside it.
- **There is no arrowhead.** The right-hand shape ends flat. Without the head it
  reads as a tick, not a rising arrow, so the *growth* half of the meaning is lost
  too.
- **The `A`'s counter is triple-layered** — dark `A`, teal `A` inside it, dark
  triangle inside that. Three nested shapes in the spot where the eye needs one.
- **The teal sweep cuts across the `A`'s legs** and floats free of the mark
  instead of tying it together.

### Bugs to fix regardless of which drawing wins

1. **The wordmark renders as `APKAVISSION`, with no space.** The separator is a
   trailing space inside `<tspan fill="…">APKA </tspan>`, and SVG collapses it.
   Put the gap in with `dx`, or make it a separate positioned tspan.
2. **The wordmark is live `<text>` in Inter.** On any machine without Inter it
   falls back to Arial and the logo changes shape — including in email clients,
   PDFs and other people's design tools. **Convert all text to outlines.**
3. **The tagline rules sit on top of the tagline.** The rules span x 235–315 and
   585–665 at y 370; the tagline is centred at 450 and runs roughly x 260–640 at
   baseline 382. They overlap. Shorten the rules and move them outboard, or drop
   them.
4. **The favicon is still not square.** Ink measures 1332×741 — **aspect 1.80** —
   inside a square canvas, sitting with 12% padding above and **44% below**. At a
   32px favicon the mark renders about **26×14px**. This is defect 3 from round 1,
   unchanged. The square lockup has to be a genuinely different composition —
   stack the arrow over the `A`, or crop to the `A` and handshake alone — not the
   horizontal mark dropped into a square box.
5. **`<title>` is mojibake** — `RAHVIAN â Your Vision…`. The em dash was
   saved as latin-1 instead of UTF-8. A screen reader will read it aloud. Save the
   file as UTF-8.

---

---

## Round 3 — the traced vector. **Chosen. In use.**

Files, now committed to the repository:

| Repo path | Source file | Ink | Aspect |
|---|---|---|---|
| `public/brand/symbol-light.svg` | `APKA_VISSION_FAVICON_LIGHT(1).svg` | `#18212A` / `#0E7C7B` | 1.81 |
| `public/brand/symbol-dark.svg` | `APKA_VISSION_FAVICON_DARK(1).svg` | `#E8EEF2` / `#2DD4BF` | 1.81 |
| `public/brand/logo-light.svg` | `APKA_VISSION_LIGHT (1).svg` | `#18212A` / `#0E7C7B` | 1.63 |
| `public/brand/logo-dark.svg` | `APKA_VISSION_DARK(1).svg` | `#E8EEF2` / `#2DD4BF` | 1.63 |

This is round 1's drawing rebuilt as true vector, in round 2's colours. It is
the version to ship.

### What it fixed

- **Real geometry.** 241 subpaths in the lockup, 111 in the symbol, zero
  embedded raster. 45KB and 25KB — an order of magnitude under the 400KB
  PNG-in-an-SVG-wrapper of round 1.
- **The drawing is back.** Handshake legible, the `A` flowing into the arrow as
  one gesture, arrowhead present.
- **Wordmark is outlines**, not `<text>`. No font dependency, and the missing
  space in `APKAVISSION` is gone.
- **Tagline rules moved outboard.** No longer overlapping the tagline.
- **Both themes**, coloured from the design tokens. Every value passes:
  16.04 and 10.09 against `--bg` dark, 15.88 and 4.89 against `--bg` light.
- **`<title>` encoding is clean** — a correct UTF-8 em dash.
- **Padding trimmed.** The `viewBox` of each of the four files was tightened to
  its ink as part of committing them, so a rendered box now has zero slack and
  padding is a CSS decision.

### At real size

Rendered at the sizes that actually ship:

| | Result |
|---|---|
| Header, 30px tall | fully legible — `A`, handshake and arrow all read |
| Favicon, 18px tall inside a 32px square | `A` and arrow read; the handshake becomes a mass |

Round 3 reads better at 24px than round 1's raster did, because flat vector
edges survive downscaling and a shaded bitmap does not.

### Two things still outstanding

1. **Trace noise.** 72 of the symbol's 111 subpaths and 133 of the lockup's 241
   measure under 25 user units. Most are legitimate detail — knuckles, finger
   creases — but a handful are free-floating specks, visible as faint dots below
   and right of the mark at large sizes. They should be deleted in the source
   file, not worked around in CSS. They also inflate the ink bounding box, so
   the trimmed `viewBox` values above will need recomputing once they go.

2. **There is still no square lockup.** Both files are wide (1.81 and 1.63), so
   a square icon letterboxes the mark to 18 of its 32 pixels. A square
   composition — the arrow stacked over the `A`, or a crop to the `A` and
   handshake alone — would recover roughly 55% more height in a favicon, an app
   icon and a social avatar. This is the one remaining piece of design work.

### And a constraint worth knowing

The mark separates the two hands with **transparent knockout gaps**, not drawn
outlines — 68% of the symbol's bounding box is transparent. That is exactly
right on a theme background, where the gaps fill with `--bg`. It is wrong on a
photograph or a coloured panel, where the finger separations will fill with
whatever is behind them. **A placement over imagery needs a third variant with
the outlines drawn in an explicit colour.**

---

## Where the logo is used in the codebase

Wired up and verified in the production build.

| Concern | Where |
|---|---|
| Files | `public/brand/*.svg` |
| Database rows | `company.media`, folder `brand`, keyed by `r2_key` |
| Which file is the logo | `site_settings.logo_light_id` / `logo_dark_id` → the **symbol** pair |
| Query | `src/lib/queries/brand.ts` — `getBrandLogos()`, one embedded read, cached under the site-settings tag |
| Component | `src/components/site/brand-logo.tsx` — `<BrandLogo height={n} />` |
| Theme swap | `.theme-light-only` / `.theme-dark-only` in `globals.css` |
| Header | `header.tsx` passes `<BrandLogo height={30} />` into `header-nav` |
| Footer | `footer.tsx`, `height={36}` |
| Browser tab | `src/app/icon.svg` |
| Legacy tab | `src/app/favicon.ico` — 16/32/48px |
| iOS home screen | `src/app/apple-icon.png` — 180×180 |
| Seeding | `seedBrandMedia()` in `scripts/seed.mjs` |

Decisions behind that table:

- **The settings columns hold the symbol, not the full lockup.** The lockup's
  tagline needs roughly 380px of width before it is legible; a 30px header
  would render it about three pixels tall. Header and footer therefore pair the
  symbol with the company name as live text. The full lockup stays in `media`
  for heroes, documents, email signatures and print, where it has the room.
- **Both files are in the HTML and CSS hides one.** Choosing in JavaScript
  would mean either a flash of the wrong mark or no mark at all before
  hydration. The three-state rule mirrors the token blocks at the top of
  `globals.css` — light by default, dark under `prefers-color-scheme` only when
  no explicit choice exists, explicit `data-theme` winning both ways.
- **`<img>`, not `next/image`.** A same-origin SVG of known intrinsic size has
  nothing to resize or re-encode, and the header logo must never be deferred.
  `width` and `height` come from the stored dimensions so the navigation bar
  does not reflow on first paint.
- **`icon.svg` carries its own `prefers-color-scheme` block.** A favicon cannot
  see the site's `data-theme`, so it follows the OS. `favicon.ico` and
  `apple-icon.png` cannot switch at all and carry the light-background mark;
  the Apple icon sits on a solid `#fcfcfd` ground because iOS gives
  transparency a black backing.
- **Brand files are served from `public/`, not R2.** They paint on the first
  frame of every page, so a second origin on that path buys nothing and costs a
  DNS lookup. `public_url` is simply already root-relative for these four.
  Editor uploads still go to R2.

Verified in the prerendered HTML of `/`:

```html
<img src="/brand/symbol-light.svg" alt="" aria-hidden="true"
     width="54" height="30" class="theme-light-only"/>
<img src="/brand/symbol-dark.svg"  alt="" aria-hidden="true"
     width="54" height="30" class="theme-dark-only"/>
```

plus `<link rel="icon">` for both `favicon.ico` and `icon.svg`, and
`<link rel="apple-touch-icon">` for the 180×180 PNG.

---

## Still to produce

- [ ] Delete the free-floating trace specks, then recompute the trimmed
      `viewBox` values and the `width`/`height` in `BRAND_MEDIA`
- [ ] A square symbol lockup, composed for a square rather than letterboxed
- [ ] An on-imagery variant with drawn outlines instead of knockout gaps
- [ ] A single-colour version for stamps, invoices and print
- [ ] An OpenGraph image using the full lockup — `opengraph-image` is not yet
      set, so links currently share with no card

---

## Naming

`Rahvian Technologies Private Limited` is the company. **`Rahvian` is the services
brand inside it** — and `Rahvian` is the document-and-reminder web and app
product already built under the same company.

So `RAHVIAN` on the mark is correct for this site. The legal entity is
named separately, in the footer, the legal pages and the invoice template, so a
visitor always knows who they would be contracting with. `site_settings` already
carries both: `company_name` is `Rahvian`, `legal_name` is
`Rahvian Technologies Private Limited`.
