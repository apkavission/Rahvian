# Responsive rules

**Status: locked. Owner's instruction, 2026-08-27.**
**Applies to every project in the estate** — the company website, the Apka
Saathi task tracker, and all fifteen demo sites. Public pages *and* admin
panels. There is no screen that gets an exception.

---

## The rule, in the owner's words

> Sab project mein responsive bahut main hai. Saare screen mein chale.

## What that means, precisely

A screen is responsive when all six of these hold. Any one of them failing is a
bug of the same weight as a broken save, not a polish item for later.

| # | Rule | How it fails in practice |
|---|---|---|
| 1 | **The body never scrolls sideways.** At any width, from 320px up. | A fixed `width`, a long unbroken string, a table that sets the page width |
| 2 | **Wide content scrolls inside its own box.** Tables, code blocks, diagrams, wide charts. | A table that pushes the whole layout instead of scrolling within a container |
| 3 | **Nothing overlaps anything.** At every width, not just the three you checked. | Absolutely-positioned decoration that lands on the copy at 820px |
| 4 | **Text stays readable.** Never below 14px for body copy; headings scale down rather than wrapping to five lines. | A desktop `text-5xl` heading left unchanged on a phone |
| 5 | **Everything is reachable by thumb.** Tap targets at least 44 × 44px, with space between them. | Icon buttons packed at 32px on a phone toolbar |
| 6 | **Images obey [image-rules.md](image-rules.md).** The box keeps a fixed aspect ratio at every width, so a reflow never crops or squashes. | `object-fit: cover` on a box that changes shape with the viewport |

## Build small first

Design at **360px** and let the layout grow. The reverse — building for a
desktop and squeezing it down — is how every one of the six above gets broken:
the phone layout ends up as a series of exceptions to a design that assumed
width it does not have.

## The widths a screen is checked at

Before any screen is called done:

| Width | What it stands for |
|---|---|
| **360** | The small Android phone that is the floor |
| **390** | The common iPhone |
| **768** | Tablet portrait, and the point most two-column layouts have to fold |
| **1024** | Tablet landscape and the small laptop |
| **1280** | The laptop most of this will be built on |
| **1440+** | The desktop, where a layout has to stop growing rather than stretch |

Checking three of these and assuming the rest is what produces rule 3's
failures. The breakages live *between* the sizes you tested.

## Patterns already established here

Follow these rather than inventing a second answer:

- **The admin's three columns** — list, editor, preview — are `xl:grid-cols-…`
  and stack below that. At 1280 a form and a readable preview do not both fit,
  and a preview squeezed into 300px tells you nothing. That decision is in
  `src/app/admin/(dashboard)/services/page.tsx` and every content screen
  repeats it.
- **The preview pane has a phone-width toggle**, so the person writing the copy
  is the one who sees that their heading wraps badly on a phone. That is not
  decoration; it is how rule 4 gets caught before a visitor catches it.
- **Cards use `auto-rows-fr`** so a grid of them stays even when one card's
  text is longer.
- **The brand loader uses `min-h-dvh`, not `h-screen`** — on a phone the browser
  chrome changes the viewport height mid-wait, and `dvh` follows it.
- **Skeletons match the responsive shape they stand in for**, so nothing jumps
  when the content lands at any width.

## Status

The company website's public pages and admin screens are built to this and have
been checked in a browser. The task tracker and the demos are not written yet;
this file is the standard they are written to, not a review they get afterwards.
