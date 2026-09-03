"use client";

import { useRef, useState } from "react";
import { safeBox, type BannerSize } from "@/lib/studio/banner";
import { fontFor, readableOn } from "@/lib/studio/logo";
import { moved, resized, type Layer } from "@/lib/studio/layers";

/**
 * The banner itself, and the things on it.
 *
 * ---------------------------------------------------------------------------
 * **Drawn as one SVG, at the banner's own coordinates.**
 *
 * A layer at x=340 is at x=340 whether the preview is a third of the size or
 * the export is 2560 across, so nothing shifts when the size changes and the
 * downloaded file is the same drawing the person arranged. The alternative —
 * HTML boxes for editing and SVG for export — is two layouts that agree until
 * they do not.
 *
 * ---------------------------------------------------------------------------
 * **Dragging converts screen pixels to banner units and nothing else.**
 *
 * One number does it: the ratio between the SVG's drawn width and its viewBox
 * width. Pointer events rather than mouse events, so a phone and a pen work
 * without a second code path, and `setPointerCapture` so a fast drag that
 * leaves the element still arrives.
 */

export interface CanvasProps {
  size: BannerSize;
  background: string;
  layers: Layer[];
  /** Null when nothing is selected. */
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onChange: (layer: Layer) => void;
  /** The dotted guide. On screen only — never in the exported node. */
  showGuides?: boolean;
  /** Set on the hidden copy the download is taken from. */
  forExport?: boolean;
  className?: string;
}

type Drag =
  | { kind: "move"; id: string; grabX: number; grabY: number }
  | { kind: "resize"; id: string; fromX: number; fromY: number; width: number; height: number };

export function BannerCanvas({
  size,
  background,
  layers,
  selectedId,
  onSelect,
  onChange,
  showGuides = false,
  forExport = false,
  className,
}: CanvasProps) {
  const svg = useRef<SVGSVGElement>(null);
  const [drag, setDrag] = useState<Drag | null>(null);

  const safe = safeBox(size);
  const ordered = [...layers].sort((a, b) => a.z - b.z);

  /** Screen pixels to banner units. One ratio, measured from the drawn size. */
  function toUnits(event: React.PointerEvent): { x: number; y: number } {
    const box = svg.current?.getBoundingClientRect();
    if (!box) return { x: 0, y: 0 };

    const scale = size.width / box.width;

    return {
      x: (event.clientX - box.left) * scale,
      y: (event.clientY - box.top) * scale,
    };
  }

  function startMove(event: React.PointerEvent, layer: Layer) {
    if (forExport || layer.locked) return;

    event.stopPropagation();
    (event.target as Element).setPointerCapture?.(event.pointerId);

    const at = toUnits(event);
    onSelect(layer.id);
    setDrag({ kind: "move", id: layer.id, grabX: at.x - layer.x, grabY: at.y - layer.y });
  }

  function startResize(event: React.PointerEvent, layer: Layer) {
    if (forExport) return;

    event.stopPropagation();
    (event.target as Element).setPointerCapture?.(event.pointerId);

    const at = toUnits(event);
    setDrag({
      kind: "resize",
      id: layer.id,
      fromX: at.x,
      fromY: at.y,
      width: layer.width,
      height: layer.height,
    });
  }

  function onMove(event: React.PointerEvent) {
    if (!drag) return;

    const layer = layers.find((one) => one.id === drag.id);
    if (!layer) return;

    const at = toUnits(event);

    if (drag.kind === "move") {
      onChange(moved(layer, at.x - drag.grabX, at.y - drag.grabY, size));
      return;
    }

    onChange(
      resized(layer, drag.width + (at.x - drag.fromX), drag.height + (at.y - drag.fromY)),
    );
  }

  return (
    <svg
      ref={svg}
      data-studio="banner"
      viewBox={`0 0 ${size.width} ${size.height}`}
      className={className}
      role="img"
      aria-label="The banner"
      xmlns="http://www.w3.org/2000/svg"
      style={{ touchAction: drag ? "none" : undefined }}
      onPointerMove={onMove}
      onPointerUp={() => setDrag(null)}
      onPointerCancel={() => setDrag(null)}
      onPointerDown={() => !forExport && onSelect(null)}
    >
      <rect x="0" y="0" width={size.width} height={size.height} fill={background} />

      {ordered.map((layer) => (
        <g
          key={layer.id}
          onPointerDown={(event) => startMove(event, layer)}
          style={{
            cursor: forExport || layer.locked ? undefined : drag ? "grabbing" : "grab",
          }}
        >
          <Drawn layer={layer} />

          {/*
            An invisible rectangle over the layer's box, so it can be grabbed.

            SVG text only receives pointer events where a glyph is actually
            painted — so without this, dragging a headline meant hitting a
            letter exactly, and the space between two words did nothing. The
            same is true of a fitted image, which does not fill its own box.

            Drawn last so it sits above the artwork, and only while editing: the
            exported copy must be artwork and nothing else.
          */}
          {!forExport && (
            <rect
              x={layer.x}
              y={layer.y}
              width={layer.width}
              height={layer.height}
              fill="transparent"
            />
          )}
        </g>
      ))}

      {/* ------------------------------------------------- editing furniture */}

      {!forExport && showGuides && size.safe && (
        <rect
          x={safe.x}
          y={safe.y}
          width={safe.width}
          height={safe.height}
          fill="none"
          /*
            The guide has to be visible on whatever is behind it.

            It was a fixed near-black, which on the dark background a banner
            starts with was a black dotted line on a black rectangle — the one
            piece of help on the screen, invisible by default. `readableOn`
            already answers "what can be seen on this colour", so it answers
            this too.
          */
          stroke={readableOn(background)}
          strokeOpacity={0.55}
          strokeDasharray={`${size.height / 40} ${size.height / 50}`}
          strokeWidth={Math.max(1, size.height / 400)}
          pointerEvents="none"
        />
      )}

      {!forExport &&
        ordered
          .filter((layer) => layer.id === selectedId)
          .map((layer) => (
            <g key={`sel-${layer.id}`}>
              <rect
                x={layer.x}
                y={layer.y}
                width={layer.width}
                height={layer.height}
                fill="none"
                stroke="#2563eb"
                strokeWidth={Math.max(1.5, size.height / 300)}
                pointerEvents="none"
              />

              {/*
                The corner handle.

                Bottom-right only. Eight handles is what a full design tool
                offers and it is the wrong trade here: on a phone they overlap
                each other, and the two things somebody actually does to a
                banner layer are move it and change its size.
              */}
              <rect
                x={layer.x + layer.width - size.height / 28}
                y={layer.y + layer.height - size.height / 28}
                width={size.height / 22}
                height={size.height / 22}
                rx={size.height / 90}
                fill="#2563eb"
                style={{ cursor: "nwse-resize" }}
                onPointerDown={(event) => startResize(event, layer)}
              />
            </g>
          ))}
    </svg>
  );
}

