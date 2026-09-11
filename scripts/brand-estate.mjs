/**
 * The new identity, copied to the other eight applications.
 *
 * ---------------------------------------------------------------------------
 * **Why a script and not eight copy-and-pastes.** The estate is nine separate
 * repositories on purpose — no project imports another's code, so any one of
 * them can be deployed or broken alone. The cost of that rule is that a
 * handful of files exist nine times, and `check:copies` exists because "kept
 * in step by hand" is the part that fails.
 *
 * The brand files are exactly that kind of file, and there are five of them
 * per project plus four icons. Nine by nine is where a hand does it wrong.
 *
 * **What it copies, and what it does not.** The mark and the icons, which are
 * the company's own, go everywhere. It does not touch a demo's *palette*: the
 * six demos are invented client businesses and their colours come from their
 * own database rows. What is ours in a demo is the panel and the loader, and
 * both of those read these files.
 *
 * **It removes the old files as it goes.** A leftover `symbol-light.svg` is
 * not harmless: it is the old company's mark, still being served, still in a
 * loader, on a page somebody will open.
 */
import { copyFileSync, existsSync, rmSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { presentProjects } from "./estate.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const SOURCE = resolve(HERE, "..");
const BRAND = resolve(SOURCE, "public/brand");

/** Everything that travels, and where it lands. */
const FILES = [
  { from: "public/brand/symbol-light.png", to: "public/brand/symbol-light.png" },
  { from: "public/brand/symbol-dark.png", to: "public/brand/symbol-dark.png" },
  { from: "public/brand/logo-wide-light.png", to: "public/brand/logo-wide-light.png" },
  { from: "public/brand/logo-wide-dark.png", to: "public/brand/logo-wide-dark.png" },
  { from: "public/brand/logo-email.png", to: "public/brand/logo-email.png" },
  { from: "src/app/favicon.ico", to: "src/app/favicon.ico" },
  { from: "src/app/icon.png", to: "src/app/icon.png" },
  { from: "src/app/apple-icon.png", to: "src/app/apple-icon.png" },
];

/** The old company's mark, deleted rather than left to be served. */
const STALE = [
  "public/brand/symbol-light.svg",
  "public/brand/symbol-dark.svg",
  "public/brand/logo-light.svg",
  "public/brand/logo-dark.svg",
  "src/app/icon.svg",
];

/** Every project but this one. `presentProjects()` gives `{ name, dir }`. */
const TARGETS = presentProjects().filter((project) => project.name !== "services");

let copied = 0;
let removed = 0;

for (const { name, dir: root } of TARGETS) {
  if (!root) continue;

  const done = [];

  for (const file of FILES) {
    const from = resolve(SOURCE, file.from);
    const to = resolve(root, file.to);

    if (!existsSync(from)) {
      console.log(`!  ${name}: ${file.from} is missing from services`);
      continue;
    }

    /* Only where the project already had a file of that kind. A demo has no
       `logo-wide-*`, and giving it one would put a file in a repository that
       nothing there reads. */
    const wanted =
      file.to.startsWith("src/app/") ||
      file.to.includes("symbol-") ||
      existsSync(to) ||
      existsSync(to.replace(/\.png$/, ".svg")) ||
      existsSync(resolve(root, "public/brand/logo-email.png"));

    if (!wanted) continue;

    copyFileSync(from, to);
    done.push(file.to.split("/").pop());
    copied += 1;
  }

  const gone = [];
  for (const stale of STALE) {
    const path = resolve(root, stale);
    if (!existsSync(path)) continue;
    rmSync(path);
    gone.push(stale.split("/").pop());
    removed += 1;
  }

  console.log(`   ${name.padEnd(16)} +${done.length} files   -${gone.length} old`);
  if (gone.length) console.log(`     removed: ${gone.join(", ")}`);
}

console.log(`\n   ${copied} files copied, ${removed} old files removed, across ${TARGETS.length} projects`);
console.log("   next: every reference to a `.svg` mark has to point at the `.png`");

/* A note beside the files, so the next person knows where they came from. */
writeFileSync(
  resolve(BRAND, "README.md"),
  `# Brand files

Cut out of \`rahvian-sheet-1.png\` — the identity sheet the designer sent as a
single 1254 × 1254 raster — by \`scripts/extract-brand.mjs\`, and composed into
the horizontal lockups by \`scripts/compose-lockup.mjs\`. The icons come from
\`scripts/brand-icons.mjs\`, and \`scripts/brand-estate.mjs\` copies all of it to
the other eight applications.

| File | What it is |
|---|---|
| \`symbol-light.png\` | The mark, dark ink. Light pages. |
| \`symbol-dark.png\` | The mark, light ink. Dark pages. Recoloured from the same drawing, not cropped from the smaller white one. |
| \`logo-light.png\` | The primary lockup — mark over wordmark over tagline. |
| \`logo-dark.png\` | The horizontal lockup in white, as drawn on the sheet. |
| \`logo-wide-light.png\` / \`logo-wide-dark.png\` | The horizontal lockup, **composed**: the designer's mark plus the wordmark set live in Montserrat. The sheet's own light horizontal panel has its caption inside the artwork's rectangle, so it cannot be cropped cleanly. |
| \`logo-email.png\` | The same, at 800px, for email and share cards. |
| \`icon-dark.png\` / \`icon-light.png\` | The app icon on its tile, as drawn. The tile is kept: a transparent icon takes the colour of whatever launcher it lands in. |
| \`icon-192.png\` | Android, and a web manifest. |

## These are rasters, and that is temporary

The identity arrived as a picture of itself. **When the designer sends vectors**,
replace \`symbol-*\` and \`logo-*\` with SVGs, re-run \`brand-icons.mjs\` and
\`brand-estate.mjs\`, and update \`src/lib/media/image-file.test.ts\` — which
asserts the format of these four files and will go red until it is told.

What to ask for: SVG with the wordmark converted to outlines, flat (no
gradient, no 3D, no glow), two colours, a mark-only square version, a
one-colour black version, and a screenshot at 16px.

## The colours, measured

\`#00D1B2\` is the brand teal and is **not** a text or button colour: white on it
measures 1.95:1, which cannot be read. It lives in \`--brand\`. The darker
\`#0C6F6E\` carries white at 5.98:1 and lives in \`--accent\`. Two tokens, so the
distinction cannot be lost by somebody reaching for "the brand colour".

Ink \`#0B1F26\`, page \`#F5F7FA\`, light teal \`#7EE7D6\`. Typography: Montserrat for
headings, Poppins for everything else.
`,
  "utf-8",
);

console.log("   wrote public/brand/README.md");
