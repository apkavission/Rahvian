/**
 * The horizontal lockup, composed rather than cropped.
 *
 * ---------------------------------------------------------------------------
 * **Why this is not another crop.** The sheet does carry a horizontal lockup
 * on a light background — and the panel's own caption, "HORIZONTAL LAYOUT
 * (LIGHT BG)", sits inside the same rectangle as the artwork's right-hand end.
 * Cropping it either clips the last letters of the wordmark or takes the
 * caption with it. The two clean copies elsewhere on the sheet — in the email
 * signature and the social banner — are about 210px wide, and an email logo
 * needs 800.
 *
 * So the mark is the designer's, cut out at full resolution, and the wordmark
 * is **set in the typeface the sheet names** — Montserrat for the name, Poppins
 * for the tagline. That is not a compromise: type set live is sharper at every
 * size than type resampled from a screenshot of type, and it is the same two
 * faces the site itself now loads.
 *
 * ---------------------------------------------------------------------------
 * **Written at 2× and scaled down**, because a logo in an email is looked at
 * on a phone with a 3× screen, and a 1× raster there is visibly soft.
 */
import { chromium } from "@playwright/test";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const BRAND = resolve(HERE, "../public/brand");

const VARIANTS = [
  {
    name: "logo-wide-light",
    symbol: "symbol-light.png",
    ink: "#0B1F26",
    quiet: "#3f5560",
    rule: "#00D1B2",
    width: 1200,
  },
  {
    name: "logo-email",
    symbol: "symbol-light.png",
    ink: "#0B1F26",
    quiet: "#3f5560",
    rule: "#00D1B2",
    width: 800,
  },
  {
    name: "logo-wide-dark",
    symbol: "symbol-dark.png",
    ink: "#F5F7FA",
    quiet: "#9fb4bd",
    rule: "#00D1B2",
    width: 1200,
  },
];

const browser = await chromium.launch();

for (const variant of VARIANTS) {
  const symbol = `data:image/png;base64,${readFileSync(
    resolve(BRAND, variant.symbol),
  ).toString("base64")}`;

  /* 2× the target, then scaled down on export. */
  const scale = 2;
  const page = await browser.newPage({
    viewport: { width: variant.width * scale, height: Math.round(variant.width * scale * 0.2) },
    deviceScaleFactor: 1,
  });

  await page.setContent(`
    <head>
      <link rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Montserrat:wght@800&family=Poppins:wght@500&display=swap">
    </head>
    <body style="margin:0">
      <div id="lockup" style="
        display:inline-flex; align-items:center; gap:${18 * scale}px;
        padding:${10 * scale}px ${4 * scale}px;
      ">
        <img src="${symbol}" style="height:${58 * scale}px;width:auto;display:block">

        <!-- The divider the sheet's own horizontal lockup uses. -->
        <span style="
          width:${2 * scale}px; height:${52 * scale}px;
          background:${variant.rule}; opacity:.55; border-radius:${scale}px;
        "></span>

        <span>
          <span style="
            display:block;
            font:800 ${40 * scale}px/1 Montserrat, system-ui, sans-serif;
            letter-spacing:${2.6 * scale}px;
            color:${variant.ink};
          ">RAHVIAN</span>
          <span style="
            display:block; margin-top:${6 * scale}px;
            font:500 ${12.5 * scale}px/1 Poppins, system-ui, sans-serif;
            letter-spacing:${0.5 * scale}px;
            color:${variant.quiet};
          ">Your Vision. We Make It Happen.</span>
        </span>
      </div>
    </body>
  `);

  /* The fonts have to have arrived, or the wordmark is written in the
     fallback face and the file is quietly wrong. */
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(300);

  const shot = await page.locator("#lockup").screenshot({ omitBackground: true });

  /* Scaled to the target width on the way out. */
  const final = await page.evaluate(
    async ({ data, width }) => {
      const image = new Image();
      image.src = `data:image/png;base64,${data}`;
      await image.decode();

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = Math.round((image.naturalHeight / image.naturalWidth) * width);
      const ctx = canvas.getContext("2d");
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

      return { png: canvas.toDataURL("image/png"), w: canvas.width, h: canvas.height };
    },
    { data: shot.toString("base64"), width: variant.width },
  );

  writeFileSync(
    resolve(BRAND, `${variant.name}.png`),
    Buffer.from(final.png.split(",")[1], "base64"),
  );
  console.log(`   ${(variant.name + ".png").padEnd(22)} ${final.w} × ${final.h}`);

  await page.close();
}

/* Something to look at. */
const preview = await browser.newPage({ viewport: { width: 1000, height: 420 } });
const cell = (name, bg) => {
  const png = readFileSync(resolve(BRAND, `${name}.png`)).toString("base64");
  return `<div style="background:${bg};padding:18px;border:1px solid #ccd3da">
    <img src="data:image/png;base64,${png}" style="width:100%;max-width:420px;display:block">
    <div style="margin-top:10px;font:11px system-ui;color:${bg === "#0B1F26" ? "#9fb" : "#556"}">${name}</div>
  </div>`;
};

await preview.setContent(`<body style="margin:0;padding:16px;background:#eef1f4;display:grid;gap:12px">
  ${cell("logo-wide-light", "#ffffff")}
  ${cell("logo-email", "#F5F7FA")}
  ${cell("logo-wide-dark", "#0B1F26")}
</body>`);
await preview.waitForTimeout(400);

const shot = process.argv[2] ?? resolve(BRAND, "..", "..", "test-results", "brand", "lockups.png");
await preview.screenshot({ path: shot, fullPage: true });
console.log(`\n   preview: ${shot}`);

await browser.close();
