"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * WebGL is loaded lazily, and only where running a render loop is a good idea.
 *
 * `ssr: false` keeps three.js out of the server bundle and out of the initial
 * client bundle — it is fetched after hydration, so it never delays first
 * paint and is never measured as LCP.
 */
const LatticeScene = dynamic(() => import("@/components/three/hero-scene"), {
  ssr: false,
});
const WaveScene = dynamic(() => import("@/components/three/wave-scene"), {
  ssr: false,
});
const AssembleScene = dynamic(() => import("@/components/three/assemble-scene"), {
  ssr: false,
});
const VisionScene = dynamic(() => import("@/components/three/vision-scene"), {
  ssr: false,
});

export type SceneName = "assemble" | "lattice" | "vision" | "wave";

const SCENES = {
  assemble: AssembleScene,
  lattice: LatticeScene,
  vision: VisionScene,
  wave: WaveScene,
} as const;

/**
 * Whether to run WebGL, and at what quality.
 *
 * Returns 0 for "do not render at all", otherwise a quality multiplier. Small
 * screens get a reduced scene rather than none: a phone can comfortably draw
 * these, it simply should not be asked to draw the desktop version.
 *
 * Re-evaluated on resize, because a browser window dragged from narrow to wide
 * should upgrade rather than stay stuck at whatever it was on first paint.
 */
function useSceneQuality() {
  const [quality, setQuality] = useState(0);

  useEffect(() => {
    const evaluate = () => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        return setQuality(0);
      }

      // Fewer than four cores is a low-power device; a render loop there costs
      // battery and heat for a decoration.
      if ((navigator.hardwareConcurrency ?? 4) < 4) return setQuality(0);

      const connection = (
        navigator as Navigator & { connection?: { saveData?: boolean } }
      ).connection;
      if (connection?.saveData) return setQuality(0);

      // Probe WebGL2, then release the context immediately — holding a spare
      // one counts against the browser's small per-page limit.
      const canvas = document.createElement("canvas");
      const gl = canvas.getContext("webgl2");
      if (!gl) return setQuality(0);
      gl.getExtension("WEBGL_lose_context")?.loseContext();

      // Phones run the scene too, at a reduced fragment count and device pixel
      // ratio. One instanced draw call at this size is well within a modern
      // handset's budget, and the scene unmounts the moment it scrolls away —
      // so the cost is bounded to the time it is actually on screen.
      const width = window.innerWidth;
      if (width < 360) return setQuality(0);
      if (width < 640) return setQuality(0.4);
      setQuality(width < 1024 ? 0.65 : 1);
    };

    evaluate();

    let frame = 0;
    const onResize = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(evaluate);
    };

    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(frame);
    };
  }, []);

  return quality;
}

/**
 * Mount only while on screen and while the tab is in front.
 *
 * A render loop behind another tab, or below the fold, is battery spent on
 * something nobody is looking at. Unmounting also guarantees the hero and the
 * closing scene never hold two WebGL contexts at once.
 */
function useIsActive(ref: React.RefObject<HTMLElement | null>) {
  const [inView, setInView] = useState(false);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting),
      { threshold: 0.01 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [ref]);

  useEffect(() => {
    const onVisibility = () => setVisible(!document.hidden);
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  return inView && visible;
}

export function SceneMount({
  scene,
  className,
  /** Static treatment shown before, and instead of, WebGL. */
  fallback = "orbits",
}: {
  scene: SceneName;
  className?: string;
  fallback?: "orbits" | "glow" | "none";
}) {
  const container = useRef<HTMLDivElement>(null);
  const quality = useSceneQuality();
  const active = useIsActive(container);

  const Scene = SCENES[scene] ?? SCENES.lattice;

  return (
    <div
      ref={container}
      aria-hidden
      className={cn("relative [opacity:var(--scene-opacity)]", className)}
    >
      {/* Static treatment. On devices that never load WebGL this is the entire
          visual, so it has to look like a decision rather than a failure. */}
      {fallback !== "none" && (
        <div className="absolute inset-0 grid place-items-center">
          <div className="size-[68%] rounded-full bg-[radial-gradient(circle_at_38%_32%,var(--accent),transparent_62%)] opacity-40 blur-2xl" />
          {fallback === "orbits" && (
            <>
              <div className="absolute size-[44%] rounded-full border border-accent/20" />
              <div className="absolute size-[62%] rounded-full border border-accent/10" />
            </>
          )}
        </div>
      )}

      {quality > 0 && active && (
        <div className="absolute inset-0 animate-[fade-in_700ms_var(--ease-out)_both]">
          <Scene quality={quality} />
        </div>
      )}
    </div>
  );
}
