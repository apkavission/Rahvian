/**
 * The Website screen, ported from the clinic to the other five demos.
 *
 * ---------------------------------------------------------------------------
 * **Why a script.** The six demos are forks of one codebase: `globals.css`,
 * `theme.ts`, `page-editor.tsx`, `branding.ts` and `form-state.ts` are
 * byte-identical across all six, and the files this adds are new. Doing it by
 * hand five times is five chances to leave one demo behind — which is exactly
 * what `check:copies` exists to catch after the fact.
 *
 * **What differs per demo is declared below**, not discovered halfway through:
 * the port number, the schema, the reserved route names, the label on the main
 * button, and whether the demo reads any feature toggles at all. The clinic
 * reads two; four read one; the shop reads none, so it gets no screen section
 * for them — a field that writes a column nothing renders is the exact thing
 * this whole piece of work set out to remove.
 *
 * Run from `services`:  node scripts/port-website-screen.mjs [--dry-run]
 */
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { projectDir } from "./estate.mjs";

const DRY = process.argv.includes("--dry-run");
const HERE = dirname(fileURLToPath(import.meta.url));
const CLINIC = projectDir("demo-clinic");

if (!CLINIC) throw new Error("The clinic demo is not on this machine, and it is the source.");

/** Copied verbatim: these files are identical across the demos by design. */
const VERBATIM = [
  "src/app/globals.css",
  "src/lib/theme.ts",
  "src/lib/theme.test.ts",
  "src/lib/fonts.ts",
  "src/lib/contrast.ts",
  "src/lib/contrast.test.ts",
  "src/lib/theme-presets.ts",
  "src/lib/theme-presets.test.ts",
  "src/components/admin/website-editor.tsx",
  "src/app/admin/website/page.tsx",
  "src/app/admin/branding/page.tsx",
  "src/lib/actions/website.ts",
  "scripts/check-website.mjs",
];

/**
 * What each demo is.
 *
 * `bookingLabel` is the placeholder the Website screen shows, and it has to be
 * the demo's own default or the screen promises a label the site would not use.
 * `emergency` says whether the demo renders `features.showEmergency`; only the
 * clinic does, so only the clinic gets that tick box.
 */
const DEMOS = [
  {
    name: "demo-restaurant",
    schema: "demo_restaurant",
    port: 3400,
    bookingLabel: "Book a table",
    emergency: false,
  },
  {
    name: "demo-school",
    schema: "demo_school",
    port: 3500,
    bookingLabel: "Book a campus visit",
    emergency: false,
  },
  {
    name: "demo-realestate",
    schema: "demo_realestate",
    port: 3600,
    bookingLabel: "Book a viewing",
    emergency: false,
  },
  {
    name: "demo-crm",
    schema: "demo_crm",
    port: 3700,
    bookingLabel: "Start a trial",
    emergency: false,
  },
  {
    name: "demo-ecommerce",
    schema: "demo_shop",
    port: 3800,
    /* The shop reads no feature toggles, so it gets no section for them. */
    bookingLabel: null,
    emergency: false,
  },
];

/** The clinic's own values, which every copy has to have replaced. */
const CLINIC_SCHEMA = "demo_clinic";
const CLINIC_PORT = 3300;

function read(root, path) {
  return readFileSync(resolve(root, path), "utf8");
}

function write(root, path, contents) {
  const file = resolve(root, path);
  mkdirSync(dirname(file), { recursive: true });
  if (!DRY) writeFileSync(file, contents, "utf8");
}

/** Everything in a copied file that names the clinic. */
function localise(text, demo) {
  let out = text
    .split(CLINIC_SCHEMA)
    .join(demo.schema)
    .split(String(CLINIC_PORT))
    .join(String(demo.port))
    .split("demo-clinic")
    .join(demo.name);

  /* The booking label's placeholder and its hint. */
  if (demo.bookingLabel) {
    out = out
      .split('placeholder="Book an appointment"')
      .join(`placeholder="${demo.bookingLabel}"`)
      .split("Empty uses &ldquo;Book an appointment&rdquo;.")
      .join(`Empty uses &ldquo;${demo.bookingLabel}&rdquo;.`)
      .split('business.features.bookingLabel ?? "Book an appointment"')
      .join(`business.features.bookingLabel ?? "${demo.bookingLabel}"`);
  }

  return out;
}

