# Loading rules — the loader and the skeleton

**Status: locked. Owner's instruction, 2026-08-27.**
**Applies to every project in the estate** — the company website, the Apka
Saathi task tracker, and all fifteen demo sites.

---

## The rule, in the owner's words

> Jahan pe show hoga wahan pe, loader ke saath skeleton UI ka bhi use karna.
> Modern days mein woh bahut chalta hai. Best sa skeleton wala cheez chahiye.

Restated on 2026-08-28, and this half is absolute:

> Brand loader hi sab jagah chalega — jisme apna logo hai, aur left aur right
> se animation aur arrow wala. Yahi loader sab jagah rahega.

## One loader. This one. Everywhere.

**There is exactly one loader in this estate and it is
`components/brand/brand-loader`.** The mark in the centre, the two halves of
the name coming out from behind it and settling outward — `Apka` left,
`Vission` right — and the arrow under them. Not a spinner borrowed from a
library, not a second treatment for the admin, not a different one for a demo
site, and not a plain skeleton standing in for it.

It stays where it is on every route of every project: the company website, the
task tracker, and all fifteen demo sites. Anywhere a route is being waited for,
this is what is shown.

**Where it appears, in all three forms:**

| Form | Where | Component |
|---|---|---|
| Full lockup, as an overlay | Every `loading.tsx` — route changes and reloads | `<BrandLoader overlay size="lg" />` |
| Full lockup, as an overlay | A wait the person caused — save, delete, confirm | `useBusyWhile(...)` raises the same component |
| The mark alone | In place, inside a button mid-submit | `<BrandSpinner />` |

The third is the same identity at a size the lockup cannot work at. A lockup on
a 32px button is not a loader, it is a mistake — but it is still this loader's
mark, never a generic ring.

**A skeleton never replaces it.** The two run together and answer different
questions, which the table below sets out. Removing the loader from a route
because that route also has a skeleton is not a simplification, it is dropping
half the answer.

**This constrains other decisions, and one of them is live.** A route-level
`loading.tsx` is a Suspense boundary, and a Suspense boundary above a page that
calls `notFound()` flushes the response before the status can be set — so that
page answers 200 instead of 404. That is a real defect, written up in
[pre-production-cleanup.md](pre-production-cleanup.md) §1.1. **The loader is not
the thing that moves.** The fix has to come from the other side.

## Two waits, two treatments

They are not interchangeable, and saying so plainly is the point — "we already
have a loader" is exactly how a codebase ends up using neither correctly.

|  | **Brand loader** | **Skeleton** |
|---|---|---|
| For | A wait the person **caused** | Content that is **not here yet** |
| Triggered by | Save, delete, confirm, a followed link | A screen streaming in |
| Says | "This is working" | "This is the shape of what's coming" |
| Looks like | The lockup, over the dimmed page | The layout, in placeholder form |
| Lives in | `components/brand/brand-loader` | `components/ui/skeleton` |

**Both are used, often on the same screen.** A content screen skeletons its
panels while it arrives, and the same screen raises the overlay when a save is
running inside it.

For a wait that happens *in place* — a button mid-submit, a row being saved —
it is `BrandSpinner`, not the full lockup. A lockup on a 32px button is not a
loader, it is a mistake.

## What makes the skeleton good rather than present

A grey rectangle where content will be is not a skeleton, it is an apology.
Seven rules, all of them enforced by the shared primitive:

1. **It is the shape of the real thing.** Same heights, same rhythm, same
   rounding, same grid. If the content is a three-line paragraph, the skeleton
   is three bars with a short last one — real paragraphs end mid-measure.
   Anything else guarantees a layout jump when the content lands.
2. **It fades in after ~120ms.** A skeleton that flashes for 80ms on a fast
   connection is worse than no skeleton. `SkeletonRegion` holds it at zero
   opacity until the wait is real enough to be worth acknowledging.
3. **Items in a grid stagger.** Each card's sweep starts a beat after the last,
   so the screen reads as a wave rather than as nine boxes strobing in unison.
4. **The sweep is a highlight in both themes.** It uses the `--skeleton` and
   `--skeleton-sheen` tokens rather than reused surface steps, because the
   surface scale inverts between the themes — a skeleton built out of
   `surface-2` and `surface-3` sweeps a highlight in light and a shadow in dark.
5. **Only transform animates.** The sweep is a translated band, not a moving
   `background-position`, so it costs no repaint. Under reduced motion the
   global rule lands it off the right-hand edge and leaves a still block — the
   shape is still communicated, without the movement.
6. **It is server-rendered, with no JavaScript.** A placeholder that needs
   hydration arrives after the thing it was standing in for.
7. **It is decorative to a screen reader.** Every placeholder is `aria-hidden`;
   the surrounding `SkeletonRegion` carries `aria-busy` and one polite
   announcement. A reader hears "loading", not nine unlabelled boxes.

## Where a skeleton goes

- Every `loading.tsx` — the route's own shape, not a generic block.
- Every `<Suspense>` fallback.
- Any panel that fetches after the page has painted.
- The preview pane, until the frame inside it has loaded.

Composed from `Skeleton`, `SkeletonText`, `SkeletonCard` and `SkeletonRegion`.
One primitive, shapes built from it — never a second skeleton implementation,
for the same reason there is never a second loader.

## Status

**The loader is everywhere it should be.** `app/loading.tsx` covers every route
change in the application, `app/(site)/loading.tsx` covers the public site
inside its own shell, and as of 2026-08-28 every admin screen has its own
`loading.tsx` as well — `/admin/account` was the last one without and now has
one.

The skeleton primitive and the admin content screens' skeletons are built.
Still to do: shape-accurate skeletons for the public routes, which today show
the loader rather than their own outline, and the same pass over the task
tracker and the demos when they exist.

---

## The logo, said as plainly as the loader

**Given by the owner on 2026-08-30, and it binds every project in the estate.**

> logo bhi Apka Vission ka hi use karna hai — text me "Apka Vission" mat likho,
> logo use karo jo services me hai. Aur yahi logo aur loader services wala hi
> sab jagah, har project me.

**The logo is the file, never the name typed out.** Wherever the brand appears,
it is the mark from `public/brand/` — `logo-light.svg` and `logo-dark.svg` for
the full lockup, `symbol-*.svg` for the mark alone inside the loader. Two styled
words reading "Apka Vission" are a description of the brand, not the brand.

**Neither the logo nor this loader is redesigned per project.** Not adapted, not
simplified for a smaller application. A second loader is a second brand.

This was written down because the client portal's first version got both wrong —
a loader invented from a description, with the name as text and no mark. It cost
the owner a look at the screen to catch, which is the most expensive way to find
anything. The portal now carries the same rule at
`portal/docs/brand-rules.md`, with the four SVGs copied into its own
`public/brand/`.

**Copied, not imported**, because no project may depend on another. The cost is
that the mark lives in every repository and is kept in step by hand — real, and
stated rather than hidden.
