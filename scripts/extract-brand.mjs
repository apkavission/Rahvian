/**
 * The brand files, cut out of the sheet the designer sent.
 *
 * ---------------------------------------------------------------------------
 * **Why this script exists.** What arrived was a 1254 × 1254 PNG of a brand
 * presentation — the logo, the palette, a business card, an email signature,
 * all on one page. The application needs seven files out of it, most on a
 * transparent background.
 *
 * There is no image library in this project — no `sharp`, no `jimp` — and
 * adding one to crop seven pictures once would be a dependency in every future
 * audit and upgrade. A browser already has a complete image pipeline, so this
 * drives one.
 *
 * **It is re-runnable.** When the designer sends proper SVGs these files get
 * replaced by hand and this script stops being used; until then, a better
 * export of the sheet means running it again rather than cropping by hand in
 * an editor nobody else has.
 *
 * ---------------------------------------------------------------------------
 * **How the background is removed, and the two things that went wrong first.**
 *
 * *Not by luminance.* The obvious rule — brighter means more transparent — is
 * wrong for coloured artwork: the brand teal is a bright colour, so a
 * luminance rule makes the teal half-transparent and the mark comes out
 * ghostly. What separates ink from paper is **distance from the background
 * colour, per channel**: teal is 255 away from white on red, the paper is 8
 * away on everything.
 *
 * *Not from one sampled corner, either.* That was the first attempt and it
 * left a grey block behind the logo when shown on a dark page, because these
 * panels sit on a **gradient** — the paper at the right edge is not the colour
 * of the paper at the left. The background is now read at both ends of each
 * row and interpolated across it.
 *
 * Partially transparent pixels are un-multiplied back toward their own colour,
 * or every anti-aliased edge keeps a rim of the panel it was cut from — the
 * halo that makes a cut-out look cut out.
 *
 * ---------------------------------------------------------------------------
 * **Two of these are taken whole, and that is deliberate.** An app icon *is*
 * its rounded tile: knocking the tile out would let a launcher's own colour
 * through and make the icon unreadable on somebody's home screen.
 */
import { chromium } from "@playwright/test";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const BRAND = resolve(HERE, "../public/brand");
/*
  The sheet lives in `docs/brand/`, not in `public/`.

  It was in `public/brand/` for an afternoon, which meant a 1.7MB picture of
  the company's whole identity — business card, email signature, palette — was
  being served at a guessable URL on the public site. It is a source file, not
  an asset: nothing renders it, and everything that needs a piece of it has that
  piece cut out beside this script.
*/
const SHEET = resolve(
  HERE,
  "../docs/brand",
  process.env.BRAND_SHEET ?? "identity-sheet.png",
);

/**
 * What to take, from where, and how big to write it.
 *
 * Windows are fractions of the sheet rather than pixels, so a sheet re-exported
 * at another size still works. Inside a window the artwork is found by looking
 * for ink, and the crop is tightened to it — so a window only has to *contain*
 * its subject and exclude the neighbours and the panel's own caption.
 *
 * `tile: true` skips that search and takes the window exactly, because a tile's
 * own edge is the thing wanted.
 */
const CUTS = [
  {
    name: "logo-light",
    what: "the primary lockup — mark, wordmark, tagline — dark ink, for a light page",
    window: { x: 0.05, y: 0.055, w: 0.46, h: 0.31 },
    width: 1400,
  },
  {
    name: "logo-dark",
    what: "the horizontal lockup in white, for a dark page",
    window: { x: 0.575, y: 0.045, w: 0.4, h: 0.1 },
    width: 1400,
  },
  /*
    The mark comes out of the *primary logo*, not out of the brand-elements row.

    The row's "RV" is the monogram only — the swoosh beside it is a separate
    element on that sheet — so cropping there gives a mark the rest of the
    identity does not use. Read off a grid overlaid on the sheet rather than
    guessed, which is how this was found.
  */
  {
    name: "symbol-light",
    what: "the mark alone — R, V and the swoosh — dark ink",
    window: { x: 0.105, y: 0.065, w: 0.36, h: 0.17 },
    width: 512,
  },
  {
    name: "symbol-dark",
    what: "the same mark with its ink turned light, for a dark page",
    window: { x: 0.105, y: 0.065, w: 0.36, h: 0.17 },
    width: 512,
    /*
      Recoloured rather than cropped from the white lockup at the top of the
      sheet, and the reason is resolution: that one is 144px wide on the sheet
      and this one is 450. Turning the ink light keeps every edge of the larger
      drawing and leaves the teal exactly as designed.
    */
    recolour: "inkToLight",
  },
  {
    name: "icon-dark",
    what: "the app icon on its dark tile, as drawn",
    window: { x: 0.597, y: 0.296, w: 0.129, h: 0.129 },
    tile: true,
    width: 512,
  },
  {
    name: "icon-light",
    what: "the app icon on its light tile, as drawn",
    window: { x: 0.806, y: 0.296, w: 0.129, h: 0.129 },
    tile: true,
    width: 512,
  },
];

