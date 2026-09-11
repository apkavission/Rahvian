/**
 * The icons a browser and a phone ask for, written at the sizes they ask for.
 *
 * ---------------------------------------------------------------------------
 * **Why sizes at all, when the source is one 512px tile.** Next serves
 * `app/icon.png` and `app/apple-icon.png` exactly as they are on disk. A 512px
 * favicon is a 40KB request on every page for something drawn at 16px, and
 * `image-file.test.ts` asserts the apple icon is a 180 square because that is
 * the size iOS asks for — a different size there is a home-screen icon that
 * gets resampled by the phone instead of by us.
 *
 * **The tile, not the bare mark.** These two are the only brand files that keep
 * their background, and it is deliberate: a transparent favicon takes the
 * colour of whatever tab strip it lands in, and a transparent home-screen icon
 * takes the colour of the user's wallpaper. The designer drew a tile for
 * exactly this, and at 16px it still reads — which was checked by looking at
 * it, not assumed.
 */
import { chromium } from "@playwright/test";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "..");

const SOURCE = resolve(ROOT, "public/brand/icon-dark.png");

const TARGETS = [
  { to: "src/app/apple-icon.png", size: 180, why: "iOS home screen" },
  { to: "src/app/icon.png", size: 96, why: "the browser tab" },
  { to: "public/brand/icon-192.png", size: 192, why: "Android, and a web manifest" },
  /*
    And the `.ico`, which is not optional.

    `src/app/favicon.ico` outranks `icon.png` in Next's own ordering, so a
    stale one there is the old logo still showing in every tab however many
    PNGs are written beside it. It is also what a Windows shortcut, an RSS
    reader and a few crawlers still ask for by name.
  */
  { to: "src/app/favicon.ico", size: 32, why: "the .ico Next prefers over icon.png", ico: true },
];

/**
 * A 32px PNG wrapped in an ICO container.
 *
 * The format is a six-byte directory, one sixteen-byte entry, and then the
 * image — and since Vista that image may be a PNG rather than a bitmap. So
 * this is the PNG already rendered, with 22 bytes in front of it, which is why
 * it needs no encoder and no dependency.
 */
function wrapAsIco(png, size) {
  const header = Buffer.alloc(22);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(1, 4); // one image
  header.writeUInt8(size === 256 ? 0 : size, 6); // 0 means 256
  header.writeUInt8(size === 256 ? 0 : size, 7);
  header.writeUInt8(0, 8); // palette colours: none
  header.writeUInt8(0, 9); // reserved
  header.writeUInt16LE(1, 10); // colour planes
  header.writeUInt16LE(32, 12); // bits per pixel
  header.writeUInt32LE(png.length, 14);
  header.writeUInt32LE(22, 18); // where the image starts

  return Buffer.concat([header, png]);
}

const browser = await chromium.launch();
const page = await browser.newPage();

const source = `data:image/png;base64,${readFileSync(SOURCE).toString("base64")}`;

for (const target of TARGETS) {
  const png = await page.evaluate(
    async ({ source, size }) => {
      const image = new Image();
      image.src = source;
      await image.decode();

      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(image, 0, 0, size, size);

      return canvas.toDataURL("image/png");
    },
    { source, size: target.size },
  );

  const bytes = Buffer.from(png.split(",")[1], "base64");

  writeFileSync(
    resolve(ROOT, target.to),
    target.ico ? wrapAsIco(bytes, target.size) : bytes,
  );
  console.log(`   ${target.to.padEnd(28)} ${target.size} × ${target.size}   — ${target.why}`);
}

await browser.close();
