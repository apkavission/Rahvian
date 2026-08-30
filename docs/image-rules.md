# Image rules

> ## ⚠ IMPORTANT — READ BEFORE BUILDING ANY SCREEN, IN ANY PROJECT
>
> **An image must never reach a page looking broken, cut, blurry, stretched or
> low quality. Not once, on any project, on any screen.**
>
> Whoever is filling in content will eventually upload a picture that is too
> big, too small, the wrong shape, or already pixelated. That is not their
> mistake to catch — it is the panel's job to catch it and the page's job to
> survive it. Two halves, and both are required:
>
> 1. **The page never makes a picture worse.** It never crops it, never covers
>    it, never distorts it, and — the one most often got wrong — **never
>    enlarges it**. Enlarging is what makes a picture blurry, and the obvious
>    markup does it by accident. See "The trap" below.
> 2. **The admin panel warns, in every place a file can be chosen.** At upload,
>    in the picker, and in the library. Naming the numbers, saying what it will
>    look like, and saying what to do instead.
>
> This is the owner's standing instruction and it binds the company website,
> the Apka Saathi task tracker, and every demo site.

**Status: locked. Owner's instruction, 2026-08-27.**
**Applies to every project in the estate** — the company website, the Apka
Saathi task tracker, and all fifteen demo sites. Not one of them gets an
exception.

---

## The rule, in the owner's words

> Image bahut badi cheez hai. Na cut ho, na kahin se cover ho, na hi bada ya
> chhota ho — bilkul perfect aana chahiye. Admin panel mein size bata do ki
> kitne by kitne ka chahiye, lekin perfect chahiye.

## The rule, as the code has to enforce it

Four promises. An image is only correct when all four hold.

| # | Promise | What it forbids |
|---|---|---|
| 1 | **Never cropped.** The whole picture is visible, edge to edge. | `object-fit: cover`, fixed-height boxes an image is clipped into, `overflow: hidden` trimming a corner |
| 2 | **Never covered.** Nothing sits on top of it. | Badges, gradient scrims, hover overlays, text laid over the picture, a sticky header eating the top of it |
| 3 | **Never distorted.** The aspect ratio it was uploaded at is the aspect ratio it is drawn at. | A width and a height both set to fixed values that disagree with the file, `object-fit: fill` |
| 4 | **Never upscaled.** It is drawn at its natural size or smaller, never blown up. | A 400px logo stretched across a 1200px band |

Promises 1 and 3 together mean one thing in practice: **`object-fit: contain`
inside a box whose `aspect-ratio` matches the file**, and never `cover`.

## The trap — why "contain" alone is not enough

This is the mistake that produces exactly the blurry picture the rule exists to
prevent, and it looks completely correct in the code:

```html
<div class="aspect-[16/10]">
  <img src="…" class="size-full object-contain" />   <!-- WRONG -->
</div>
```

`object-contain` does **not** mean "draw it at its own size". It means "scale
it, up or down, until it fits". A 400px logo in a 1200px frame is blown up to
1200px and goes soft — promise 4 broken, and nothing about the markup looks
wrong.

The fix is to make the natural size a ceiling, so the browser may only ever
scale **down**:

```html
<div class="aspect-[16/10] flex items-center justify-center">
  <img src="…"
       style="max-width: 400px; max-height: 250px"   <!-- the file's own size -->
       class="max-h-full max-w-full object-contain" />
</div>
```

In this repo that is `FramedImage` and `NaturalImage` in
`src/components/media/image.tsx`, and **every stored image on the public site
goes through one of them**. Vectors are exempt, and must be: an SVG's intrinsic
size comes from its `viewBox` and is often a couple of dozen units, so capping a
logo at 24px would ruin the one format that scales perfectly.

What this gives, for the three cases that occur:

| The file is | What happens |
|---|---|
| Larger than the space | Scaled down. Sharp. The usual case. |
| Exactly right | Fills the space precisely. The intended case. |
| Smaller | Drawn at its own size, with space around it. It looks **small**, which is honest — rather than **blurry**, which is not. |

That last row is the whole point: a small file can no longer produce a blurry
page. It produces a small picture in a large space, which is visible, which the
panel warned about before it was ever chosen, and which the owner can fix by
uploading a bigger one.

