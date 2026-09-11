/**
 * The letter's body, cleaned of everything it should not carry.
 *
 * ---------------------------------------------------------------------------
 * **Why this exists at all.** The owner asked for a rich editor and for the
 * body to be pasted in:
 *
 *   > beech ka bhi content bhi copy kar ya paste karenge and change karenge
 *   > rich editor ka use karna
 *
 * Pasting is the requirement, and pasting is the problem. What arrives on the
 * clipboard from Word is not prose — it is several kilobytes of `MsoNormal`
 * classes, `<o:p>` tags, inline `mso-` styles, conditional comments and a font
 * stack that will not exist on the page. Stored raw, it makes every letter look
 * like a different document and eventually breaks the print layout.
 *
 * And stored HTML is rendered back into a page. Even though only staff can
 * write here, a document from outside the company is untrusted input by
 * definition: nobody checks the source of a file before copying a paragraph
 * out of it.
 *
 * ---------------------------------------------------------------------------
 * **How it is safe, stated plainly.**
 *
 * Allowed tags are **re-emitted from scratch** rather than passed through. The
 * original attribute text is never copied, so there is no `onerror`, no
 * `onmouseover`, no `style` and no `srcset` to sneak through — not because each
 * one is filtered, but because nothing is kept that is not explicitly rebuilt.
 * The one attribute that survives is `href` on a link, and its scheme is
 * checked against a list of four.
 *
 * A tag that is not allowed loses its tag and keeps its text: a pasted
 * `<span class="MsoNormal">Dear Sir</span>` becomes `Dear Sir`. `<script>` and
 * `<style>` are the exception — those lose their contents too, because the
 * contents are the payload rather than the prose.
 *
 * ---------------------------------------------------------------------------
 * **Why not a library.** This project carries no HTML sanitiser, and adding
 * one for a staff-only editor is a dependency in every future audit and every
 * upgrade. What is needed here is small, it is exercised by the tests beside
 * this file, and it errs by deleting rather than by keeping.
 */

/**
 * What a letter may contain.
 *
 * Tables are in because letters have them — a schedule of fees, a list of
 * deliverables. Images are out: a letter that depends on an uploaded image
 * prints as a broken box the day that file moves, and a letterhead already
 * carries the only picture the page needs.
 */
const ALLOWED = new Set([
  "p",
  "br",
  "strong",
  "b",
  "em",
  "i",
  "u",
  "s",
  "ul",
  "ol",
  "li",
  "h2",
  "h3",
  "h4",
  "blockquote",
  "a",
  "hr",
  "table",
  "thead",
  "tbody",
  "tr",
  "th",
  "td",
]);

/** Tags whose contents go with them. */
const STRIP_WITH_CONTENTS = ["script", "style", "head", "title", "iframe", "object", "embed"];

/** Tags that carry no closing tag and must not be given one. */
const VOID_TAGS = new Set(["br", "hr"]);

/** The schemes a letter may link to. Anything else is dropped. */
const SAFE_SCHEMES = ["http:", "https:", "mailto:", "tel:"];

/** `colspan` and `rowspan` survive on a cell, as digits and nothing else. */
const CELL_SPANS = ["colspan", "rowspan"] as const;

function safeHref(raw: string): string | null {
  const value = raw.trim();
  if (value === "") return null;

  /* A bare fragment or a site-relative path is fine and has no scheme to
     check. Everything else has to parse and has to be one of the four. */
  if (value.startsWith("#") || value.startsWith("/")) return value;

  try {
    const url = new URL(value, "https://example.invalid");
    return SAFE_SCHEMES.includes(url.protocol) ? value : null;
  } catch {
    return null;
  }
}

/** One attribute's value, read out of a tag's raw attribute text. */
function attribute(raw: string, name: string): string | null {
  const match = new RegExp(`${name}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s>]+))`, "i").exec(raw);
  if (!match) return null;
  return match[2] ?? match[3] ?? match[4] ?? null;
}

/**
 * Clean HTML, ready to store and to print.
 *
 * Returns an empty string for a body that is empty once cleaned — including
 * the `<p><br></p>` that every contenteditable leaves behind when somebody
 * selects all and deletes. A letter whose body is "empty but not blank" would
 * otherwise print a mysterious gap and count as written.
 */
