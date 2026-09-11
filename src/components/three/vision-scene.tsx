"use client";

/*
  This file is exempt from `react-hooks/immutability`, and only this file.

  The frame loop below does the one thing that rule exists to prevent: it
  writes into a `Float32Array` and sets `needsUpdate` on a `BufferGeometry`,
  sixty times a second, from inside `useFrame`. That is not a bug being
  excused — it is how react-three-fiber works. The buffer is GPU memory, and
  the entire point is to mutate it in place rather than allocate a new one on
  every frame; a scene written the way the rule wants would allocate several
  megabytes a second and drop the mobile performance budget in ground rule 4.

  The React Compiler cannot see that distinction, and its own `"use no memo"`
  directive does not silence this rule. So the exemption is stated here, once,
  with its reason, rather than as three unexplained inline disables.
*/
/* eslint-disable react-hooks/immutability -- see the note above */


import { Canvas, useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Points } from "three";
import { AdditiveBlending, BufferAttribute, BufferGeometry } from "three";

/**
 * Loader scene — a gaze, and the arrow it follows.
 *
 * The mark is a rising arrow, so the wait
 * animates the two things that name means: someone looking, and a direction.
 *
 * An elliptical field of points reads as an iris. It drifts on a slow path,
 * the way an eye does when it is watching something rather than staring, and
 * every few seconds it blinks — the vertical axis collapses and reopens. A
 * blink is what makes a shape read as *someone* looking; without it the same
 * ellipse is a decoration.
 *
 * Through it, an arrow draws itself from lower left to upper right and fades,
 * matching the one in the logo above it. That is the loop: look, then move.
 *
 * One `Points` object holding both sets, so the whole scene is a single draw
 * call. Positions are written into a pre-allocated buffer each frame; nothing
 * is allocated inside the loop.
 */

const IRIS_RINGS = 5;
const IRIS_PER_RING = 84;
const ARROW_POINTS = 132;

/** Seconds: look, blink, arrow, repeat. */
const CYCLE = 6.5;

function accentColor(fallback = "#2dd4bf") {
  if (typeof window === "undefined") return fallback;
  const value = getComputedStyle(document.documentElement)
    .getPropertyValue("--accent")
    .trim();
  return value || fallback;
}

/**
 * The arrow from the mark, as a list of points along its outline.
 *
 * Sampled rather than modelled: a shaft and two barbs are three line segments,
 * and describing them here means the shape follows the logo without shipping
 * geometry or an exporter.
 */
function arrowPath(t: number): [number, number] {
  // Shaft for the first 62% of the path, then the two barbs back from the tip.
  const tipX = 1.15;
  const tipY = 0.92;

  if (t < 0.62) {
    const k = t / 0.62;
    return [-1.15 + k * (tipX + 1.15), -0.92 + k * (tipY + 0.92)];
  }
  if (t < 0.81) {
    const k = (t - 0.62) / 0.19;
    return [tipX - k * 0.62, tipY];
  }
  const k = (t - 0.81) / 0.19;
  return [tipX, tipY - k * 0.62];
}

