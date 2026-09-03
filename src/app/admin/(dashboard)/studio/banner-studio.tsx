"use client";

import { useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Check,
  CircleAlert,
  Download,
  Film,
  ImagePlus,
  Info,
  Loader2,
  Square,
  Trash2,
  Type as TypeIcon,
} from "lucide-react";
import { BANNER_SIZES, bannerFileName, bannerSize, safeBox } from "@/lib/studio/banner";
import { FONTS, type FontKey } from "@/lib/studio/logo";
import {
  layerId,
  review,
  type ImageLayer,
  type Layer,
  type ShapeLayer,
  type TextLayer,
} from "@/lib/studio/layers";
import { frameFromVideo, loadImage, loadVideo, MediaError } from "@/lib/studio/media";
import { save, saveText, toPngBlob, toSvgFile } from "@/lib/studio/export";
import { BannerCanvas } from "./banner-canvas";

/**
 * A banner, built out of things you can move.
 *
 * ---------------------------------------------------------------------------
 * **What this replaced, and why it had to be replaced.**
 *
 *   > esme banner banana ka feel hi nhi aa raha h
 *
 * The old one took a headline and a subline and drew them in a fixed place. It
 * produced a correct image and it was not a banner maker — it was a form with a
 * picture at the end. There was nothing to arrange, so there was nothing to
 * make.
 *
 * ---------------------------------------------------------------------------
 * **Three things go on a banner and all three move.** Text, pictures, and plain
 * shapes for putting behind text. Drag to place, corner to size, and the layer
 * list to reorder — which is the whole vocabulary, deliberately.
 *
 * ---------------------------------------------------------------------------
 * **The guidance is arithmetic, not opinion.**
 *
 * It says a headline is outside the part YouTube guarantees, that a logo is
 * being drawn three times its real size, that grey text will not survive the
 * photograph behind it. Every one is a number — a rectangle intersection, a
 * pixel count, a contrast ratio — and every one comes with what to do about it.
 * Nothing here has a view on whether a layout is attractive; that needs eyes,
 * and pretending otherwise would make the whole panel ignorable.
 *
 * ---------------------------------------------------------------------------
 * **Nothing leaves the browser.** Files are read with `FileReader` and held as
 * data URLs, which is also what makes the PNG export possible at all.
 */

const NOTE_STYLE = {
  problem: {
    icon: CircleAlert,
    className: "border-red-500/40 bg-red-500/10",
    tone: "text-red-600 dark:text-red-400",
  },
  warning: {
    icon: AlertTriangle,
    className: "border-amber-500/40 bg-amber-500/10",
    tone: "text-amber-600 dark:text-amber-400",
  },
  hint: {
    icon: Info,
    className: "border-border bg-surface-2",
    tone: "text-text-subtle",
  },
} as const;

