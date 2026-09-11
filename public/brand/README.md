# Brand files

Cut out of `docs/brand/identity-sheet.png` — the identity sheet the designer
sent as a single 1254 × 1254 raster, kept out of `public/` because nothing
renders it and it should not be served — by `scripts/extract-brand.mjs`, and composed into
the horizontal lockups by `scripts/compose-lockup.mjs`. The icons come from
`scripts/brand-icons.mjs`, and `scripts/brand-estate.mjs` copies all of it to
the other eight applications.

| File | What it is |
|---|---|
| `symbol-light.png` | The mark, dark ink. Light pages. |
| `symbol-dark.png` | The mark, light ink. Dark pages. Recoloured from the same drawing, not cropped from the smaller white one. |
| `logo-light.png` | The primary lockup — mark over wordmark over tagline. |
| `logo-dark.png` | The horizontal lockup in white, as drawn on the sheet. |
| `logo-wide-light.png` / `logo-wide-dark.png` | The horizontal lockup, **composed**: the designer's mark plus the wordmark set live in Montserrat. The sheet's own light horizontal panel has its caption inside the artwork's rectangle, so it cannot be cropped cleanly. |
| `logo-email.png` | The same, at 800px, for email and share cards. |
| `icon-dark.png` / `icon-light.png` | The app icon on its tile, as drawn. The tile is kept: a transparent icon takes the colour of whatever launcher it lands in. |
| `icon-192.png` | Android, and a web manifest. |

## These are rasters, and that is temporary

The identity arrived as a picture of itself. **When the designer sends vectors**,
replace `symbol-*` and `logo-*` with SVGs, re-run `brand-icons.mjs` and
`brand-estate.mjs`, and update `src/lib/media/image-file.test.ts` — which
asserts the format of these four files and will go red until it is told.

What to ask for: SVG with the wordmark converted to outlines, flat (no
gradient, no 3D, no glow), two colours, a mark-only square version, a
one-colour black version, and a screenshot at 16px.

## The colours, measured

`#00D1B2` is the brand teal and is **not** a text or button colour: white on it
measures 1.95:1, which cannot be read. It lives in `--brand`. The darker
`#0C6F6E` carries white at 5.98:1 and lives in `--accent`. Two tokens, so the
distinction cannot be lost by somebody reaching for "the brand colour".

Ink `#0B1F26`, page `#F5F7FA`, light teal `#7EE7D6`. Typography: Montserrat for
headings, Poppins for everything else.