const browser = await chromium.launch();
const page = await browser.newPage();

const dataUrl = `data:image/png;base64,${readFileSync(SHEET).toString("base64")}`;

const results = await page.evaluate(
  async ({ dataUrl, cuts }) => {
    const image = new Image();
    image.src = dataUrl;
    await image.decode();

    const source = document.createElement("canvas");
    source.width = image.naturalWidth;
    source.height = image.naturalHeight;
    const ctx = source.getContext("2d", { willReadFrequently: true });
    ctx.drawImage(image, 0, 0);

    const out = [];

    for (const cut of cuts) {
      const wx = Math.round(cut.window.x * source.width);
      const wy = Math.round(cut.window.y * source.height);
      const ww = Math.round(cut.window.w * source.width);
      const wh = Math.round(cut.window.h * source.height);

      const data = ctx.getImageData(wx, wy, ww, wh);
      const px = data.data;

      /** The paper behind a pixel: both ends of its row, interpolated across. */
      const paperAt = (x, y) => {
        const left = y * ww * 4;
        const right = (y * ww + ww - 1) * 4;
        const t = ww > 1 ? x / (ww - 1) : 0;
        return [
          px[left] + (px[right] - px[left]) * t,
          px[left + 1] + (px[right + 1] - px[left + 1]) * t,
          px[left + 2] + (px[right + 2] - px[left + 2]) * t,
        ];
      };

      const distance = (x, y) => {
        const i = (y * ww + x) * 4;
        const paper = paperAt(x, y);
        return Math.max(
          Math.abs(px[i] - paper[0]),
          Math.abs(px[i + 1] - paper[1]),
          Math.abs(px[i + 2] - paper[2]),
        );
      };

      let bx = 0;
      let by = 0;
      let bw = ww;
      let bh = wh;

      if (!cut.tile) {
        /* Where the ink actually is, so the crop is tight to the artwork. */
        let minX = ww;
        let minY = wh;
        let maxX = -1;
        let maxY = -1;

        for (let y = 0; y < wh; y += 1) {
          for (let x = 0; x < ww; x += 1) {
            if (distance(x, y) > 40) {
              if (x < minX) minX = x;
              if (x > maxX) maxX = x;
              if (y < minY) minY = y;
              if (y > maxY) maxY = y;
            }
          }
        }

        if (maxX < 0) {
          out.push({ name: cut.name, error: "no artwork found in that window" });
          continue;
        }

        const pad = 3;
        bx = Math.max(0, minX - pad);
        by = Math.max(0, minY - pad);
        bw = Math.min(ww - bx, maxX - minX + 1 + pad * 2);
        bh = Math.min(wh - by, maxY - minY + 1 + pad * 2);
      }

      const cropped = ctx.getImageData(wx + bx, wy + by, bw, bh);
      const cp = cropped.data;

      if (!cut.tile) {
        for (let y = 0; y < bh; y += 1) {
          for (let x = 0; x < bw; x += 1) {
            const i = (y * bw + x) * 4;
            const paper = paperAt(bx + x, by + y);

            const d = Math.max(
              Math.abs(cp[i] - paper[0]),
              Math.abs(cp[i + 1] - paper[1]),
              Math.abs(cp[i + 2] - paper[2]),
            );

            /* A soft ramp, so an anti-aliased edge stays anti-aliased. */
            const alpha = Math.max(0, Math.min(1, (d - 8) / 24));

            if (alpha <= 0) {
              cp[i + 3] = 0;
              continue;
            }

            if (alpha < 1) {
              for (let c = 0; c < 3; c += 1) {
                const v = (cp[i + c] - paper[c] * (1 - alpha)) / alpha;
                cp[i + c] = Math.max(0, Math.min(255, Math.round(v)));
              }
            }

            cp[i + 3] = Math.round(alpha * 255);
          }
        }
      }

      /*
        The ink, turned light, for a dark page.

        Two colours are in this mark: a near-black charcoal and the brand teal.
        Only the charcoal changes, and "is this the charcoal" is answered by
        saturation rather than by brightness — the teal is bright *and*
        saturated, so a brightness rule would repaint the teal as well and the
        mark would come out all white.
      */
      if (cut.recolour === "inkToLight") {
        for (let i = 0; i < cp.length; i += 4) {
          if (cp[i + 3] === 0) continue;

          const r = cp[i];
          const g = cp[i + 1];
          const bl = cp[i + 2];

          /*
            How teal the pixel is, as one number.

            The first attempt asked "is it dark and unsaturated" and left the
            mark unchanged — because the charcoal in this drawing is a
            *gradient* that runs toward teal, so much of it is both lighter and
            more saturated than any fixed pair of thresholds allows.

            Green and blue against red separates the two cleanly and needs no
            thresholds on brightness at all: the brand teal scores about 193,
            the charcoal about 24, and every step of the gradient between them
            falls on the right side of 60.
          */
          const teal = (g + bl) / 2 - r;

          if (teal < 60) {
            cp[i] = 245;
            cp[i + 1] = 247;
            cp[i + 2] = 250;
          }
        }
      }

      const exact = document.createElement("canvas");
      exact.width = bw;
      exact.height = bh;
      exact.getContext("2d").putImageData(cropped, 0, 0);

      /*
        Written at a fixed width rather than at whatever the sheet happened to
        give. The sheet is one picture at one resolution, so these are as large
        as they can honestly be — and an icon that a browser will show at 32px
        is still written at 512 so it downsamples smoothly rather than being
        stretched.
      */
      let finalCanvas = exact;

      if (cut.width && cut.width !== bw) {
        const scaled = document.createElement("canvas");
        scaled.width = cut.width;
        scaled.height = Math.round((bh / bw) * cut.width);
        const sctx = scaled.getContext("2d");
        sctx.imageSmoothingEnabled = true;
        sctx.imageSmoothingQuality = "high";
        sctx.drawImage(exact, 0, 0, scaled.width, scaled.height);
        finalCanvas = scaled;
      }

      out.push({
        name: cut.name,
        what: cut.what,
        width: finalCanvas.width,
        height: finalCanvas.height,
        from: `${bw} × ${bh}`,
        png: finalCanvas.toDataURL("image/png"),
      });
    }

    return out;
  },
  { dataUrl, cuts: CUTS },
);

