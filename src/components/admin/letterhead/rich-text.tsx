"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { cleanLetterHtml } from "@/lib/letter-html";
import { cn } from "@/lib/utils";

/**
 * The letter's body, written and pasted.
 *
 * ---------------------------------------------------------------------------
 * **`contentEditable` and `document.execCommand`, and why that is the right
 * call here rather than a shortcut.**
 *
 * `execCommand` is marked deprecated. It is also implemented by every browser
 * in use, it is what the deprecation notice has said for a decade, and there is
 * no replacement standard — the alternative is not a newer API, it is a
 * rewrite of text editing on top of `Range` and `Selection`, or a dependency
 * the size of the rest of this application.
 *
 * What the owner asked for is a letter body that can be typed, pasted into and
 * changed. That is nine commands. Taking on ProseMirror for nine commands
 * would put a package with its own release cycle between this company and its
 * own letterhead.
 *
 * **The deprecation is handled rather than ignored**: every command goes
 * through `run()`, so the day a browser drops one, one function changes.
 *
 * ---------------------------------------------------------------------------
 * **Paste is intercepted, always.** This is the whole reason the editor is not
 * a plain `<textarea>`, and the reason it cannot just let the browser insert
 * what is on the clipboard. What arrives from Word is kilobytes of `MsoNormal`
 * classes and `mso-` styles that would make every letter look like a different
 * document. It is cleaned by the same function that guards the database, so
 * what is on screen is what will be stored — not something that looks fine and
 * changes on save.
 */

export interface RichTextProps {
  /** Submitted with the form under this name. */
  name: string;
  initialHtml: string;
  ariaLabel: string;
  onChangeHtml?: (html: string) => void;
}

interface ToolbarButton {
  label: string;
  title: string;
  command: string;
  value?: string;
  /** Shown as the label when the icon would be a single letter. */
  weight?: string;
  italic?: boolean;
  underline?: boolean;
}

const BUTTONS: readonly (ToolbarButton | "divider")[] = [
  { label: "B", title: "Bold  (Ctrl+B)", command: "bold", weight: "700" },
  { label: "I", title: "Italic  (Ctrl+I)", command: "italic", italic: true },
  { label: "U", title: "Underline  (Ctrl+U)", command: "underline", underline: true },
  "divider",
  { label: "H2", title: "Heading", command: "formatBlock", value: "h2" },
  { label: "H3", title: "Smaller heading", command: "formatBlock", value: "h3" },
  { label: "¶", title: "Plain paragraph", command: "formatBlock", value: "p" },
  "divider",
  { label: "• List", title: "Bulleted list", command: "insertUnorderedList" },
  { label: "1. List", title: "Numbered list", command: "insertOrderedList" },
  { label: "❝", title: "Quote", command: "formatBlock", value: "blockquote" },
  "divider",
  { label: "—", title: "Horizontal rule", command: "insertHorizontalRule" },
];

