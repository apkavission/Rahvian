"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Points } from "three";
import { AdditiveBlending, BufferAttribute, BufferGeometry, MathUtils } from "three";

/**
 * Closing scene — a rippling field.
 *
 * Deliberately nothing like the hero. The hero is a bounded object: a lattice
 * you look at from outside, dense and structural. This is an open plane
 * receding to the horizon, viewed from just above it.
 *
 * Opening on a system and closing on an open field is the point — the page
 * ends looking outward rather than repeating its own first image.
 *
 * One `Points` object, one draw call. Positions are written into a single
 * pre-allocated buffer each frame; nothing is allocated inside the loop.
 */

const COLUMNS = 68;
const ROWS = 34;
const SPACING = 0.185;

function accentColor(fallback = "#2dd4bf") {
  if (typeof window === "undefined") return fallback;
  const value = getComputedStyle(document.documentElement)
    .getPropertyValue("--accent")
    .trim();
  return value || fallback;
}

function Field({ color, quality }: { color: string; quality: number }) {
  const points = useRef<Points>(null);

  const columns = Math.round(COLUMNS * quality);
  const rows = Math.round(ROWS * quality);

  const { geometry, positions } = useMemo(() => {
    const positions = new Float32Array(columns * rows * 3);

    for (let x = 0; x < columns; x += 1) {
      for (let z = 0; z < rows; z += 1) {
        const i = (x * rows + z) * 3;
        positions[i] = (x - columns / 2) * SPACING;
        positions[i + 1] = 0;
        positions[i + 2] = (z - rows / 2) * SPACING;
      }
    }

    const geometry = new BufferGeometry();
    geometry.setAttribute("position", new BufferAttribute(positions, 3));
    return { geometry, positions };
  }, [columns, rows]);

  useEffect(() => () => geometry.dispose(), [geometry]);

  useFrame((state) => {
    const time = state.clock.elapsedTime;

    // Two waves at different frequencies and angles. A single sine reads as a
    // corrugated sheet; crossing two makes the surface feel alive without
    // needing noise, which would cost far more per point.
    for (let x = 0; x < columns; x += 1) {
      for (let z = 0; z < rows; z += 1) {
        const i = (x * rows + z) * 3;
        const px = positions[i];
        const pz = positions[i + 2];

        positions[i + 1] =
          Math.sin(px * 1.15 + time * 0.85) * 0.22 +
          Math.cos(pz * 0.9 - time * 0.6) * 0.16 +
          Math.sin((px + pz) * 0.55 + time * 0.4) * 0.1;
      }
    }

    geometry.attributes.position.needsUpdate = true;

    if (points.current) {
      points.current.rotation.y = MathUtils.lerp(
        points.current.rotation.y,
        state.pointer.x * 0.18,
        0.04,
      );
    }
  });

  return (
    <points ref={points} geometry={geometry} rotation={[-Math.PI / 2.55, 0, 0]}>
      <pointsMaterial
        size={0.032}
        color={color}
        transparent
        opacity={0.75}
        sizeAttenuation
        depthWrite={false}
        blending={AdditiveBlending}
        toneMapped={false}
      />
    </points>
  );
}

export default function WaveScene({ quality = 1 }: { quality?: number }) {
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
      camera={{ position: [0, 1.35, 4.4], fov: 46 }}
      dpr={[1, quality <= 0.4 ? 1 : quality < 1 ? 1.25 : 1.5]}
      gl={{ antialias: false, powerPreference: "high-performance", alpha: true }}
      style={{ pointerEvents: "none" }}
    >
      <Field color={color} quality={quality} />
    </Canvas>
  );
}