for (const result of results) {
  if (result.error) {
    console.log(`!  ${result.name}: ${result.error}`);
    continue;
  }

  writeFileSync(
    resolve(BRAND, `${result.name}.png`),
    Buffer.from(result.png.split(",")[1], "base64"),
  );
  console.log(
    `   ${(result.name + ".png").padEnd(22)} ${String(result.width).padStart(4)} × ${String(
      result.height,
    ).padEnd(4)}  (cut ${result.from})  ${result.what}`,
  );
}

/* A sheet to look at, because a cut-out is judged by eye and nothing else. */
const preview = await browser.newPage({ viewport: { width: 1240, height: 620 } });
const cells = results
  .filter((result) => !result.error)
  .map(
    (result) => `
    <div style="border:1px solid #ccd3da;background:#fff">
      <div style="background:#ffffff;padding:12px;height:74px;display:flex;align-items:center;justify-content:center">
        <img src="${result.png}" style="max-width:100%;max-height:58px">
      </div>
      <div style="background:#0B1F26;padding:12px;height:74px;display:flex;align-items:center;justify-content:center">
        <img src="${result.png}" style="max-width:100%;max-height:58px">
      </div>
      <div style="background:repeating-conic-gradient(#dfe5ea 0% 25%, #ffffff 0% 50%) 50%/14px 14px;padding:12px;height:74px;display:flex;align-items:center;justify-content:center">
        <img src="${result.png}" style="max-width:100%;max-height:58px">
      </div>
      <div style="padding:10px;display:flex;gap:10px;align-items:flex-end;justify-content:center;background:#fff;border-top:1px solid #eef1f4">
        <img src="${result.png}" style="height:16px"><img src="${result.png}" style="height:24px"><img src="${result.png}" style="height:32px">
      </div>
      <div style="padding:6px 8px 10px;font:11px system-ui;color:#334;text-align:center">
        ${result.name}<br><span style="color:#778">${result.width} × ${result.height}</span>
      </div>
    </div>`,
  )
  .join("");

await preview.setContent(
  `<body style="margin:0;padding:14px;background:#eef1f4;display:grid;grid-template-columns:repeat(4,1fr);gap:12px">${cells}</body>`,
);
await preview.waitForTimeout(500);

const shot =
  process.argv[2] ?? resolve(BRAND, "..", "..", "test-results", "brand", "cutouts.png");
await preview.screenshot({ path: shot, fullPage: true });

console.log(`\n   preview: ${shot}`);
console.log("   each row: on white · on the brand charcoal · on a chequerboard · at 16/24/32px");

await browser.close();
