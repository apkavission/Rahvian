/**
 * The files this estate deliberately copies, and whether they still agree.
 *
 * ---------------------------------------------------------------------------
 * **Why copies exist at all.** No project here imports another's code. That is
 * the rule that lets any one of them be deployed, upgraded or broken on its own
 * — a change made in the company website for its own reasons must never alter
 * what the tracker sends. The cost is that a handful of files exist three
 * times, kept in step by hand.
 *
 * "By hand" is the part that fails. The email layout is the case that proves
 * it: the panel and the tracker were forked from an early version of it and
 * then left there, so for weeks the same company sent three emails from one
 * frame and two from a thinner one with no mobile rule in it at all. Nothing
 * reported that, because nothing was looking.
 *
 * ---------------------------------------------------------------------------
 * **Some differences are correct, and this knows which.**
 *
 * A copy may carry a note saying it is a copy. A copy may name a colour token
 * that only one project defines. Those are declared per file below and
 * normalised away; anything else is drift and is reported with the lines.
 *
 * A file missing from a project is not a failure — the tracker has no email
 * layout to keep in step until it sends email. It is reported so that absence
 * is a decision somebody sees rather than a gap nobody notices.
 */
import { existsSync, readFileSync } from "node:fs";
import { projectDir, presentProjects } from "./estate.mjs";

/**
 * What is copied, and what may legitimately differ.
 *
 * `from` is the project the file is copied *out of* — the one whose version
 * wins an argument. `allow` is applied to both sides before comparing.
 */
const COPIES = [
  {
    file: "src/lib/pagination.ts",
    from: "services",
    to: ["portal", "tracker"],
    allow: [
      {
        why: "the copies carry a notice saying they are copies",
        /*
          A plain block comment at the very top, and not a doc comment.

          `/**` is the file's own documentation and must match everywhere; `/*`
          is the notice. Without that distinction this stripped the *website's*
          thirty-line doc block and only the copy's eight-line notice, then
          reported a drift of twenty-two lines that did not exist.
        */
        strip: /^\s*\/\*(?!\*)[\s\S]*?\*\/\s*/,
      },
    ],
  },
  {
    file: "src/lib/email/layout.ts",
    from: "services",
    to: ["portal", "tracker"],
    allow: [],
  },
  {
    file: "src/components/ui/confirm-dialog.tsx",
    from: "services",
    to: ["portal", "tracker"],
    allow: [
      {
        why: "only the website defines a foreground token for the danger colour",
        replace: [/text-danger-fg/g, "text-white"],
      },
    ],
  },

  /*
    The six demos.

    These were written once and copied into all six, which is the estate's rule
    and also its standing hazard: a fix made in the clinic's panel while
    somebody is looking at the clinic does not reach the other five, and the
    next person to open the restaurant finds the bug that was fixed a week ago.

    The clinic is arbitrarily the one that wins an argument. What matters is
    that there *is* one, not which.
  */
  ...[
    "src/lib/admin-content.ts",
    "src/lib/actions/content.ts",
    "src/lib/actions/pages.ts",
    "src/components/admin/business-picker.tsx",
    "src/components/admin/content-editors.tsx",
    "src/components/admin/page-editor.tsx",
    "src/components/site/site-logo.tsx",
    "src/components/site/page-bands.tsx",
    "src/app/[variant]/[slug]/page.tsx",
    "src/app/admin/pages/page.tsx",

    /*
      `src/lib/pages.ts` is deliberately *not* here.

      It carries `RESERVED_SLUGS`, which is that demo's own route folders — the
      addresses a custom page must not be given because a file answers first.
      Six different lists is the point of it, so comparing them would report
      drift that is the feature working.
    */
  ].map((file) => ({
    file,
    from: "demo-clinic",
    to: ["demo-restaurant", "demo-school", "demo-realestate", "demo-crm", "demo-ecommerce"],
    allow: [],
  })),
];

/** Line endings and trailing whitespace are not drift. */
function normalise(text, allow) {
  let out = text.replace(/\r\n/g, "\n").replace(/[ \t]+$/gm, "").trimEnd();

  for (const rule of allow) {
    if (rule.strip) out = out.replace(rule.strip, "");
    if (rule.replace) out = out.replace(rule.replace[0], rule.replace[1]);
  }

  return out;
}

function read(project, file) {
  const root = projectDir(project);
  if (!root) return null;

  const path = `${root}/${file}`;
  return existsSync(path) ? readFileSync(path, "utf8") : null;
}

/* `presentProjects()` answers with `{ name, dir }`, not with names — a set of
   objects would match nothing and report a clean run over zero files, which is
   the worst possible answer from a check. */
const present = new Set(presentProjects().map((project) => project.name));

let drifted = 0;
let checked = 0;
const absent = [];

for (const copy of COPIES) {
  const source = read(copy.from, copy.file);

  if (source === null) {
    console.log(`  ?     ${copy.file} — not in ${copy.from}, which is where it comes from`);
    drifted += 1;
    continue;
  }

  const master = normalise(source, copy.allow);

  for (const project of copy.to) {
    if (!present.has(project)) continue;

    const other = read(project, copy.file);

    if (other === null) {
      absent.push(`${project} has no ${copy.file}`);
      continue;
    }

    checked += 1;

    if (normalise(other, copy.allow) === master) {
      console.log(`  ok    ${copy.file} — ${project}`);
      continue;
    }

    drifted += 1;
    console.log(`  DRIFT ${copy.file} — ${project}`);

    /* The first few differing lines, so the report is actionable without
       opening both files. */
    const a = master.split("\n");
    const b = normalise(other, copy.allow).split("\n");
    let shown = 0;

    for (let line = 0; line < Math.max(a.length, b.length) && shown < 4; line += 1) {
      if (a[line] === b[line]) continue;

      console.log(`          line ${line + 1}`);
      console.log(`            ${copy.from}: ${(a[line] ?? "(nothing)").trim().slice(0, 90)}`);
      console.log(`            ${project}: ${(b[line] ?? "(nothing)").trim().slice(0, 90)}`);
      shown += 1;
    }

    if (a.length !== b.length) {
      console.log(`          ${copy.from} has ${a.length} lines, ${project} has ${b.length}`);
    }
  }
}

console.log("");

for (const line of absent) console.log(`  (absent) ${line}`);

console.log(
  drifted === 0
    ? `\n  ${checked} copies, all in step\n`
    : `\n  ${drifted} of ${checked + drifted} have drifted\n`,
);

process.exitCode = drifted === 0 ? 0 : 1;
