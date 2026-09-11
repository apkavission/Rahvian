"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Group, InstancedMesh } from "three";
import { Color, MathUtils, Object3D } from "three";

/**
 * Hero scene — fragments resolving into the brand name.
 *
 * Scattered pieces drift in disorder, converge into the words, hold while a
 * pulse of light sweeps through the letterforms, then break apart and repeat.
 *
 * The metaphor is the pitch: a business arrives with work scattered across
 * spreadsheets, chats and paper, and what it buys is the same material
 * arranged into something that reads. Watching that happen lands faster than
 * a paragraph saying it.
 *
 * The letterforms are sampled from a 2D canvas at runtime rather than shipped
 * as a model. That means the word is a prop — it follows a rename with a
 * one-line change and needs no 3D asset, no exporter and no extra download.
 *
 * One instanced mesh, one draw call.
 */

/** Seconds for assemble, hold, disperse, repeat. */
const CYCLE = 8;
const MAX_FRAGMENTS = 620;

function accentColor(fallback = "#2dd4bf") {
  if (typeof window === "undefined") return fallback;
  const value = getComputedStyle(document.documentElement)
    .getPropertyValue("--accent")
    .trim();
  return value || fallback;
}

interface Point {
  x: number;
  y: number;
}

/**
 * Sample the words into points by rasterising them and reading the pixels.
 *
 * Sampling on a fixed grid rather than randomly keeps the density even, which
 * is what makes the letters legible; random sampling leaves holes in the
 * strokes at this fragment count.
 */
interface Sampled {
  /** Points normalised so the text bounding box spans x in [-0.5, 0.5]. */
  points: Point[];
  /** Height divided by width of the text bounding box. */
  aspect: number;
}

function sampleText(lines: string[], maxPoints: number): Sampled {
  const WIDTH = 640;
  const HEIGHT = 320;

  const canvas = document.createElement("canvas");
  canvas.width = WIDTH;
  canvas.height = HEIGHT;

  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return { points: [], aspect: 1 };

  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  const lineHeight = HEIGHT / (lines.length + 0.6);
  let fontSize = lineHeight * 0.92;

  // Shrink until the widest line fits with a margin. Measuring rather than
  // guessing means a longer name cannot overflow the canvas and lose letters.
  ctx.font = `700 ${fontSize}px Sora, system-ui, sans-serif`;
  const widest = Math.max(...lines.map((line) => ctx.measureText(line).width));
  if (widest > WIDTH * 0.88) {
    fontSize *= (WIDTH * 0.88) / widest;
    ctx.font = `700 ${fontSize}px Sora, system-ui, sans-serif`;
  }

  ctx.letterSpacing = `${fontSize * 0.06}px`;

  lines.forEach((line, index) => {
    const y = HEIGHT / 2 + (index - (lines.length - 1) / 2) * lineHeight;
    ctx.fillText(line, WIDTH / 2, y);
  });

  const { data } = ctx.getImageData(0, 0, WIDTH, HEIGHT);
  const points: Point[] = [];

  // Step is derived from the target count so the sample lands near maxPoints
  // whatever the word length, instead of being tuned by hand per name.
  const step = Math.max(3, Math.round(Math.sqrt((WIDTH * HEIGHT) / (maxPoints * 5))));

  let minX = WIDTH;
  let maxX = 0;
  let minY = HEIGHT;
  let maxY = 0;

  for (let py = 0; py < HEIGHT; py += step) {
    for (let px = 0; px < WIDTH; px += step) {
      if (data[(py * WIDTH + px) * 4 + 3] < 128) continue;
      points.push({ x: px, y: py });
      if (px < minX) minX = px;
      if (px > maxX) maxX = px;
      if (py < minY) minY = py;
      if (py > maxY) maxY = py;
    }
  }

  if (points.length === 0) return { points: [], aspect: 1 };

  // Normalise against the ink, not the canvas. Measuring the actual glyph
  // bounds is what lets the caller scale the word to any viewport without a
  // letter ever falling outside it — the bug this replaced clipped the first
  // and last character on narrow containers.
  const width = Math.max(1, maxX - minX);
  const height = Math.max(1, maxY - minY);
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;

  return {
    points: points.slice(0, maxPoints).map((p) => ({
      x: (p.x - cx) / width,
      y: -(p.y - cy) / width,
    })),
    aspect: height / width,
  };
}