Promise 4 is also the one the admin panel has to help with, because the code
cannot invent pixels that were never uploaded. Which brings us to the second
half of the instruction.

## Every image field states its exact size

Wherever a person uploads or picks an image — in **any** of the three admin
panels — the field must print the size it wants, before they choose the file:

> **Service card image — 1200 × 800 px** (3:2). PNG, JPG or WebP. Under 500 KB.

Not "a wide image". Not "roughly 2:1". The exact number, in pixels, and the
ratio in brackets so the intent survives a resize.

That size is **required metadata on the field descriptor**, not a sentence
someone remembered to type into a hint. A field that carries no declared size is
a bug in the field, and the media picker should refuse to render it rather than
quietly accept anything.

### What happens on a mismatch

| The uploaded file is | What the panel does |
|---|---|
| Exactly the stated size | Accepts it silently |
| The right ratio, larger | Accepts it, and says it will be shown smaller |
| The right ratio, smaller | **Warns.** It will be upscaled, which breaks promise 4 |
| The wrong ratio | **Warns, loudly, with both numbers.** Letterboxing is what promise 1 costs, and the owner should see it coming |

Warn, not block. A hard refusal at 1199 × 800 is a panel that gets fought
rather than used. The warning has to name both the size given and the size
wanted — "you gave 1600 × 900, this field wants 1200 × 800" — because a warning
that only says "wrong size" is a warning nobody can act on.

### And a second warning, about the file itself

The check above asks "does this suit *this field*". There is a separate question
that has to be answered before anyone has decided where a picture will go: **is
this file any good at all.** A photograph can be exactly the right shape and
still be 200px across.

`assessQuality()` answers it, and it is shown in **all three** places a file can
be chosen — the upload form, the picker on every content screen, and the media
library. One function, so the same file is never described two different ways:

| Verdict | When | What it says |
|---|---|---|
| **Good** | Large enough for every field | Nothing, unless asked — a "this is fine" on every field is noise, and noise is what stops warnings being read |
| **Note** | Big enough for the small fields only; or very narrow on one side; or over 1MB | What it will and will not fill, or that it will load slowly |
| **Poor** | Below the smallest declared field, or the size could not be read | That it is too small for anywhere on the site, and to use a larger version |

The wording of the "poor" case matters and is asserted by a test. It must **not**
threaten blurriness — the page has already made that impossible — it must say
the picture will look *small*, sitting in a space several times its size. A
warning that describes a problem the code already prevents teaches the owner to
distrust the warnings that are real.

### Every field's declared size lives in one table

One list, in code, read by the media picker and by the docs. Two lists drift,
and the one that drifts is the one the owner is reading.

That list is `src/lib/media/image-fields.ts`. As of 2026-08-28 it holds eleven
entries, and a field cannot be declared without one:

| Field | Size | Shape | Where it is seen |
|---|---|---|---|
| Service — social image | 1200 × 630 | 40:21 | Sharing a service page |
| Portfolio — card image | 1600 × 1000 | 16:10 | The portfolio grid, and the top of the project page |
| Portfolio — social image | 1200 × 630 | 40:21 | Sharing a project |
| Portfolio — gallery picture | 1200 wide or more | **any** | The "A look inside" grid on the project page |
| Case study — header image | 1600 × 1000 | 16:10 | The case studies grid and the top of the write-up |
| Case study — screenshot | 1200 wide or more | **any** | The "A look inside" grid on the write-up |
| Post — featured image | 1600 × 1000 | 16:10 | The blog list and across the top of the post |
| Post — social image | 1200 × 630 | 40:21 | Sharing a post |
| Team — photo | 400 × 400 | 1:1 | The About page portraits |
| Logo — light theme | 512 × 512 | 1:1 | Header, footer, emails. **SVG preferred** |
| Logo — dark theme | 512 × 512 | 1:1 | The same, on dark. **SVG preferred** |

**Where the numbers come from.** Each is the box the image is actually drawn
in, at twice its CSS size so it stays sharp on a dense screen, and at exactly
that box's aspect ratio. The last part is what makes "never cropped" keepable
rather than aspirational: a file at the box's own ratio has nothing to crop.

