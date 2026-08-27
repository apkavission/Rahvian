import Link from "next/link";
import type { Block, InlineNode } from "@/lib/markdown";
import { headingId, inlineText, parseMarkdown } from "@/lib/markdown";

/**
 * A post body, rendered from markdown as React elements.
 *
 * Nothing here goes through `dangerouslySetInnerHTML`. The parser produces
 * typed nodes and this component maps them to elements, so text from the
 * database is escaped by React on the way out — a pasted `<script>` renders as
 * the characters a reader sees, which is the only acceptable behaviour for
 * content an admin can write.
 *
 * Typography is set per element rather than through a prose plugin, so the
 * article matches the rest of the site instead of a framework default.
 */
export function PostBody({ markdown }: { markdown: string }) {
  const blocks = parseMarkdown(markdown);

  return (
    <div className="measure">
      {blocks.map((block, index) => (
        <BlockView key={index} block={block} />
      ))}
    </div>
  );
}

function BlockView({ block }: { block: Block }) {
  switch (block.type) {
    case "heading": {
      const id = headingId(inlineText(block.children));
      const className = "scroll-mt-28 font-display font-semibold";

      if (block.level === 2) {
        return (
          <h2 id={id} className={`${className} mt-14 text-2xl first:mt-0`}>
            <Inline nodes={block.children} />
          </h2>
        );
      }
      if (block.level === 3) {
        return (
          <h3 id={id} className={`${className} mt-10 text-xl`}>
            <Inline nodes={block.children} />
          </h3>
        );
      }
      return (
        <h4 id={id} className={`${className} mt-8 text-lg`}>
          <Inline nodes={block.children} />
        </h4>
      );
    }

    case "paragraph":
      return (
        <p className="mt-5 leading-relaxed text-text-muted first:mt-0">
          <Inline nodes={block.children} />
        </p>
      );

    case "list":
      return block.ordered ? (
        <ol className="mt-5 space-y-3">
          {block.items.map((item, index) => (
            <li key={index} className="flex gap-3 leading-relaxed text-text-muted">
              <span className="mt-0.5 font-mono text-sm text-text-subtle">
                {String(index + 1).padStart(2, "0")}
              </span>
              <span>
                <Inline nodes={item} />
              </span>
            </li>
          ))}
        </ol>
      ) : (
        <ul className="mt-5 space-y-3">
          {block.items.map((item, index) => (
            <li key={index} className="flex gap-3 leading-relaxed text-text-muted">
              <span className="mt-2.5 size-1.5 shrink-0 rounded-full bg-accent" aria-hidden />
              <span>
                <Inline nodes={item} />
              </span>
            </li>
          ))}
        </ul>
      );

    case "code":
      return (
        <pre className="mt-6 overflow-x-auto rounded-xl border border-border bg-surface-2 p-5 text-sm leading-relaxed">
          <code>{block.value}</code>
        </pre>
      );

    case "quote":
      return (
        <blockquote className="mt-6 border-l-2 border-accent pl-6 text-lg leading-relaxed italic text-text">
          <Inline nodes={block.children} />
        </blockquote>
      );

    case "image":
      return (
        /* eslint-disable-next-line @next/next/no-img-element -- post images are
           written into the body by URL; intrinsic size is not known here. */
        <img
          src={block.src}
          alt={block.alt}
          loading="lazy"
          className="mt-8 w-full rounded-xl border border-border"
        />
      );

    case "rule":
      return <hr className="mt-10 border-border" />;
  }
}

function Inline({ nodes }: { nodes: InlineNode[] }) {
  return (
    <>
      {nodes.map((node, index) => {
        switch (node.type) {
          case "text":
            return node.value;

          case "strong":
            return (
              <strong key={index} className="font-semibold text-text">
                <Inline nodes={node.children} />
              </strong>
            );

          case "em":
            return (
              <em key={index}>
                <Inline nodes={node.children} />
              </em>
            );

          case "code":
            return (
              <code
                key={index}
                className="rounded bg-surface-2 px-1.5 py-0.5 font-mono text-[0.9em]"
              >
                {node.value}
              </code>
            );

          case "link": {
            // Internal links route through the client-side router; external
            // ones open in a new tab and drop the referrer.
            const external = /^https?:\/\//i.test(node.href);
            const className =
              "text-accent underline underline-offset-4 transition-colors hover:text-accent-hover";

            return external ? (
              <a
                key={index}
                href={node.href}
                target="_blank"
                rel="noopener noreferrer"
                className={className}
              >
                <Inline nodes={node.children} />
              </a>
            ) : (
              <Link key={index} href={node.href} className={className}>
                <Inline nodes={node.children} />
              </Link>
            );
          }
        }
      })}
    </>
  );
}
