/**
 * The four brand rows in `company.media`, pointed at the new files.
 *
 * ---------------------------------------------------------------------------
 * **Why the header broke, and why a script rather than the panel.**
 *
 * The site's header does not name a logo file. It reads
 * `site_settings.logo_light_id`, follows it to a `media` row, and renders that
 * row's `public_url`. Four of those rows pointed at `/brand/*.svg` — the old
 * mark — so the moment those files were replaced by PNGs, every page rendered
 * a broken image where the logo goes. Nothing in the code was wrong; the
 * database was describing files that no longer existed.
 *
 * It could be done in the panel, by uploading each file under Settings. This
 * exists because it is four rows, it has to be exactly right, and it should be
 * repeatable the day the designer sends vectors — at which point the same
 * script runs again with `.svg` in the table below.
 *
 * **Dimensions are read from the files themselves**, not typed. A `media` row
 * whose width says 1246 for a file that is 1400 wide is how a layout ends up
 * reserving the wrong space and the page shifts as the logo loads.
 */
import pg from "pg";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { loadConfig, dbClient } from "./estate.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const BRAND = resolve(HERE, "../public/brand");

/**
 * Which row gets which file.
 *
 * The **wide** lockups are what the header wants: a header is a strip, and the
 * primary lockup is nearly square — at a header's height its wordmark would be
 * too small to read. The primary stays in the repository for documents and for
 * anywhere with room for it.
 */
const ROWS = [
  { match: "logo-light.svg", file: "logo-wide-light.png", alt: "Rahvian — Your Vision. We Make It Happen." },
  { match: "logo-dark.svg", file: "logo-wide-dark.png", alt: "Rahvian — Your Vision. We Make It Happen." },
  { match: "symbol-light.svg", file: "symbol-light.png", alt: "Rahvian" },
  { match: "symbol-dark.svg", file: "symbol-dark.png", alt: "Rahvian" },
];

/** A PNG's own dimensions, straight out of its header. */
function pngSize(file) {
  const bytes = readFileSync(resolve(BRAND, file));

  if (bytes.subarray(1, 4).toString() !== "PNG") {
    throw new Error(`${file} is not a PNG`);
  }

  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
}

const client = dbClient(pg, loadConfig());
await client.connect();

try {
  for (const row of ROWS) {
    const { width, height } = pngSize(row.file);

    const { rowCount } = await client.query(
      `update company.media
          set filename = $1,
              public_url = $2,
              alt_text = $3,
              width = $4,
              height = $5,
              mime_type = 'image/png'
        where filename = $6`,
      [row.file, `/brand/${row.file}`, row.alt, width, height, row.match],
    );

    console.log(
      rowCount
        ? `   ${row.match.padEnd(20)} -> ${row.file}  ${width} × ${height}`
        : `!  ${row.match.padEnd(20)} no row with that filename`,
    );
  }

  const { rows } = await client.query(
    `select m.filename, m.public_url, m.width, m.height
       from company.site_settings s
       join company.media m on m.id in (s.logo_light_id, s.logo_dark_id)
      where s.id = 1`,
  );

  console.log("\n   the header now reads:");
  for (const row of rows) {
    console.log(`     ${row.public_url}  ${row.width} × ${row.height}`);
  }
} finally {
  await client.end();
}