export function RichText({ name, initialHtml, ariaLabel, onChangeHtml }: RichTextProps) {
  const editor = useRef<HTMLDivElement>(null);
  const [html, setHtml] = useState(initialHtml);

  /*
    The initial HTML is written once, imperatively, and never as a prop.

    A controlled `contentEditable` fights the browser: React re-renders on
    every keystroke, replaces the DOM the caret lives in, and the caret jumps
    to the start of the box. Setting it once and reading it afterwards is how
    this has to work.
  */
  useEffect(() => {
    if (!editor.current) return;
    if (editor.current.innerHTML.trim() === "") editor.current.innerHTML = initialHtml;
  }, [initialHtml]);

  const sync = useCallback(() => {
    const value = editor.current?.innerHTML ?? "";
    setHtml(value);
    onChangeHtml?.(value);
  }, [onChangeHtml]);

  /** Every command in one place, so a deprecation is one change. */
  const run = useCallback(
    (command: string, value?: string) => {
      editor.current?.focus();
      try {
        document.execCommand(command, false, value);
      } catch {
        /* A browser that has dropped the command. The letter is still
           typable, which is the part that must not break. */
      }
      sync();
    },
    [sync],
  );

  const onPaste = useCallback(
    (event: React.ClipboardEvent<HTMLDivElement>) => {
      event.preventDefault();

      const clipboard = event.clipboardData;
      const asHtml = clipboard.getData("text/html");
      const asText = clipboard.getData("text/plain");

      if (asHtml) {
        /* Cleaned with the same function that guards the column, so what
           appears now is exactly what will be stored. */
        run("insertHTML", cleanLetterHtml(asHtml));
        return;
      }

      /*
        Plain text, with its line breaks kept.

        `insertText` collapses a blank line, so a pasted letter arrives as one
        paragraph — which is the commonest complaint about pasting into a
        rich editor. Split and rebuilt as paragraphs instead.
      */
      const paragraphs = asText
        .split(/\n{2,}/)
        .map((block) => block.trim())
        .filter(Boolean)
        .map((block) => `<p>${escapeText(block).replace(/\n/g, "<br>")}</p>`)
        .join("");

      run("insertHTML", paragraphs || "<p></p>");
    },
    [run],
  );

  const empty = cleanLetterHtml(html) === "";

  return (
    <div className="rounded-lg border border-border bg-surface">
      <div
        role="toolbar"
        aria-label="Formatting"
        className="flex flex-wrap items-center gap-1 border-b border-border px-2 py-1.5"
      >
        {BUTTONS.map((button, index) =>
          button === "divider" ? (
            <span key={`divider-${index}`} aria-hidden className="mx-1 h-5 w-px bg-border" />
          ) : (
            <button
              key={button.label}
              type="button"
              title={button.title}
              aria-label={button.title}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => run(button.command, button.value)}
              className="min-w-8 rounded px-2 py-1 text-sm text-text-muted transition-colors hover:bg-surface-2 hover:text-text"
              style={{
                fontWeight: button.weight,
                fontStyle: button.italic ? "italic" : undefined,
                textDecoration: button.underline ? "underline" : undefined,
              }}
            >
              {button.label}
            </button>
          ),
        )}

        <span aria-hidden className="mx-1 h-5 w-px bg-border" />

        <button
          type="button"
          title="Add a link"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => {
            /*
              `prompt` rather than a dialog of our own.

              A link dialog has to preserve the selection across losing focus,
              which is the one thing `contentEditable` makes genuinely hard —
              and a letter has two or three links in it. The browser's prompt
              keeps the selection and cannot be got wrong.
            */
            const href = window.prompt("Link to:", "https://");
            if (href) run("createLink", href);
          }}
          className="rounded px-2 py-1 text-sm text-text-muted transition-colors hover:bg-surface-2 hover:text-text"
        >
          Link
        </button>

        <button
          type="button"
          title="Remove formatting from the selection"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => run("removeFormat")}
          className="rounded px-2 py-1 text-sm text-text-muted transition-colors hover:bg-surface-2 hover:text-text"
        >
          Clear
        </button>

        <span className="ml-auto pr-1 text-xs text-text-subtle">
          Paste from Word or Docs — the formatting is cleaned automatically
        </span>
      </div>

      <div
        ref={editor}
        contentEditable
        suppressContentEditableWarning
        role="textbox"
        aria-multiline="true"
        aria-label={ariaLabel}
        onInput={sync}
        onBlur={sync}
        onPaste={onPaste}
        className={cn(
          "min-h-[22rem] px-4 py-3 text-sm leading-relaxed text-text",
          "focus:outline-none focus:ring-2 focus:ring-accent/20",
          /* The prose styles the editor shows are the sheet's, at screen size,
             so what is typed looks like what will print. */
          "[&_p]:mb-3 [&_h2]:mb-2 [&_h2]:mt-4 [&_h2]:text-base [&_h2]:font-semibold",
          "[&_h3]:mb-2 [&_h3]:mt-3 [&_h3]:text-sm [&_h3]:font-semibold",
          "[&_ul]:mb-3 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:mb-3 [&_ol]:list-decimal [&_ol]:pl-6",
          "[&_li]:mb-1 [&_a]:text-accent [&_a]:underline",
          "[&_blockquote]:mb-3 [&_blockquote]:border-l-2 [&_blockquote]:border-accent [&_blockquote]:pl-3 [&_blockquote]:text-text-muted",
          "[&_table]:mb-3 [&_table]:w-full [&_table]:border-collapse",
          "[&_th]:border [&_th]:border-border [&_th]:bg-surface-2 [&_th]:p-2 [&_th]:text-left",
          "[&_td]:border [&_td]:border-border [&_td]:p-2",
          "[&_hr]:my-4 [&_hr]:border-border",
        )}
      />

      {/* What the form posts. The editor's DOM is not a form control. */}
      <input type="hidden" name={name} value={html} />

      <p className="border-t border-border px-4 py-2 text-xs text-text-subtle">
        {empty
          ? "Nothing written yet."
          : "Saved as written. Bold, lists, links and tables are kept; everything else is cleaned off."}
      </p>
    </div>
  );
}

function escapeText(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
