# Loading rules — the loader and the skeleton

**Status: locked. Owner's instruction, 2026-08-27.**
**Applies to every project in the estate** — the company website, the Apka
Saathi task tracker, and all fifteen demo sites.

---

## The rule, in the owner's words

> Jahan pe show hoga wahan pe, loader ke saath skeleton UI ka bhi use karna.
> Modern days mein woh bahut chalta hai. Best sa skeleton wala cheez chahiye.

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

The primitive and the admin content screens' skeletons are built. Still to do:
the public route fallbacks, and the same pass over the task tracker and the
demos when they exist.
