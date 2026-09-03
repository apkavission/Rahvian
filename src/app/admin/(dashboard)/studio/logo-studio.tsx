"use client";

import { useMemo, useRef, useState } from "react";
import {
  Check,
  Download,
  FileImage,
  Loader2,
  RefreshCw,
  Sparkles,
  Undo2,
} from "lucide-react";
import {
  FONTS,
  LAYOUTS,
  LOGO_SIZES,
  fileName,
  readableOn,
  wordmark,
  type FontKey,
  type LayoutKey,
} from "@/lib/studio/logo";
import { generateSet, vary, type LogoRecipe } from "@/lib/studio/generate";
import { newSeed } from "@/lib/studio/seed";
import { save, saveText, toPngBlob, toSvgFile } from "@/lib/studio/export";
import { LogoArt } from "./logo-mark";

/**
 * Type a name, and keep asking until it is right.
 *
 * ---------------------------------------------------------------------------
 * **The loop the owner asked for, and why it has to be a loop.**
 *
 *   > har baar refresh karu to new logo aaye … jo pasand aa gaya usko select
 *   > kar saku … aur bolu ki esse aur aacha bano to same usi jaisa aur aacha
 *   > banana h
 *
 * Three buttons, and they only work together:
 *
 *   **Show me five more** — five designs from a fresh seed, deliberately
 *   spread, so the first look shows there is a range to choose between.
 *   **Choosing one** — keeps it. A design is a number, so it can be returned to
 *   exactly.
 *   **More like this** — five more that hold what makes it recognisable and
 *   move everything else.
 *
 * Press the third repeatedly and the designs converge on what somebody actually
 * wanted, which is how choosing works when nobody can describe the thing they
 * are looking for in advance. What it replaced was five arrangements of one
 * fixed shape — the same logo for every client, which is what "unique nahi hai"
 * meant.
 *
 * ---------------------------------------------------------------------------
 * **Nothing leaves the browser.** No model, no service, no upload. Every design
 * is arithmetic from a seed, drawn in this page, and the file downloaded is
 * that same drawing.
 */