/** Smootherstep — settles at both ends instead of bouncing. */
function ease(t: number) {
  return t * t * t * (t * (t * 6 - 15) + 10);
}

function Fragments({
  color,
  points,
  aspect,
}: {
  color: string;
  points: Point[];
  aspect: number;
}) {
  const group = useRef<Group>(null);
  const mesh = useRef<InstancedMesh>(null);
  const count = points.length;

  // Fit the word to whatever space the canvas actually has. `viewport` is in
  // world units and updates on resize, so the same scene reads correctly on a
  // phone, a tablet and a desktop without a breakpoint anywhere.
  const { viewport } = useThree();
  const fit = Math.min(
    viewport.width * 0.92,
    (viewport.height * 0.82) / Math.max(aspect, 0.001),
  );
  const fragmentSize = fit * 0.0125;

  const chaos = useMemo(() => {
    // Deterministic pseudo-random, so the scattered state is stable and does
    // not reshuffle every time the theme changes.
    const random = (seed: number) => {
      const value = Math.sin(seed * 12.9898) * 43758.5453;
      return value - Math.floor(value);
    };

    return Array.from({ length: count }, (_, i) => ({
      x: (random(i + 1) - 0.5) * 8.5,
      y: (random(i + 41) - 0.5) * 5.2,
      z: (random(i + 97) - 0.5) * 4,
      rx: random(i + 211) * Math.PI,
      ry: random(i + 251) * Math.PI,
      rz: random(i + 307) * Math.PI,
      scale: 0.03 + random(i + 353) * 0.05,
      // Per-fragment lag, so the word resolves letter by letter rather than
      // snapping into place all at once.
      lag: random(i + 401),
    }));
  }, [count]);

  const dummy = useMemo(() => new Object3D(), []);
  const dim = useMemo(() => new Color(), []);
  const bright = useMemo(() => new Color(), []);
  const flare = useMemo(() => new Color(), []);
  const scratch = useMemo(() => new Color(), []);

  useEffect(() => {
    dim.set(color).multiplyScalar(0.3);
    bright.set(color);
    flare.set("#ffffff").lerp(bright, 0.35);
  }, [color, dim, bright, flare]);

  useFrame((state, delta) => {
    const instances = mesh.current;
    if (!instances || !group.current) return;

    const time = state.clock.elapsedTime;
    const phase = (time % CYCLE) / CYCLE;

    // assemble 0 - 0.30 | hold 0.30 - 0.72 | disperse 0.72 - 1
    let progress: number;
    let held = 0;
    if (phase < 0.3) {
      progress = phase / 0.3;
    } else if (phase < 0.72) {
      progress = 1;
      held = (phase - 0.3) / 0.42;
    } else {
      progress = 1 - (phase - 0.72) / 0.28;
    }

    group.current.rotation.x = MathUtils.damp(
      group.current.rotation.x,
      -state.pointer.y * 0.12,
      2.4,
      delta,
    );
    group.current.rotation.y = MathUtils.damp(
      group.current.rotation.y,
      state.pointer.x * 0.2,
      2.4,
      delta,
    );

    // The "something happens" beat: once the word is formed, a band of light
    // crosses it left to right. Without it the hold reads as a freeze.
    const sweepX = MathUtils.lerp(-fit * 0.55, fit * 0.55, MathUtils.clamp(held * 1.5 - 0.15, 0, 1));
    const sweeping = held > 0.05 && held < 0.85;

    for (let i = 0; i < count; i += 1) {
      const from = chaos[i];
      const to = points[i];

      const k = ease(MathUtils.clamp((progress - from.lag * 0.3) / 0.7, 0, 1));

      const targetX = to.x * fit;
      const targetY = to.y * fit;

      dummy.position.set(
        MathUtils.lerp(from.x, targetX, k),
        MathUtils.lerp(from.y, targetY, k),
        MathUtils.lerp(from.z, 0, k),
      );

      const pulse = sweeping
        ? Math.max(0, 1 - Math.abs(targetX - sweepX) / (fit * 0.09)) ** 2
        : 0;

      const size = MathUtils.lerp(from.scale * fragmentSize * 18, fragmentSize, k) *
        (1 + pulse * 0.85);
      dummy.scale.setScalar(size);

      // Tumbling unwinds as a fragment finds its place.
      dummy.rotation.set(
        (from.rx + time * 0.5) * (1 - k),
        (from.ry + time * 0.4) * (1 - k),
        (from.rz + time * 0.3) * (1 - k),
      );

      dummy.updateMatrix();
      instances.setMatrixAt(i, dummy.matrix);

      scratch.copy(dim).lerp(bright, k);
      if (pulse > 0) scratch.lerp(flare, pulse);
      instances.setColorAt(i, scratch);
    }

    instances.instanceMatrix.needsUpdate = true;
    if (instances.instanceColor) instances.instanceColor.needsUpdate = true;
  });

  return (
    <group ref={group}>
      <instancedMesh ref={mesh} args={[undefined, undefined, count]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial toneMapped={false} transparent opacity={0.95} />
      </instancedMesh>
    </group>
  );
}

export default function AssembleScene({
  quality = 1,
  /** The word the fragments resolve into. One entry per line. */
  lines = ["RAHVIAN", "TECHNOLOGIES"],
}: {
  quality?: number;
  lines?: string[];
}) {
  const [color, setColor] = useState("#2dd4bf");
  const [sampled, setSampled] = useState<Sampled>({ points: [], aspect: 1 });

  useEffect(() => {
    const sync = () => setColor(accentColor());
    sync();

    const observer = new MutationObserver(sync);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });
    return () => observer.disconnect();
  }, []);

  /*
    The words, serialised, because this effect must depend on what they say
    and not on which array said it.

    `lines` is a fresh array on every render — from the default above when the
    caller omits it, and from the literal at the call site when it does not.
    As a dependency it therefore differed every single time: the effect ran,
    set `sampled` to a new object, that re-rendered, the render built another
    array, and the effect ran again. Measured on 2026-08-31 as 2,320 renders
    and 1,160 rasterisations in seven seconds, from mount, with nothing
    touched.

    Nothing reported it. The scene looked correct, the build was clean and all
    259 unit tests passed, because none of them can see a component that
    arrives at the right answer over and over. What it cost was the whole main
    thread: an input dispatch swallowed roughly once in fifteen — written up in
    `playwright.config.ts` as a Playwright flake and in `e2e/theme.spec.ts` as
    an open question, and neither was — and, when a theme change asked that
    thread for a view transition on top, Chrome's "Page Unresponsive" on the
    deployed site.

    Keying on the text fixes it at the source rather than at this one call
    site: any caller may pass a literal and none of them can start this again.
  */
  const wordmark = JSON.stringify(lines);

  useEffect(() => {
    let cancelled = false;

    // Wait for the display face. Sampling before it loads rasterises the
    // fallback, and the letterforms would be visibly wrong.
    document.fonts.ready.then(() => {
      if (cancelled) return;
      setSampled(
        sampleText(JSON.parse(wordmark) as string[], Math.round(MAX_FRAGMENTS * quality)),
      );
    });

    return () => {
      cancelled = true;
    };
  }, [wordmark, quality]);

  if (sampled.points.length === 0) return null;

  return (
    <Canvas
      camera={{ position: [0, 0, 4.6], fov: 42 }}
      dpr={[1, quality <= 0.4 ? 1 : quality < 1 ? 1.25 : 1.5]}
      gl={{ antialias: false, powerPreference: "high-performance", alpha: true }}
      style={{ pointerEvents: "none" }}
    >
      <Fragments color={color} points={sampled.points} aspect={sampled.aspect} />
    </Canvas>
  );
}