/* ========================================================================== */

function Drawn({ layer }: { layer: Layer }) {
  if (layer.kind === "shape") {
    if (layer.shape === "circle") {
      return (
        <ellipse
          cx={layer.x + layer.width / 2}
          cy={layer.y + layer.height / 2}
          rx={layer.width / 2}
          ry={layer.height / 2}
          fill={layer.fill}
          opacity={layer.opacity}
        />
      );
    }

    return (
      <rect
        x={layer.x}
        y={layer.y}
        width={layer.width}
        height={layer.height}
        rx={layer.radius}
        fill={layer.fill}
        opacity={layer.opacity}
      />
    );
  }

  if (layer.kind === "image") {
    /*
      `preserveAspectRatio`, and it is the whole point.

      "meet" fits the entire picture inside the box and leaves space; "slice"
      fills the box and cuts. The standing rule in this estate is that an
      uploaded image is never cut, so `contain` is the default and `cover` is a
      deliberate act the review always mentions. Neither ever distorts.
    */
    return (
      <image
        x={layer.x}
        y={layer.y}
        width={layer.width}
        height={layer.height}
        href={layer.src}
        preserveAspectRatio={layer.fit === "cover" ? "xMidYMid slice" : "xMidYMid meet"}
      />
    );
  }

  const font = fontFor(layer.font);
  const lines = layer.text.split("\n");

  /* Anchored where the text is aligned, so a centred headline stays centred
     when its box is resized. */
  const anchor = layer.align === "center" ? "middle" : layer.align === "right" ? "end" : "start";
  const x =
    layer.align === "center"
      ? layer.x + layer.width / 2
      : layer.align === "right"
        ? layer.x + layer.width
        : layer.x;

  return (
    <text
      x={x}
      y={layer.y + layer.size}
      fill={layer.colour}
      fontFamily={font.stack}
      fontWeight={layer.weight}
      fontSize={layer.size}
      letterSpacing={layer.size * font.tracking}
      textAnchor={anchor}
    >
      {lines.map((line, index) => (
        <tspan key={index} x={x} dy={index === 0 ? 0 : layer.size * layer.lineHeight}>
          {line}
        </tspan>
      ))}
    </text>
  );
}
