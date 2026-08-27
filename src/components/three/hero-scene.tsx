"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import type { InstancedMesh, Group, LineSegments } from "three";
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  MathUtils,
  Object3D,
  Vector3,
} from "three";

/**
 * Hero scene — a connected system.
 *
 * The form is a lattice: nodes distributed evenly over a sphere, edges drawn
 * between neighbours, and a wave of light travelling through the structure.
 *
 * The concept is chosen rather than decorative. A software company sells
 * systems — parts connected so that a change in one place shows up in another
 * — and that is literally what is on screen. A distorted blob, the default
 * choice for this kind of hero, says nothing and is on a thousand other sites.
 *
 * Everything is drawn with two draw calls: one instanced mesh for the nodes,
 * one line-segment geometry for the edges. Node count and edge count are fixed
 * at build, so the per-frame cost is a matrix and a colour write per node and
 * nothing else.
 */

const NODE_COUNT = 88;
const RADIUS = 2.05;
/** Edges are drawn between nodes closer than this. Tuned to give a readable
 *  mesh — lower and it falls apart, higher and it turns into a solid ball. */
const LINK_DISTANCE = 0.92;

function accentColor(fallback = "#2dd4bf") {
  if (typeof window === "undefined") return fallback;
  const value = getComputedStyle(document.documentElement)
    .getPropertyValue("--accent")
    .trim();
  return value || fallback;
}

/**
 * Fibonacci sphere.
 *
 * Random points on a sphere clump visibly; this distributes them evenly, which
 * is what makes the lattice read as a structure rather than as noise.
 */
function fibonacciSphere(count: number, radius: number) {
  const points: Vector3[] = [];
  const golden = Math.PI * (3 - Math.sqrt(5));

  for (let i = 0; i < count; i += 1) {
    const y = 1 - (i / (count - 1)) * 2;
    const ring = Math.sqrt(1 - y * y);
    const theta = golden * i;
    points.push(
      new Vector3(Math.cos(theta) * ring, y, Math.sin(theta) * ring).multiplyScalar(
        radius,
      ),
    );
  }

  return points;
}

function Lattice({ color, quality }: { color: string; quality: number }) {
  const nodeCount = Math.max(36, Math.round(NODE_COUNT * quality));
  const group = useRef<Group>(null);
  const nodes = useRef<InstancedMesh>(null);
  const links = useRef<LineSegments>(null);

  // Geometry is computed once. Rebuilding it per frame would allocate on every
  // tick and is the usual reason scenes like this stutter.
  const { points, edgeGeometry } = useMemo(() => {
    const points = fibonacciSphere(nodeCount, RADIUS);
    const positions: number[] = [];

    for (let i = 0; i < points.length; i += 1) {
      for (let j = i + 1; j < points.length; j += 1) {
        if (points[i].distanceTo(points[j]) > LINK_DISTANCE) continue;
        positions.push(
          points[i].x, points[i].y, points[i].z,
          points[j].x, points[j].y, points[j].z,
        );
      }
    }

    const geometry = new BufferGeometry();
    geometry.setAttribute(
      "position",
      new BufferAttribute(new Float32Array(positions), 3),
    );

    return { points, edgeGeometry: geometry };
  }, [nodeCount]);

  useEffect(() => () => edgeGeometry.dispose(), [edgeGeometry]);

  // Scratch objects, allocated once and reused every frame.
  const dummy = useMemo(() => new Object3D(), []);
  const base = useMemo(() => new Color(), []);
  const lit = useMemo(() => new Color(), []);
  const scratch = useMemo(() => new Color(), []);

  useEffect(() => {
    base.set(color).multiplyScalar(0.35);
    lit.set(color);
  }, [color, base, lit]);

  useFrame((state, delta) => {
    const mesh = nodes.current;
    if (!mesh || !group.current) return;

    const time = state.clock.elapsedTime;

    // Pointer parallax, damped so a fast cursor move does not snap the scene.
    group.current.rotation.x = MathUtils.damp(
      group.current.rotation.x,
      -state.pointer.y * 0.35,
      2.4,
      delta,
    );
    group.current.rotation.y = MathUtils.damp(
      group.current.rotation.y,
      state.pointer.x * 0.45 + time * 0.11,
      2.4,
      delta,
    );

    // A plane of light sweeping through the lattice on a tilted axis. Nodes
    // near the plane brighten and swell, so the structure reads as something
    // signal is passing through rather than something merely spinning.
    const sweep = Math.sin(time * 0.55) * RADIUS * 1.15;
    const axisY = Math.sin(time * 0.21);
    const axisZ = Math.cos(time * 0.21);

    for (let i = 0; i < points.length; i += 1) {
      const point = points[i];
      const distance = Math.abs(point.y * axisY + point.z * axisZ - sweep);
      // 1 at the wavefront, 0 well away from it.
      const energy = Math.max(0, 1 - distance / 0.85) ** 2;

      dummy.position.copy(point);
      dummy.scale.setScalar(0.045 + energy * 0.075);
      dummy.rotation.set(time * 0.4 + i, time * 0.3 + i, 0);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);

      scratch.copy(base).lerp(lit, energy);
      mesh.setColorAt(i, scratch);
    }

    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;

    if (links.current) {
      // Edges breathe with the sweep, a beat behind the nodes.
      const material = links.current.material as { opacity: number };
      material.opacity = 0.1 + (Math.sin(time * 0.55) * 0.5 + 0.5) * 0.09;
    }
  });

  return (
    <group ref={group}>
      <instancedMesh ref={nodes} args={[undefined, undefined, nodeCount]}>
        <octahedronGeometry args={[1, 0]} />
        <meshBasicMaterial toneMapped={false} />
      </instancedMesh>

      <lineSegments ref={links} geometry={edgeGeometry}>
        <lineBasicMaterial
          color={color}
          transparent
          opacity={0.14}
          blending={AdditiveBlending}
          depthWrite={false}
        />
      </lineSegments>

      {/* Core. Gives the lattice a centre to be a shell around, and stops the
          middle of the form reading as empty from every angle. */}
      <mesh scale={0.42}>
        <icosahedronGeometry args={[1, 3]} />
        <meshBasicMaterial color={color} transparent opacity={0.07} />
      </mesh>
      <mesh scale={0.16}>
        <icosahedronGeometry args={[1, 2]} />
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>
    </group>
  );
}

export default function HeroScene({ quality = 1 }: { quality?: number }) {
  const [color, setColor] = useState("#2dd4bf");

  // The accent is a CSS variable, so it follows the theme and whatever
  // branding the admin has configured. Re-read it when the theme changes
  // rather than baking a colour into the scene.
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
      camera={{ position: [0, 0, 5.6], fov: 42 }}
      dpr={[1, quality <= 0.4 ? 1 : quality < 1 ? 1.25 : 1.5]}
      gl={{ antialias: false, powerPreference: "high-performance", alpha: true }}
      style={{ pointerEvents: "none" }}
    >
      <Lattice color={color} quality={quality} />
    </Canvas>
  );
}