export function LogoStudio({ initialSeed }: { initialSeed: number }) {
  const [text, setText] = useState("");

  /*
    The seed behind the current five. A new one is a refresh.

    **It arrives as a prop rather than being invented here.** This component is
    rendered on the server first, and `newSeed()` during render gave the server
    one number and the browser another — five designs drawn twice, differently,
    and React tearing the whole tree down to reconcile them. A seed made on the
    server and handed down is the same seed in both places; every seed after the
    first is made in the browser, where there is nothing to disagree with.
  */
  const [seed, setSeed] = useState(initialSeed);

  /** Set once somebody has kept a design and asked for more like it. */
  const [parent, setParent] = useState<LogoRecipe | null>(null);

  /** The design being worked on. */
  const [chosen, setChosen] = useState<LogoRecipe | null>(null);

  /*
    Choices made by hand, kept apart from the recipe.

    Somebody who picks their brand colour has made a decision the next variation
    must not overwrite — but they may also want to see what the generator chose.
    Holding them separately makes "back to the chosen one" a button rather than
    a regenerate.
  */
  const [ownAccent, setOwnAccent] = useState<string | null>(null);
  const [ownInk, setOwnInk] = useState<string | null>(null);
  const [ownFont, setOwnFont] = useState<FontKey | null>(null);
  const [ownLayout, setOwnLayout] = useState<LayoutKey | null>(null);

  const [paper, setPaper] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [failed, setFailed] = useState<string | null>(null);

  /* The node every download is serialised from. The preview *is* the export. */
  const stage = useRef<HTMLDivElement>(null);

  /*
    The five on offer.

    Recomputed only when the seed or the parent changes — not on every keystroke
    of the name, which would rebuild five marks per letter typed.
  */
  const offered = useMemo(
    () => (parent ? vary(parent) : generateSet(seed)),
    [seed, parent],
  );

  const name = wordmark(text);

  /** A recipe as it will actually be drawn, with any hand-made choices on top. */
  const applied = (recipe: LogoRecipe): LogoRecipe => ({
    ...recipe,
    accent: ownAccent ?? recipe.accent,
    ink: ownInk ?? recipe.ink,
    font: ownFont ?? recipe.font,
    layout: ownLayout ?? recipe.layout,
  });

  const working = applied(chosen ?? offered[0]);

  function showFive() {
    setParent(null);
    setChosen(null);
    setSeed(newSeed());
  }

  function moreLikeThis() {
    if (!chosen) return;

    /* What is on screen becomes the parent, hand-made choices included — so
       "more like this" means more like what you are looking at, not more like
       what the generator originally produced. */
    setParent(applied(chosen));
    setChosen(null);
  }

  async function take(sizeKey: string, width: number, height: number, as: "png" | "svg") {
    const svg = stage.current?.querySelector("svg");
    if (!svg) return;

    setFailed(null);
    setBusy(`${sizeKey}-${as}`);

    try {
      if (as === "svg") {
        /* An SVG has no chosen pixel size, so the numbers in the file name come
           from the viewBox — a download called `…@0x0.svg` reads as broken. */
        const box = svg.getAttribute("viewBox")?.split(/[\s,]+/).map(Number);
        const natural =
          box && box.length === 4 ? { width: box[2], height: box[3] } : { width: 100, height: 100 };

        saveText(
          toSvgFile(svg),
          fileName(
            name || "logo",
            sizeKey,
            Math.round(natural.width),
            Math.round(natural.height),
            "svg",
          ),
          "image/svg+xml",
        );
      } else {
        const blob = await toPngBlob(svg, width, height, paper);
        save(blob, fileName(name || "logo", sizeKey, width, height, "png"));
      }

      setDone(`${sizeKey}-${as}`);
      window.setTimeout(() => setDone(null), 2000);
    } catch (error) {
      setFailed(error instanceof Error ? error.message : "That file could not be made.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-8">
      {/* ------------------------------------------------------------ name */}

      <div className="rounded-2xl border border-border bg-surface p-5">
        <label className="block">
          <span className="text-sm font-medium">The name</span>
          <input
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder="Smile Care Dental"
            maxLength={60}
            autoComplete="off"
            className="mt-2 w-full rounded-xl border border-border bg-surface px-4 py-3 text-lg"
          />
          <span className="mt-2 block text-xs text-text-subtle">
            Everything below is built from this. Words like “the” and “Pvt Ltd”
            are left out of the initials.
          </span>
        </label>
      </div>

      {/* --------------------------------------------------------- designs */}

      <section>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0">
            <h2 className="font-display text-lg font-semibold">
              {parent ? "More like the one you kept" : "Five designs"}
            </h2>
            <p className="measure mt-1 text-sm text-text-muted">
              {parent
                ? "The same family of mark, the same arrangement, the same colour — everything else is different. Keep one and ask again to narrow it further."
                : "Made from scratch, not chosen from a list. Refresh for five nobody has seen."}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {parent && (
              <button
                type="button"
                onClick={showFive}
                className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm transition-colors hover:bg-surface-2"
              >
                <Undo2 className="size-4" aria-hidden />
                Start again
              </button>
            )}

            <button
              type="button"
              onClick={showFive}
              className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm transition-colors hover:bg-surface-2"
            >
              <RefreshCw className="size-4" aria-hidden />
              Show me five more
            </button>

            <button
              type="button"
              onClick={moreLikeThis}
              disabled={!chosen}
              title={chosen ? undefined : "Choose one of the five first"}
              className="inline-flex items-center gap-2 rounded-lg bg-accent px-3 py-2 text-sm font-medium text-accent-fg transition hover:opacity-90 disabled:opacity-50"
            >
              <Sparkles className="size-4" aria-hidden />
              More like this
            </button>
          </div>
        </div>

        <ul className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {offered.map((recipe) => {
            const picked = chosen?.seed === recipe.seed;

            return (
              <li key={recipe.seed} className="min-w-0">
                <button
                  type="button"
                  onClick={() => setChosen(recipe)}
                  aria-pressed={picked}
                  className={`w-full rounded-2xl border p-3 text-left transition-colors ${
                    picked
                      ? "border-accent bg-accent-soft/40"
                      : "border-border bg-surface hover:bg-surface-2"
                  }`}
                >
                  <div className="grid h-24 place-items-center rounded-xl bg-white p-3">
                    <LogoArt
                      spec={{ text, recipe: applied(recipe), paper: null }}
                      role="presentation"
                      className="max-h-full max-w-full"
                    />
                  </div>

                  <p className="mt-2 flex items-center gap-1.5 truncate text-xs font-medium">
                    {picked && <Check className="size-3.5 shrink-0 text-accent" aria-hidden />}
                    {recipe.mark.label}
                  </p>
                  <p className="truncate text-[11px] text-text-subtle">
                    {LAYOUTS.find((layout) => layout.key === recipe.layout)?.label}
                  </p>
                </button>
              </li>
            );
          })}
        </ul>

        {!chosen && (
          <p className="mt-3 text-xs text-text-subtle">
            Nothing chosen yet, so everything below shows the first one.
          </p>
        )}
      </section>

      {/* ------------------------------------------------- colour and shape */}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
        <section className="space-y-6 rounded-2xl border border-border bg-surface p-5">
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-medium">Colour</h3>

              {(ownAccent || ownInk) && (
                <button
                  type="button"
                  onClick={() => {
                    setOwnAccent(null);
                    setOwnInk(null);
                  }}
                  className="text-xs text-accent hover:underline"
                >
                  Back to the design’s own
                </button>
              )}
            </div>

            <p className="mt-1 text-xs text-text-subtle">
              Every design arrives with its own colour. Change it here only if
              you already know your brand colour — a variation will keep it.
            </p>

            <div className="mt-3 flex flex-wrap items-center gap-4">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="color"
                  value={working.accent}
                  onChange={(event) => setOwnAccent(event.target.value)}
                  className="size-9 cursor-pointer rounded-lg border border-border bg-surface p-1"
                />
                <span>
                  The mark
                  <span className="ml-2 font-mono text-xs text-text-subtle">
                    {working.accent}
                  </span>
                </span>
              </label>

              <label className="flex items-center gap-2 text-sm">
                <input
                  type="color"
                  value={working.ink}
                  onChange={(event) => setOwnInk(event.target.value)}
                  className="size-9 cursor-pointer rounded-lg border border-border bg-surface p-1"
                />
                <span>The name</span>
              </label>
            </div>

            <p className="mt-3 text-xs text-text-subtle">
              The initials inside the mark switch between black and white on
              their own, whichever can be read on the colour — right now that is{" "}
              <span className="font-medium">
                {readableOn(working.accent) === "#ffffff" ? "white" : "black"}
              </span>
              .
            </p>
          </div>

          <div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-medium">Arrangement</h3>
              {ownLayout && (
                <button
                  type="button"
                  onClick={() => setOwnLayout(null)}
                  className="text-xs text-accent hover:underline"
                >
                  Back to the design’s own
                </button>
              )}
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              {LAYOUTS.map((layout) => (
                <button
                  key={layout.key}
                  type="button"
                  onClick={() => setOwnLayout(layout.key as LayoutKey)}
                  aria-pressed={working.layout === layout.key}
                  className={`rounded-lg border px-3 py-1.5 text-sm transition-colors ${
                    working.layout === layout.key
                      ? "border-accent bg-accent-soft/40"
                      : "border-border hover:bg-surface-2"
                  }`}
                >
                  {layout.label}
                </button>
              ))}
            </div>

            <p className="mt-2 text-xs text-text-subtle">
              {LAYOUTS.find((layout) => layout.key === working.layout)?.note}
            </p>
          </div>

          <div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-medium">Lettering</h3>
              {ownFont && (
                <button
                  type="button"
                  onClick={() => setOwnFont(null)}
                  className="text-xs text-accent hover:underline"
                >
                  Back to the design’s own
                </button>
              )}
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              {FONTS.map((font) => (
                <button
                  key={font.key}
                  type="button"
                  onClick={() => setOwnFont(font.key as FontKey)}
                  aria-pressed={working.font === font.key}
                  className={`rounded-lg border px-3 py-1.5 text-sm transition-colors ${
                    working.font === font.key
                      ? "border-accent bg-accent-soft/40"
                      : "border-border hover:bg-surface-2"
                  }`}
                  style={{ fontFamily: font.stack }}
                >
                  {font.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-medium">Behind it</h3>

            <div className="mt-3 flex flex-wrap gap-2">
              <Toggle active={paper === null} onClick={() => setPaper(null)}>
                Nothing (see-through)
              </Toggle>
              <Toggle active={paper === "#ffffff"} onClick={() => setPaper("#ffffff")}>
                White
              </Toggle>
              <Toggle active={paper === "#0b1120"} onClick={() => setPaper("#0b1120")}>
                Dark
              </Toggle>
            </div>

            <p className="mt-2 text-xs text-text-subtle">
              See-through is right for a logo — it drops onto any page. A PNG
              keeps it; so does the SVG.
            </p>
          </div>
        </section>

        {/* ------------------------------------------------------- preview */}

        <section className="space-y-4">
          <h3 className="text-sm font-medium">How it looks</h3>

          {/*
            One drawing, three backdrops.

            The node inside `stage` is what every download serialises, so what is
            checked here is literally what leaves. It is shown on light and dark
            because a logo that only works on one is a logo that will be
            discovered on the other by a client.
          */}
          <div
            ref={stage}
            className="grid place-items-center rounded-2xl border border-border bg-white p-8"
          >
            <LogoArt spec={{ text, recipe: working, paper }} className="max-h-32 w-full" />
          </div>

          <div className="rounded-2xl border border-border bg-[#0b1120] p-8">
            <div className="grid place-items-center">
              <LogoArt
                spec={{ text, recipe: { ...working, ink: "#ffffff" }, paper: null }}
                role="presentation"
                className="max-h-24 w-full"
              />
            </div>

            <p className="mt-5 text-center text-xs text-white/60">
              The dark version, with the name in white. To take this one, set{" "}
              <span className="font-medium text-white/85">The name</span> above
              to white.
            </p>
          </div>

          {/* The size that decides whether a mark works at all. */}
          <div className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-4">
            <div className="grid size-8 shrink-0 place-items-center overflow-hidden rounded bg-white">
              <LogoArt
                spec={{ text, recipe: working, paper: null }}
                role="presentation"
                className="size-7"
              />
            </div>
            <p className="text-xs text-text-subtle">
              At the size of a browser tab. If it is a smudge here, choose{" "}
              <span className="font-medium">Initials in a block</span> — that is
              what it is for.
            </p>
          </div>

          {/* The design's name. Written down, it can be returned to exactly. */}
          <p className="rounded-xl bg-surface-2 px-3 py-2 font-mono text-[11px] text-text-subtle">
            design #{working.seed}
          </p>
        </section>
      </div>

      {/* ----------------------------------------------------------- files */}

      <section>
        <h2 className="font-display text-lg font-semibold">Take the files</h2>
        <p className="measure mt-1 text-sm text-text-muted">
          The sizes things are actually asked for, so nobody has to look them up.
          SVG scales to anything and is the one to keep.
        </p>

        {failed && (
          <p role="alert" className="mt-3 text-sm text-red-600 dark:text-red-400">
            {failed}
          </p>
        )}

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => take("master", 0, 0, "svg")}
            disabled={busy !== null}
            className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-fg transition hover:opacity-90 disabled:opacity-60"
          >
            {busy === "master-svg" ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              <FileImage className="size-4" aria-hidden />
            )}
            The SVG — scales to any size
          </button>
        </div>

        <ul className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          {LOGO_SIZES.map((size) => {
            const key = `${size.key}-png`;

            return (
              <li
                key={size.key}
                className="flex min-w-0 items-center justify-between gap-3 rounded-xl border border-border bg-surface p-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{size.label}</p>
                  <p className="truncate text-xs text-text-subtle">
                    {size.width} × {size.height} · {size.note}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => take(size.key, size.width, size.height, "png")}
                  disabled={busy !== null}
                  aria-label={`Download ${size.label}, ${size.width} by ${size.height}`}
                  className="grid size-9 shrink-0 place-items-center rounded-lg border border-border transition-colors hover:bg-surface-2 disabled:opacity-50"
                >
                  {busy === key ? (
                    <Loader2 className="size-4 animate-spin" aria-hidden />
                  ) : done === key ? (
                    <Check className="size-4 text-accent" aria-hidden />
                  ) : (
                    <Download className="size-4" aria-hidden />
                  )}
                </button>
              </li>
            );
          })}
        </ul>

        <p className="mt-4 text-xs text-text-subtle">
          Nothing is ever squashed: a wide logo asked for as a square icon is
          scaled to fit and centred. It will be small in that square, though —
          for app icons and the browser tab, choose{" "}
          <span className="font-medium">Initials in a block</span>, which is the
          design that exists for exactly that.
        </p>
      </section>
    </div>
  );
}

function Toggle({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-lg border px-3 py-1.5 text-sm transition-colors ${
        active ? "border-accent bg-accent-soft/40" : "border-border hover:bg-surface-2"
      }`}
    >
      {children}
    </button>
  );
}
