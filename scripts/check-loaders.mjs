/**
 * Does every screen in the estate say something while it loads?
 *
 * ---------------------------------------------------------------------------
 * **The owner's standing instruction.**
 *
 *   > jab bhi koi kaam ho tab loader laga do — har jagah, har step pe, har
 *   > click pe, har function pe … saare project me
 *
 * Two different waits, and they need two different things:
 *
 * **A navigation** — the router knows about it, and `loading.tsx` covers it.
 * One anywhere up a route's chain covers everything beneath, so what matters is
 * whether a route has one *somewhere above it*, not whether it has its own.
 * That distinction is why the first version of this reported thirty-four
 * missing loaders that were all perfectly well covered by their group.
 *
 * **A write** — the router knows nothing about it. A form posting, a row being
 * deleted. Those go through the busy overlay, which `check:copies` keeps in
 * step across the estate.
 *
 * This answers both. It walks every route in all nine projects and reports any
 * with nothing above it, because a click that sits on the old screen with no
 * feedback is the moment people click twice — and then it reads every form in
 * the estate and reports any that does not use the fact that it is submitting.
 */

import { readdirSync, statSync, existsSync, readFileSync } from "node:fs";
import { presentProjects } from "./estate.mjs";

/* Every project on this machine, whatever each folder happens to be called. */
const PROJECTS = presentProjects().map((project) => [project.name, project.dir.split("\\").join("/")]);

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const path = `${dir}/${name}`;
    if (statSync(path).isDirectory()) walk(path, out);
  }
  if (existsSync(`${dir}/page.tsx`)) out.push(dir);
  return out;
}

let uncovered = 0;

for (const [name, root] of PROJECTS) {
  const app = `${root}/src/app`;
  if (!existsSync(app)) continue;

  const routes = walk(app);

  /*
    A `loading.tsx` covers its own segment *and every route beneath it*, so a
    page with none of its own is still covered by its group's. What is worth
    finding is a route with no loader anywhere up the chain — those are the ones
    where a click sits on the old screen with nothing to show for it.
  */
  const covered = (dir) => {
    let at = dir;
    while (at.length >= app.length) {
      if (existsSync(`${at}/loading.tsx`)) return true;
      at = at.slice(0, at.lastIndexOf("/"));
    }
    return false;
  };

  const missing = routes.filter((dir) => !covered(dir));

  console.log(`\n${name}: ${routes.length - missing.length} of ${routes.length} routes have a loader`);
  for (const dir of missing) console.log("   " + dir.replace(app + "/", "").replace(app, "(root)"));

  uncovered += missing.length;
}

console.log("");

if (uncovered === 0) {
  console.log("  every screen in the estate says something while it loads");
} else {
  console.log(`  ${uncovered} screens show nothing while they load`);
}

/* ========================================================================== */
/*                        and every click, not only every screen              */
/* ========================================================================== */

/**
 * A form that ignores the fact that it is submitting.
 *
 * \`useActionState\` gives back three things, and the third is whether the action
 * is running. A component that destructures only the first two has thrown that
 * away, and the form it renders looks identical for the second or two it is
 * posting — which is exactly when somebody presses the button again.
 *
 * The pending flag is a value, so what counts as using it is broad on purpose:
 * a spinner, a disabled button, changed wording, or handing it to the busy
 * overlay. What is being looked for is a component that never mentions it at
 * all.
 */
function silentForms(root) {
  const found = [];
  const src = `${root}/src`;
  if (!existsSync(src)) return found;

  const files = [];

  (function collect(dir) {
    for (const name of readdirSync(dir)) {
      const path = `${dir}/${name}`;
      if (statSync(path).isDirectory()) collect(path);
      else if (name.endsWith(".tsx")) files.push(path);
    }
  })(src);

  for (const file of files) {
    const text = readFileSync(file, "utf8");

    for (const call of text.matchAll(/const \[([^\]]*)\] = useActionState\(/g)) {
      const parts = call[1].split(",").map((part) => part.trim());

      /* Two names means the pending flag was never taken. */
      if (parts.length < 3 || !parts[2]) {
        found.push([file, "does not take the pending flag"]);
        continue;
      }

      const flag = parts[2];

      /*
        Taken and then used. One mention is the destructuring itself, so a name
        that appears exactly once was named and forgotten.
      */
      const mentions = text.split(flag).length - 1;
      if (mentions < 2) found.push([file, `takes \`${flag}\` and never uses it`]);
    }
  }

  return found;
}

let silent = 0;

for (const [name, root] of PROJECTS) {
  const found = silentForms(root);
  if (found.length === 0) continue;

  console.log(`\n${name}: ${found.length} form${found.length === 1 ? "" : "s"} say nothing while saving`);
  for (const [file, why] of found) {
    console.log(`   ${file.replace(root + "/", "")} — ${why}`);
  }

  silent += found.length;
}

console.log("");

if (silent === 0) {
  console.log("  and every form in the estate says something while it saves");
} else {
  console.log(`  ${silent} forms give nothing back while they save`);
}

console.log("");

process.exitCode = uncovered === 0 && silent === 0 ? 0 : 1;
