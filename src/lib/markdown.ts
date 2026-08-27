/**
 * A small markdown parser for post bodies.
 *
 * It returns a tree of typed nodes rather than a string of HTML, and the
 * renderer turns those nodes into React elements. That is the whole point:
 * `blog_posts.content` is admin-editable text, and the moment it becomes HTML
 * injected into the page, one paste of a copied article can execute script or
 * break the layout for every reader. Here the worst a malformed document can
 * do is render as plain text.
 *
 * The supported subset is what a post on this site actually needs: headings,
 * paragraphs, lists, code, quotes, rules, images, and inline emphasis, code
 * and links. Raw HTML is not supported and is escaped by React as text —
 * deliberately, and for the same reason.
 */

export type InlineNode =
  | { type: "text"; value: string }
  | { type: "strong"; children: InlineNode[] }
  | { type: "em"; children: InlineNode[] }
  | { type: "code"; value: string }
  | { type: "link"; href: string; children: InlineNode[] };

export type Block =
  | { type: "heading"; level: 2 | 3 | 4; children: InlineNode[] }
  | { type: "paragraph"; children: InlineNode[] }
  | { type: "list"; ordered: boolean; items: InlineNode[][] }
  | { type: "code"; language: string | null; value: string }
  | { type: "quote"; children: InlineNode[] }
  | { type: "image"; src: string; alt: string }
  | { type: "rule" };

/** Parse a markdown document into blocks. */
export function parseMarkdown(source: string): Block[] {
  const lines = source.replace(/\r\n?/g, "\n").split("\n");
  const blocks: Block[] = [];

  let index = 0;

  while (index < lines.length) {
    const line = lines[index];

    if (line.trim() === "") {
      index += 1;
      continue;
    }

    // Fenced code. Everything up to the closing fence is taken verbatim,
    // including blank lines and characters that would otherwise be markup.
    const fence = /^```\s*([a-zA-Z0-9+#-]*)\s*$/.exec(line);
    if (fence) {
      const language = fence[1] || null;
      const body: string[] = [];
      index += 1;

      while (index < lines.length && !/^```\s*$/.test(lines[index])) {
        body.push(lines[index]);
        index += 1;
      }
      // Skip the closing fence when there is one. An unclosed fence simply
      // runs to the end of the document rather than throwing.
      index += 1;

      blocks.push({ type: "code", language, value: body.join("\n") });
      continue;
    }

    if (/^(?:---|\*\*\*|___)\s*$/.test(line)) {
      blocks.push({ type: "rule" });
      index += 1;
      continue;
    }

    const heading = /^(#{2,4})\s+(.*)$/.exec(line);
    if (heading) {
      blocks.push({
        type: "heading",
        level: heading[1].length as 2 | 3 | 4,
        children: parseInline(heading[2].trim()),
      });
      index += 1;
      continue;
    }

    // A standalone image, which is how a figure inside a post is written.
    const image = /^!\[([^\]]*)\]\(([^)\s]+)\)\s*$/.exec(line);
    if (image && isSafeHref(image[2])) {
      blocks.push({ type: "image", alt: image[1], src: image[2] });
      index += 1;
      continue;
    }

    if (/^>\s?/.test(line)) {
      const body: string[] = [];
      while (index < lines.length && /^>\s?/.test(lines[index])) {
        body.push(lines[index].replace(/^>\s?/, ""));
        index += 1;
      }
      blocks.push({ type: "quote", children: parseInline(body.join(" ").trim()) });
      continue;
    }

    const bullet = /^\s*[-*+]\s+/;
    const numbered = /^\s*\d+[.)]\s+/;

    if (bullet.test(line) || numbered.test(line)) {
      const ordered = numbered.test(line);
      const marker = ordered ? numbered : bullet;
      const items: InlineNode[][] = [];

      while (index < lines.length && marker.test(lines[index])) {
        items.push(parseInline(lines[index].replace(marker, "").trim()));
        index += 1;
      }

      blocks.push({ type: "list", ordered, items });
      continue;
    }

    // Paragraph: everything up to the next blank line or block opener.
    const paragraph: string[] = [];
    while (
      index < lines.length &&
      lines[index].trim() !== "" &&
      !/^(?:#{2,4}\s|>|```|---|\*\*\*|___)/.test(lines[index]) &&
      !bullet.test(lines[index]) &&
      !numbered.test(lines[index])
    ) {
      paragraph.push(lines[index].trim());
      index += 1;
    }

    if (paragraph.length > 0) {
      blocks.push({ type: "paragraph", children: parseInline(paragraph.join(" ")) });
    }
  }

  return blocks;
}

/**
 * Inline emphasis, code and links.
 *
 * Code is matched first and never recursed into, so backticks around an
 * asterisk keep the asterisk.
 */
export function parseInline(source: string): InlineNode[] {
  const nodes: InlineNode[] = [];
  const pattern =
    /(`[^`]+`)|(\*\*[^*]+\*\*)|(__[^_]+__)|(\*[^*]+\*)|(_[^_]+_)|(\[[^\]]+\]\([^)\s]+\))/;

  let rest = source;

  while (rest.length > 0) {
    const match = pattern.exec(rest);

    if (!match || match.index === undefined) {
      nodes.push({ type: "text", value: rest });
      break;
    }

    if (match.index > 0) {
      nodes.push({ type: "text", value: rest.slice(0, match.index) });
    }

    const token = match[0];

    if (token.startsWith("`")) {
      nodes.push({ type: "code", value: token.slice(1, -1) });
    } else if (token.startsWith("**") || token.startsWith("__")) {
      nodes.push({ type: "strong", children: parseInline(token.slice(2, -2)) });
    } else if (token.startsWith("[")) {
      const link = /^\[([^\]]+)\]\(([^)\s]+)\)$/.exec(token);
      // A link whose target we will not follow renders as its own text: the
      // sentence still reads, and nothing unsafe reaches an href.
      if (link && isSafeHref(link[2])) {
        nodes.push({ type: "link", href: link[2], children: parseInline(link[1]) });
      } else {
        nodes.push({ type: "text", value: token });
      }
    } else {
      nodes.push({ type: "em", children: parseInline(token.slice(1, -1)) });
    }

    rest = rest.slice(match.index + token.length);
  }

  return nodes;
}

/**
 * Which link targets are allowed through.
 *
 * An allow-list rather than a `javascript:` block-list: schemes are extensible
 * and a block-list is a list of the ones someone thought of.
 */
export function isSafeHref(href: string): boolean {
  return /^(?:https?:\/\/|mailto:|tel:|\/(?!\/)|#)/i.test(href.trim());
}

/**
 * Headings and their anchors, for a table of contents.
 *
 * Derived from the same parse the body renders, so the contents list can never
 * name a heading the article does not have.
 */
export function collectHeadings(
  blocks: Block[],
): { id: string; text: string; level: 2 | 3 | 4 }[] {
  return blocks
    .filter((block): block is Extract<Block, { type: "heading" }> => block.type === "heading")
    .map((block) => {
      const text = inlineText(block.children);
      return { id: headingId(text), text, level: block.level };
    });
}

/** The plain text of an inline tree, for anchors and reading estimates. */
export function inlineText(nodes: InlineNode[]): string {
  return nodes
    .map((node) => {
      if (node.type === "text" || node.type === "code") return node.value;
      return inlineText(node.children);
    })
    .join("");
}

export function headingId(text: string): string {
  return (
    text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "section"
  );
}