export function BannerStudio({ initialAccent }: { initialAccent: string }) {
  const [sizeKey, setSizeKey] = useState("linkedin");
  const [background, setBackground] = useState("#0f172a");
  const [guides, setGuides] = useState(true);

  const size = bannerSize(sizeKey);

  const [layers, setLayers] = useState<Layer[]>(() => [
    startingHeadline(bannerSize("linkedin"), initialAccent),
  ]);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [failed, setFailed] = useState<string | null>(null);

  /** A video being scrubbed for a frame, if one has been dropped in. */
  const [video, setVideo] = useState<{ url: string; label: string } | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  /* The hidden copy every download is serialised from — no selection outline,
     no dotted guide, nothing that helps on screen. */
  const stage = useRef<HTMLDivElement>(null);

  const selected = layers.find((layer) => layer.id === selectedId) ?? null;

  const notes = useMemo(
    () => review(layers, size, background),
    [layers, size, background],
  );

  const update = (next: Layer) =>
    setLayers((all) => all.map((layer) => (layer.id === next.id ? next : layer)));

  const add = (layer: Layer) => {
    setLayers((all) => [...all, layer]);
    setSelectedId(layer.id);
  };

  const remove = (id: string) => {
    setLayers((all) => all.filter((layer) => layer.id !== id));
    setSelectedId(null);
  };

  /** Move a layer one step through the stack. */
  const restack = (id: string, direction: 1 | -1) => {
    setLayers((all) => {
      const ordered = [...all].sort((a, b) => a.z - b.z);
      const at = ordered.findIndex((layer) => layer.id === id);
      const swap = at + direction;

      if (at < 0 || swap < 0 || swap >= ordered.length) return all;

      const z = ordered[at].z;
      ordered[at] = { ...ordered[at], z: ordered[swap].z };
      ordered[swap] = { ...ordered[swap], z };

      return ordered;
    });
  };

  async function addImage(file: File) {
    setFailed(null);
    setBusy("image");

    try {
      const loaded = await loadImage(file);

      /*
        Sized to sit comfortably rather than to fill.

        Half the banner's width, and the height derived from the picture's own
        proportions — so it arrives undistorted and with room around it, which
        is a starting point somebody adjusts rather than a mess they undo.
      */
      const width = size.width * 0.5;
      const height = width * (loaded.naturalHeight / Math.max(loaded.naturalWidth, 1));

      add({
        id: layerId(),
        kind: "image",
        x: (size.width - width) / 2,
        y: (size.height - height) / 2,
        width,
        height,
        z: nextZ(layers),
        fit: "contain",
        radius: 0,
        ...loaded,
      } satisfies ImageLayer);
    } catch (error) {
      setFailed(error instanceof MediaError ? error.message : "That file could not be added.");
    } finally {
      setBusy(null);
    }
  }

  async function addVideo(file: File) {
    setFailed(null);

    try {
      if (video) URL.revokeObjectURL(video.url);
      setVideo(await loadVideo(file));
    } catch (error) {
      setFailed(error instanceof MediaError ? error.message : "That video could not be opened.");
    }
  }

  async function takeFrame() {
    if (!videoRef.current || !video) return;

    setFailed(null);
    setBusy("frame");

    try {
      const loaded = await frameFromVideo(videoRef.current, video.label);
      const width = size.width * 0.6;
      const height = width * (loaded.naturalHeight / Math.max(loaded.naturalWidth, 1));

      add({
        id: layerId(),
        kind: "image",
        x: (size.width - width) / 2,
        y: (size.height - height) / 2,
        width,
        height,
        z: nextZ(layers),
        fit: "contain",
        radius: 0,
        ...loaded,
      } satisfies ImageLayer);
    } catch (error) {
      setFailed(error instanceof MediaError ? error.message : "That frame could not be taken.");
    } finally {
      setBusy(null);
    }
  }

  async function take(as: "png" | "svg") {
    const svg = stage.current?.querySelector("svg");
    if (!svg) return;

    setFailed(null);
    setBusy(as);

    try {
      const first = layers.find((layer): layer is TextLayer => layer.kind === "text");
      const name = bannerFileName(first?.text || "banner", size.key, size.width, size.height, as);

      if (as === "svg") {
        saveText(toSvgFile(svg, size.width, size.height), name, "image/svg+xml");
      } else {
        /* Always on a background. A transparent banner is a hole wherever it is
           pasted, usually a white one on a dark layout. */
        const blob = await toPngBlob(svg, size.width, size.height, background);
        save(blob, name);
      }

      setDone(as);
      window.setTimeout(() => setDone(null), 2000);
    } catch (error) {
      setFailed(error instanceof Error ? error.message : "That file could not be made.");
    } finally {
      setBusy(null);
    }
  }

  const problems = notes.filter((note) => note.level === "problem").length;

  return (
    <div className="space-y-6">
      {/* ------------------------------------------------------ where it goes */}

      <section>
        <h2 className="font-display text-lg font-semibold">Where it goes</h2>
        <p className="measure mt-1 text-sm text-text-muted">
          Every size here is the one that platform actually wants. The dotted box
          is the part that is never cropped — anything outside it is missing on a
          phone.
        </p>

        <ul className="mt-3 flex flex-wrap gap-2">
          {BANNER_SIZES.map((option) => (
            <li key={option.key}>
              <button
                type="button"
                onClick={() => setSizeKey(option.key)}
                aria-pressed={sizeKey === option.key}
                className={`rounded-lg border px-3 py-1.5 text-left text-sm transition-colors ${
                  sizeKey === option.key
                    ? "border-accent bg-accent-soft/40"
                    : "border-border hover:bg-surface-2"
                }`}
              >
                {option.label}
                <span className="ml-2 font-mono text-[11px] text-text-subtle">
                  {option.width}×{option.height}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </section>

      {/* ----------------------------------------------------------- the stage */}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display text-lg font-semibold">{size.label}</h2>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={guides}
                onChange={(event) => setGuides(event.target.checked)}
                className="size-4 rounded border-border"
              />
              Show the part that is never cropped
            </label>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-border bg-surface-2 p-4">
            <div className="mx-auto" style={{ maxWidth: Math.min(size.width, 900) }}>
              <BannerCanvas
                size={size}
                background={background}
                layers={layers}
                selectedId={selectedId}
                onSelect={setSelectedId}
                onChange={update}
                showGuides={guides}
                className="w-full touch-none rounded-lg"
              />
            </div>
          </div>

          <p className="text-xs text-text-subtle">
            Drag anything to move it. The blue corner changes its size. Click the
            background to deselect.
          </p>

          {/* The copy the download is taken from: no outline, no guide. */}
          <div ref={stage} className="sr-only" aria-hidden>
            <BannerCanvas
              size={size}
              background={background}
              layers={layers}
              selectedId={null}
              onSelect={() => {}}
              onChange={() => {}}
              forExport
            />
          </div>
        </section>

        {/* ------------------------------------------------------ the panel */}

        <div className="space-y-4">
          <AddThings
            busy={busy}
            onText={() => add(newText(size, layers))}
            onShape={() => add(newShape(size, layers, background))}
            onImage={addImage}
            onVideo={addVideo}
          />

          {video && (
            <section className="rounded-2xl border border-border bg-surface p-4">
              <h3 className="text-sm font-medium">Take a frame from the video</h3>
              <p className="mt-1 text-xs text-text-subtle">
                A banner is a still image, so it cannot hold a video — but it can
                hold a frame from one. Scrub to the moment you want and take it.
              </p>

              <video
                ref={videoRef}
                src={video.url}
                controls
                preload="metadata"
                className="mt-3 w-full rounded-lg bg-black"
              />

              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={takeFrame}
                  disabled={busy !== null}
                  className="inline-flex items-center gap-2 rounded-lg bg-accent px-3 py-2 text-sm font-medium text-accent-fg transition hover:opacity-90 disabled:opacity-60"
                >
                  {busy === "frame" ? (
                    <Loader2 className="size-4 animate-spin" aria-hidden />
                  ) : (
                    <Film className="size-4" aria-hidden />
                  )}
                  Use this frame
                </button>

                <button
                  type="button"
                  onClick={() => {
                    URL.revokeObjectURL(video.url);
                    setVideo(null);
                  }}
                  className="rounded-lg border border-border px-3 py-2 text-sm transition-colors hover:bg-surface-2"
                >
                  Done with the video
                </button>
              </div>
            </section>
          )}

          <Layers
            layers={layers}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onRemove={remove}
            onRestack={restack}
          />

          <section className="rounded-2xl border border-border bg-surface p-4">
            <h3 className="text-sm font-medium">The background</h3>
            <label className="mt-3 flex items-center gap-2 text-sm">
              <input
                type="color"
                value={background}
                onChange={(event) => setBackground(event.target.value)}
                className="size-9 cursor-pointer rounded-lg border border-border bg-surface p-1"
              />
              <span className="font-mono text-xs text-text-subtle">{background}</span>
            </label>
          </section>

          {selected && <Properties layer={selected} onChange={update} />}
        </div>
      </div>

      {/* ---------------------------------------------------------- guidance */}

      <section>
        <h2 className="font-display text-lg font-semibold">
          What to look at
          {problems > 0 && (
            <span className="ml-2 rounded-full bg-red-500/15 px-2 py-0.5 text-xs font-medium text-red-600 dark:text-red-400">
              {problems} to fix
            </span>
          )}
        </h2>

        {notes.length === 0 ? (
          <p className="mt-3 flex items-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm">
            <Check className="size-4 text-emerald-600 dark:text-emerald-400" aria-hidden />
            Nothing is wrong with this one — everything is inside the frame,
            large enough to read, and readable on what is behind it.
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {notes.map((note, index) => {
              const style = NOTE_STYLE[note.level];
              const Icon = style.icon;

              return (
                <li key={`${note.layerId}-${index}`}>
                  <button
                    type="button"
                    onClick={() => note.layerId && setSelectedId(note.layerId)}
                    className={`flex w-full items-start gap-3 rounded-xl border px-4 py-3 text-left text-sm transition-colors ${style.className} ${
                      note.layerId ? "hover:brightness-105" : "cursor-default"
                    }`}
                  >
                    <Icon className={`mt-0.5 size-4 shrink-0 ${style.tone}`} aria-hidden />
                    <span className="min-w-0">
                      <span className="block font-medium">{note.message}</span>
                      <span className="mt-0.5 block text-text-muted">{note.fix}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        <p className="mt-3 text-xs text-text-subtle">
          These are measurements, not opinions — what is off the edge, what is
          too small, what cannot be read on what is behind it. Whether it looks
          good is still your call.
        </p>
      </section>

      {/* ------------------------------------------------------------- files */}

      <section>
        <h2 className="font-display text-lg font-semibold">Take the file</h2>

        {failed && (
          <p role="alert" className="mt-3 text-sm text-red-600 dark:text-red-400">
            {failed}
          </p>
        )}

        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => take("png")}
            disabled={busy !== null}
            className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-fg transition hover:opacity-90 disabled:opacity-60"
          >
            {busy === "png" ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : done === "png" ? (
              <Check className="size-4" aria-hidden />
            ) : (
              <Download className="size-4" aria-hidden />
            )}
            PNG · {size.width} × {size.height}
          </button>

          <button
            type="button"
            onClick={() => take("svg")}
            disabled={busy !== null}
            className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm transition-colors hover:bg-surface-2 disabled:opacity-60"
          >
            {busy === "svg" ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : done === "svg" ? (
              <Check className="size-4 text-accent" aria-hidden />
            ) : (
              <Download className="size-4" aria-hidden />
            )}
            SVG
          </button>
        </div>

        <p className="mt-3 text-xs text-text-subtle">
          The dotted guide and the selection outline are drawn on the preview
          only — never in the file.
        </p>
      </section>
    </div>
  );
}

/* ========================================================================== */
/* Pieces                                                                     */
/* ========================================================================== */

function nextZ(layers: Layer[]): number {
  return layers.reduce((highest, layer) => Math.max(highest, layer.z), 0) + 1;
}

/** The headline a new banner starts with, placed inside the safe area. */
function startingHeadline(size: ReturnType<typeof bannerSize>, accent: string): TextLayer {
  const safe = safeBox(size);

  return {
    id: layerId(),
    kind: "text",
    x: safe.x,
    y: safe.y + safe.height * 0.3,
    width: safe.width,
    height: size.height * 0.3,
    z: 1,
    text: "Open six days a week",
    size: Math.round(size.height * 0.16),
    weight: 700,
    /* White, because a new banner starts on a dark background — and the review
       would otherwise open with a contrast complaint about our own default. */
    colour: "#ffffff",
    font: "display",
    align: "left",
    lineHeight: 1.15,
    ...(accent ? {} : {}),
  };
}

function newText(size: ReturnType<typeof bannerSize>, layers: Layer[]): TextLayer {
  const safe = safeBox(size);

  return {
    id: layerId(),
    kind: "text",
    x: safe.x,
    y: safe.y + safe.height * 0.6,
    width: safe.width * 0.7,
    height: size.height * 0.14,
    z: nextZ(layers),
    text: "Something else",
    size: Math.round(size.height * 0.07),
    weight: 500,
    colour: "#ffffff",
    font: "sans",
    align: "left",
    lineHeight: 1.3,
  };
}

function newShape(
  size: ReturnType<typeof bannerSize>,
  layers: Layer[],
  background: string,
): ShapeLayer {
  return {
    id: layerId(),
    kind: "shape",
    x: size.width * 0.1,
    y: size.height * 0.2,
    width: size.width * 0.3,
    height: size.height * 0.4,
    z: nextZ(layers),
    shape: "rect",
    /* Not the background colour — a shape the same colour as what is behind it
       is invisible, and somebody has just asked for a shape. */
    fill: background === "#ffffff" ? "#0f172a" : "#ffffff",
    radius: Math.round(size.height * 0.03),
    opacity: 1,
  };
}

function AddThings({
  busy,
  onText,
  onShape,
  onImage,
  onVideo,
}: {
  busy: string | null;
  onText: () => void;
  onShape: () => void;
  onImage: (file: File) => void;
  onVideo: (file: File) => void;
}) {
  return (
    <section className="rounded-2xl border border-border bg-surface p-4">
      <h3 className="text-sm font-medium">Add something</h3>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={onText}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-border px-3 py-2 text-sm transition-colors hover:bg-surface-2"
        >
          <TypeIcon className="size-4" aria-hidden />
          Text
        </button>

        <button
          type="button"
          onClick={onShape}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-border px-3 py-2 text-sm transition-colors hover:bg-surface-2"
        >
          <Square className="size-4" aria-hidden />
          Panel
        </button>

        <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-border px-3 py-2 text-sm transition-colors hover:bg-surface-2">
          {busy === "image" ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : (
            <ImagePlus className="size-4" aria-hidden />
          )}
          Image
          <input
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) onImage(file);
              event.target.value = "";
            }}
          />
        </label>

        <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-border px-3 py-2 text-sm transition-colors hover:bg-surface-2">
          <Film className="size-4" aria-hidden />
          Video
          <input
            type="file"
            accept="video/*"
            className="sr-only"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) onVideo(file);
              event.target.value = "";
            }}
          />
        </label>
      </div>

      <p className="mt-3 text-xs text-text-subtle">
        Nothing is uploaded. Files are read in this page and stay in it.
      </p>
    </section>
  );
}

function Layers({
  layers,
  selectedId,
  onSelect,
  onRemove,
  onRestack,
}: {
  layers: Layer[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onRemove: (id: string) => void;
  onRestack: (id: string, direction: 1 | -1) => void;
}) {
  /* Front first, which is how they are stacked on screen. */
  const ordered = [...layers].sort((a, b) => b.z - a.z);

  return (
    <section className="rounded-2xl border border-border bg-surface p-4">
      <h3 className="text-sm font-medium">What is on it</h3>

      {ordered.length === 0 ? (
        <p className="mt-3 text-xs text-text-subtle">Nothing yet.</p>
      ) : (
        <ul className="mt-3 space-y-1">
          {ordered.map((layer) => (
            <li
              key={layer.id}
              className={`flex items-center gap-1 rounded-lg border px-2 py-1.5 ${
                layer.id === selectedId ? "border-accent bg-accent-soft/40" : "border-transparent"
              }`}
            >
              <button
                type="button"
                onClick={() => onSelect(layer.id)}
                className="min-w-0 flex-1 truncate text-left text-sm"
              >
                {layer.kind === "text"
                  ? layer.text.split("\n")[0] || "Empty text"
                  : layer.kind === "image"
                    ? layer.label
                    : layer.shape === "circle"
                      ? "Circle"
                      : "Panel"}
              </button>

              <button
                type="button"
                onClick={() => onRestack(layer.id, 1)}
                aria-label="Bring forward"
                className="grid size-7 shrink-0 place-items-center rounded text-text-subtle transition-colors hover:bg-surface-2"
              >
                <ArrowUp className="size-3.5" aria-hidden />
              </button>

              <button
                type="button"
                onClick={() => onRestack(layer.id, -1)}
                aria-label="Send backward"
                className="grid size-7 shrink-0 place-items-center rounded text-text-subtle transition-colors hover:bg-surface-2"
              >
                <ArrowDown className="size-3.5" aria-hidden />
              </button>

              <button
                type="button"
                onClick={() => onRemove(layer.id)}
                aria-label="Remove"
                className="grid size-7 shrink-0 place-items-center rounded text-text-subtle transition-colors hover:bg-surface-2 hover:text-red-600"
              >
                <Trash2 className="size-3.5" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function Properties({ layer, onChange }: { layer: Layer; onChange: (layer: Layer) => void }) {
  return (
    <section className="space-y-4 rounded-2xl border border-border bg-surface p-4">
      <h3 className="text-sm font-medium">
        {layer.kind === "text" ? "The text" : layer.kind === "image" ? "The image" : "The panel"}
      </h3>

      {layer.kind === "text" && (
        <>
          <label className="block text-sm">
            <span className="text-xs text-text-subtle">Words</span>
            <textarea
              value={layer.text}
              onChange={(event) => onChange({ ...layer, text: event.target.value })}
              rows={2}
              className="mt-1 w-full resize-none rounded-lg border border-border bg-surface px-3 py-2 text-sm"
            />
          </label>

          <label className="block text-sm">
            <span className="text-xs text-text-subtle">Size</span>
            <input
              type="range"
              min={12}
              max={Math.round(layer.height * 2 + 200)}
              value={layer.size}
              onChange={(event) => onChange({ ...layer, size: Number(event.target.value) })}
              className="mt-1 w-full"
            />
          </label>

          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="color"
                value={layer.colour}
                onChange={(event) => onChange({ ...layer, colour: event.target.value })}
                className="size-8 cursor-pointer rounded border border-border bg-surface p-0.5"
              />
              Colour
            </label>

            <select
              value={layer.font}
              onChange={(event) => onChange({ ...layer, font: event.target.value as FontKey })}
              className="rounded-lg border border-border bg-surface px-2 py-1.5 text-sm"
            >
              {FONTS.map((font) => (
                <option key={font.key} value={font.key}>
                  {font.label}
                </option>
              ))}
            </select>

            <select
              value={layer.align}
              onChange={(event) =>
                onChange({ ...layer, align: event.target.value as TextLayer["align"] })
              }
              className="rounded-lg border border-border bg-surface px-2 py-1.5 text-sm"
            >
              <option value="left">Left</option>
              <option value="center">Centred</option>
              <option value="right">Right</option>
            </select>
          </div>
        </>
      )}

      {layer.kind === "image" && (
        <>
          <p className="text-xs text-text-subtle">
            {layer.naturalWidth} × {layer.naturalHeight} in the file.
          </p>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => onChange({ ...layer, fit: "contain" })}
              aria-pressed={layer.fit === "contain"}
              className={`rounded-lg border px-3 py-1.5 text-sm transition-colors ${
                layer.fit === "contain"
                  ? "border-accent bg-accent-soft/40"
                  : "border-border hover:bg-surface-2"
              }`}
            >
              Fit the whole picture
            </button>

            <button
              type="button"
              onClick={() => onChange({ ...layer, fit: "cover" })}
              aria-pressed={layer.fit === "cover"}
              className={`rounded-lg border px-3 py-1.5 text-sm transition-colors ${
                layer.fit === "cover"
                  ? "border-accent bg-accent-soft/40"
                  : "border-border hover:bg-surface-2"
              }`}
            >
              Fill the box (crops)
            </button>
          </div>

          <p className="text-xs text-text-subtle">
            Fitting never cuts anything off and never distorts it. Filling crops
            whatever does not fit — which is sometimes what you want, and is
            always mentioned below.
          </p>
        </>
      )}

      {layer.kind === "shape" && (
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="color"
              value={layer.fill}
              onChange={(event) => onChange({ ...layer, fill: event.target.value })}
              className="size-8 cursor-pointer rounded border border-border bg-surface p-0.5"
            />
            Colour
          </label>

          <select
            value={layer.shape}
            onChange={(event) =>
              onChange({ ...layer, shape: event.target.value as ShapeLayer["shape"] })
            }
            className="rounded-lg border border-border bg-surface px-2 py-1.5 text-sm"
          >
            <option value="rect">Rectangle</option>
            <option value="circle">Circle</option>
          </select>

          <label className="flex items-center gap-2 text-sm">
            <span className="text-xs text-text-subtle">See-through</span>
            <input
              type="range"
              min={10}
              max={100}
              value={Math.round(layer.opacity * 100)}
              onChange={(event) =>
                onChange({ ...layer, opacity: Number(event.target.value) / 100 })
              }
            />
          </label>
        </div>
      )}
    </section>
  );
}