export function cleanLetterHtml(input: string): string {
  if (typeof input !== "string" || input.trim() === "") return "";

  let html = input;

  /* Word's conditional comments, which wrap whole blocks of markup. Removed
     first, because what is inside them is markup this would otherwise walk. */
  html = html.replace(/<!--[\s\S]*?-->/g, "");

  for (const tag of STRIP_WITH_CONTENTS) {
    /* The unclosed form as well: a truncated paste can end mid-tag, and a
       pattern that only matches a closed pair would leave the opening tag and
       everything after it. */
    html = html.replace(new RegExp(`<${tag}\\b[\\s\\S]*?<\\/${tag}\\s*>`, "gi"), "");
    html = html.replace(new RegExp(`<${tag}\\b[\\s\\S]*$`, "gi"), "");
  }

  /* Word writes `<o:p>` and `<w:sdt>`; namespaced tags are never allowed, and
     matching them by name would mean listing Microsoft's namespaces. */
  html = html.replace(/<\/?[a-z]+:[^>]*>/gi, "");

  /*
    How many `<a>` openings have been dropped and are still waiting for their
    closing tag.

    Found by the test: dropping the opening tag of a `javascript:` link left
    `Click</a>` behind, because `a` *is* an allowed tag and so its closing tag
    was re-emitted. A counter is enough — nested links are not legal HTML and
    no editor or word processor produces them.
  */
  let danglingLinks = 0;

  html = html.replace(/<(\/?)([a-zA-Z][a-zA-Z0-9]*)([^>]*)>/g, (_whole, slash, name, raw) => {
    const tag = String(name).toLowerCase();
    if (!ALLOWED.has(tag)) return "";

    if (slash === "/") {
      if (tag === "a" && danglingLinks > 0) {
        danglingLinks -= 1;
        return "";
      }
      return VOID_TAGS.has(tag) ? "" : `</${tag}>`;
    }

    if (tag === "a") {
      const href = safeHref(attribute(String(raw), "href") ?? "");
      /* A link with nowhere to go keeps its words and loses its underline,
         which is the honest outcome — the alternative is a link that looks
         live and is not. */
      if (!href) {
        danglingLinks += 1;
        return "";
      }
      /* `rel` and `target` are written here rather than carried over: a letter
         is printed as often as it is read, and a link in it should behave the
         same either way. */
      return `<a href="${escapeAttribute(href)}" rel="noopener noreferrer">`;
    }

    if (tag === "td" || tag === "th") {
      const spans = CELL_SPANS.map((name) => {
        const value = attribute(String(raw), name);
        /* Digits only, and capped: a `colspan` of 90,000 pasted out of a
           spreadsheet renders a table wider than the page and is not a layout
           anybody chose. */
        if (!value || !/^\d{1,2}$/.test(value.trim())) return "";
        return ` ${name}="${value.trim()}"`;
      }).join("");

      return `<${tag}${spans}>`;
    }

    if (VOID_TAGS.has(tag)) return `<${tag}>`;

    return `<${tag}>`;
  });

  /* An empty paragraph left by the editor, and the `&nbsp;` Word puts in one. */
  html = html.replace(/<p>(\s|&nbsp;|<br>)*<\/p>/gi, "");

  /* Runs of whitespace between block tags. Not inside text: a letter may
     deliberately space out a signature block. */
  html = html.replace(/>\s+</g, "><").trim();

  return stripsToNothing(html) ? "" : html;
}

/** Whether what is left is only tags — no words for a reader. */
function stripsToNothing(html: string): boolean {
  return html
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/gi, " ")
    .trim() === "";
}

function escapeAttribute(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * The body as plain text, for a list and for a word count.
 *
 * Block tags become line breaks rather than vanishing, so "Dear Sir" and the
 * paragraph under it do not run into one word.
 */
export function letterPlainText(html: string): string {
  return html
    .replace(/<\/(p|h2|h3|h4|li|tr|blockquote)>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Roughly how much of an A4 page the body fills, as a fraction.
 *
 * Not exact and does not pretend to be — it exists so the editor can say "this
 * will run onto a second page" before somebody prints twelve copies and finds
 * the signature alone on page two. Counted in lines rather than characters: a
 * letter is mostly short lines, and a heading or a list item occupies a line
 * whatever its length.
 */
export function estimateLines(html: string, charactersPerLine = 92): number {
  const blocks = letterPlainText(html).split("\n");

  return blocks.reduce(
    (total, block) => total + Math.max(1, Math.ceil(block.length / charactersPerLine)),
    0,
  );
}