/**
 * The clinic's emergency tick box, removed where nothing reads the column.
 *
 * Bounded by the labels either side of it rather than by a line count, so a
 * change to the editor above or below it does not make this cut the wrong
 * thing — and if the markers are not found, nothing is removed and the port
 * says so instead of quietly shipping a dead field.
 */
function stripEmergency(text) {
  const start = text.indexOf('      <label className="flex items-start gap-3 text-sm">\n        <input\n          type="checkbox"\n          name="show_emergency"');
  if (start === -1) return { text, removed: false };

  const end = text.indexOf("<SaveBar", start);
  if (end === -1) return { text, removed: false };

  return { text: text.slice(0, start) + text.slice(end), removed: true };
}

/** And the same field out of the action that validates it. */
function stripEmergencyAction(text) {
  let out = text
    .replace("  show_emergency: z.boolean(),\n", "")
    .replace("    show_emergency: formData.get(\"show_emergency\") === \"on\",\n", "")
    .replace("    showEmergency: d.show_emergency,\n", "");

  /* The features object would be left with a trailing spread and nothing
     after it, which is valid but reads as a mistake. */
  out = out.replace(
    "  const features = {\n    ...(d.booking_label ? { bookingLabel: d.booking_label } : {}),\n  };",
    "  const features = d.booking_label ? { bookingLabel: d.booking_label } : {};",
  );

  return out;
}

let copied = 0;
const notes = [];

for (const demo of DEMOS) {
  const root = projectDir(demo.name);

  if (!root) {
    notes.push(`${demo.name}: not on this machine`);
    continue;
  }

  let files = 0;

  for (const path of VERBATIM) {
    if (!existsSync(resolve(CLINIC, path))) {
      notes.push(`${demo.name}: ${path} is missing from the clinic`);
      continue;
    }

    let text = localise(read(CLINIC, path), demo);

    if (!demo.emergency) {
      if (path.endsWith("website-editor.tsx")) {
        const stripped = stripEmergency(text);
        if (!stripped.removed) notes.push(`${demo.name}: could not find the emergency field to remove`);
        text = stripped.text;
      }
      if (path.endsWith("actions/website.ts")) text = stripEmergencyAction(text);
    }

    write(root, path, text);
    files += 1;
    copied += 1;
  }

  /* `reserved-slugs.ts` is per-demo: it is the demo's own route folders. */
  const slugs = read(root, "src/lib/pages.ts").match(
    /export const RESERVED_SLUGS = (\[[^\]]*\]) as const;/,
  );

  if (slugs) {
    const source = read(CLINIC, "src/lib/reserved-slugs.ts").replace(
      /export const RESERVED_SLUGS = \[[\s\S]*?\] as const;/,
      `export const RESERVED_SLUGS = ${slugs[1]} as const;`,
    );
    write(root, "src/lib/reserved-slugs.ts", source);
    files += 1;
  } else if (existsSync(resolve(root, "src/lib/reserved-slugs.ts"))) {
    /* Already ported. */
  } else {
    notes.push(`${demo.name}: no RESERVED_SLUGS found in pages.ts`);
  }

  console.log(`   ${demo.name.padEnd(18)} ${files} files${DRY ? " (dry run)" : ""}`);
}

console.log(`\n   ${copied} files ${DRY ? "would be written" : "written"}`);

if (notes.length) {
  console.log("\n   worth looking at:");
  for (const note of notes) console.log(`     · ${note}`);
}

console.log("\n   still per-demo, by hand: layout.tsx fonts, admin/layout.tsx menu,");
console.log("   pages.ts re-export, page-editor.tsx import, package.json script");