function Field({ color, quality }: { color: string; quality: number }) {
  const points = useRef<Points>(null);

  const rings = Math.max(3, Math.round(IRIS_RINGS * quality));
  const perRing = Math.max(36, Math.round(IRIS_PER_RING * quality));
  const arrowCount = Math.max(48, Math.round(ARROW_POINTS * quality));
  const irisCount = rings * perRing;

  const { geometry, positions, seeds } = useMemo(() => {
    const total = irisCount + arrowCount;
    const positions = new Float32Array(total * 3);

    // Per-point constants: the iris keeps its angle and radius, the arrow its
    // position along the path. Both are fixed for the life of the scene.
    const seeds = new Float32Array(total * 2);

    for (let ring = 0; ring < rings; ring += 1) {
      const radius = 0.5 + (ring / Math.max(1, rings - 1)) * 0.95;
      for (let i = 0; i < perRing; i += 1) {
        const index = ring * perRing + i;
        // The offset per ring stops the points lining up into spokes.
        const angle = (i / perRing) * Math.PI * 2 + ring * 0.37;
        seeds[index * 2] = angle;
        seeds[index * 2 + 1] = radius;
      }
    }

    for (let i = 0; i < arrowCount; i += 1) {
      const index = irisCount + i;
      seeds[index * 2] = i / (arrowCount - 1);
      seeds[index * 2 + 1] = -1; // marks an arrow point
    }

    const geometry = new BufferGeometry();
    geometry.setAttribute("position", new BufferAttribute(positions, 3));
    return { geometry, positions, seeds };
  }, [rings, perRing, arrowCount, irisCount]);

  useEffect(() => () => geometry.dispose(), [geometry]);

  useFrame((state) => {
    const time = state.clock.elapsedTime;
    const phase = (time % CYCLE) / CYCLE;

    // The gaze. A slow two-frequency drift, so the eye never repeats the same
    // path exactly within a wait anyone will sit through.
    const gazeX = Math.sin(time * 0.42) * 0.22 + Math.sin(time * 0.17) * 0.1;
    const gazeY = Math.cos(time * 0.31) * 0.13;

    // The blink. A brief squash near the end of the look, before the arrow.
    const blinkAt = 0.52;
    const distance = Math.abs(phase - blinkAt);
    const blink = distance < 0.05 ? 0.12 + (distance / 0.05) * 0.88 : 1;

    const breathe = 1 + Math.sin(time * 1.1) * 0.035;

    for (let i = 0; i < irisCount; i += 1) {
      const angle = seeds[i * 2];
      const radius = seeds[i * 2 + 1] * breathe;
      const p = i * 3;

      positions[p] = gazeX + Math.cos(angle + time * 0.12) * radius;
      // 0.62 makes the circle an eye rather than a target.
      positions[p + 1] = gazeY + Math.sin(angle + time * 0.12) * radius * 0.62 * blink;
      positions[p + 2] = 0;
    }

    // The arrow draws itself over the second half of the cycle and fades by
    // retreating in z, which costs nothing and keeps one material for both.
    const drawStart = 0.58;
    const drawEnd = 0.92;
    const progress =
      phase < drawStart ? 0 : Math.min(1, (phase - drawStart) / (drawEnd - drawStart));

    for (let i = 0; i < arrowCount; i += 1) {
      const index = irisCount + i;
      const t = seeds[index * 2];
      const p = index * 3;
      const [x, y] = arrowPath(t);

      if (progress === 0 || t > progress) {
        // Not drawn yet: parked far behind the camera, where it cannot be seen
        // and costs nothing beyond its slot in the buffer.
        positions[p] = 0;
        positions[p + 1] = 0;
        positions[p + 2] = -40;
        continue;
      }

      positions[p] = x;
      positions[p + 1] = y;
      positions[p + 2] = 0.15;
    }

    geometry.attributes.position.needsUpdate = true;
  });

  return (
    <points ref={points} geometry={geometry}>
      <pointsMaterial
        size={0.035}
        color={color}
        transparent
        opacity={0.7}
        sizeAttenuation
        depthWrite={false}
        blending={AdditiveBlending}
        toneMapped={false}
      />
    </points>
  );
}

export default function VisionScene({ quality = 1 }: { quality?: number }) {
  const [color, setColor] = useState("#2dd4bf");

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

  return (
    <Canvas
      camera={{ position: [0, 0, 3.4], fov: 46 }}
      dpr={[1, quality <= 0.4 ? 1 : quality < 1 ? 1.25 : 1.5]}
      gl={{ antialias: false, powerPreference: "high-performance", alpha: true }}
      style={{ pointerEvents: "none" }}
    >
      <Field color={color} quality={quality} />
    </Canvas>
  );
}