**The two "any shape" fields are a real exception, added 2026-08-28.** Every
other field draws its picture inside a frame of a fixed shape, which is what
makes the declared ratio a requirement. The two galleries render through
`NaturalImage`, which flows a picture at its own size — nothing is cropped and
nothing letterboxes — so a tall phone screen beside a wide dashboard is correct
there rather than a mistake. Warning about the shape would be warning about the
feature, and a warning that fires on correct input is one people learn to
ignore, which then costs them the nine fields where the shape does matter.

The exception is carried as `shapeFree` on the spec and is deliberately narrow.
**Only the shape half of the rule is turned off.** A file narrower than the
declared width still warns, in the same words, because `NaturalImage` never
enlarges either: too small is still too small, and it will be drawn at its own
size with space beside it. The hint prints
`1200 × 750 px or wider — any shape` rather than a ratio, so what is being asked
for is what is actually required.

### `contain`, never `cover` — and no hover zoom

Two decisions that follow from promise 1 and are easy to undo by accident.

**`object-fit: contain`.** With a correctly-sized file, `contain` and `cover`
draw the identical picture — the file fills the box exactly. They differ only
when the file is the wrong shape, and then the difference is the whole point:
`cover` silently cuts the edges off, `contain` leaves visible space. A crop
nobody can see is worse than a gap everybody can, because only one of them gets
fixed. The gap is also the rarer case, since the picker warns before a
wrong-shaped file is ever chosen.

**No hover zoom on a photograph.** Scaling an image inside a clipped box
enlarges *and* crops it for as long as the pointer is on it — both of the things
these rules forbid. The cards lift and their borders strengthen on hover
instead, which carries the interaction without touching the picture. An icon in
a coloured tile may still scale; there is no photograph in it to damage.

## Responsive, honestly

A site that reflows to a phone *does* draw the same image at different pixel
widths — that is what responsive means, and it is not what promise 4 forbids.
The precise commitment is:

- the box the image sits in keeps a **fixed aspect ratio** at every width, so
  nothing ever crops or squashes as the layout reflows;
- the image is served at the size it will be drawn at, through `srcset`, so a
  phone never downloads a desktop file;
- the declared upload size is the **largest** the field will ever draw, so the
  browser only ever scales down, never up.

## The three places this binds

1. **Company website** (this repo) — every image field across services,
   portfolio, case studies, blog, team, pricing, settings and the page builder,
   plus the logo and the social-preview images. **This is what the media library
   has to be built to do**; it is not a polish pass afterwards.
2. **Apka Saathi task tracker** — avatars, attachments, any project thumbnail.
3. **Every demo site** — the demos are the shop window. A cropped hero on a demo
   is a cropped hero a client sees before they ever talk to us.

## Status

**The library is built; the fields are not.** As of 2026-08-27:

| Promise | Where it stands |
|---|---|
| Dimensions are known, and known truthfully | **Done.** `src/lib/media/image-file.ts` reads them from the file's own header, never from what the browser reported. Tested against all five formats. |
| Never cropped, covered, distorted or upscaled — in the library | **Done.** The preview column at `/admin/media` shows every file whole, at its own ratio, never above its natural width, on white and on near-black. |
| The uploader is told its file's real size | **Done.** The upload form reads and shows it before the file is sent, and warns on anything under 400px wide. |
| Every image field states the exact size it wants | **Done.** All eleven are wired and each prints its size before a file is chosen — the two gallery fields print a minimum width and "any shape", which is what is actually required of them. |
| A mismatch warns, naming both numbers | **Done.** `describeFit()`, with unit tests asserting both numbers appear in every message. |
| One table of every field's declared size | **Done.** `src/lib/media/image-fields.ts`, reproduced above. |
| Never cropped, on the public site | **Done.** Every `object-cover` on a photograph became `object-contain`, and the hover zoom that enlarged and clipped card images was removed. |

**Still open:** the two multi-image columns — `projects.gallery` and
`case_studies.screenshots` — need the picker to become a repeater. And none of
this has been used in a browser yet; see [testing.md](testing.md).
