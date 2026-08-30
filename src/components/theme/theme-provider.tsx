"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useSyncExternalStore,
} from "react";
import {
  THEME_ATTRIBUTE,
  THEME_STORAGE_KEY,
  isThemeMode,
  type ThemeMode,
} from "@/lib/theme/constants";

type ResolvedTheme = "light" | "dark";

interface ThemeContextValue {
  /** What the visitor chose. "system" means follow the operating system. */
  mode: ThemeMode;
  /** What is actually on screen. Never "system". */
  resolved: ResolvedTheme;
  setMode: (mode: ThemeMode) => void;
  /** Cycles light → dark → light. Ignores "system" as an intermediate step. */
  toggle: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function systemTheme(): ResolvedTheme {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function readStoredMode(): ThemeMode {
  if (typeof window === "undefined") return "system";
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    return isThemeMode(stored) ? stored : "system";
  } catch {
    return "system";
  }
}

/**
 * Applies the theme to <html>.
 *
 * The View Transitions API turns the switch into a 200ms cross-fade where the
 * browser supports it. Where it does not, the change is instant — which is a
 * perfectly good outcome, so there is no fallback animation to maintain.
 */
function applyTheme(resolved: ResolvedTheme, animate: boolean) {
  const root = document.documentElement;

  const commit = () => {
    root.setAttribute(THEME_ATTRIBUTE, resolved);
    root.style.colorScheme = resolved;
  };

  const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;

  if (
    animate &&
    !prefersReducedMotion &&
    "startViewTransition" in document &&
    typeof document.startViewTransition === "function"
  ) {
    /*
      The promises a view transition hands back can reject.

      `.finished` rejects with an `AbortError` whenever the transition is
      skipped — another one starting, or the page navigating away — and with
      nothing attached that becomes an **unhandled rejection**, which Next logs
      as an error on every occurrence. Nothing is wrong when it happens: a
      skipped cross-fade is a cross-fade that did not need to run. Swallowed
      here rather than left to be reported as a fault.
    */
    document.startViewTransition(commit).finished.catch(() => {});
    return;
  }

  commit();
}

/*
  Two external stores, and then the theme is derived rather than stored.

  What the visitor chose lives in `localStorage`; what the operating system
  says lives in `matchMedia`. Both are browser state that React does not own,
  and `useSyncExternalStore` is the hook for exactly that — it reads a snapshot
  during render, so the value is right on the first one, and it takes a
  separate server snapshot, so there is no hydration mismatch to paper over.

  What that replaces is a mount effect that read `localStorage` and called two
  setters. That worked, and it cost a second render on every page load and a
  React Compiler error — `setState` in an effect body — which is the compiler
  being right rather than pedantic.

  `resolved` is now derived during render from the two stores, so it cannot
  disagree with them. Previously it was a third piece of state kept in step by
  hand in four places; the version of this file where one of those four was
  missed is the bug this shape makes impossible.
*/

/** Same-tab writes, which the `storage` event deliberately does not report. */
const modeListeners = new Set<() => void>();

function announceModeChange() {
  for (const listener of modeListeners) listener();
}

function subscribeToMode(onChange: () => void) {
  modeListeners.add(onChange);

  // And other tabs, which is what `storage` does report.
  const onStorage = (event: StorageEvent) => {
    if (event.key === THEME_STORAGE_KEY) onChange();
  };
  window.addEventListener("storage", onStorage);

  return () => {
    modeListeners.delete(onChange);
    window.removeEventListener("storage", onStorage);
  };
}

function subscribeToSystem(onChange: () => void) {
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}

/** The server has no storage and no display. "system" and light are the safe pair. */
const serverMode = (): ThemeMode => "system";
const serverSystemTheme = (): ResolvedTheme => "light";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const mode = useSyncExternalStore(subscribeToMode, readStoredMode, serverMode);
  const system = useSyncExternalStore(subscribeToSystem, systemTheme, serverSystemTheme);

  const resolved: ResolvedTheme = mode === "system" ? system : mode;

  /*
    Push the resolved theme onto <html>.

    An effect is the correct tool here and not a smell: it updates an external
    system — the document — with the latest state, which is what effects are
    for. It sets no state of its own.

    The first run is deliberately not animated. The blocking script in <head>
    has already stamped the same attribute before the first paint, so this pass
    is confirming what is on screen rather than changing it, and cross-fading a
    page into the colours it is already wearing is a flicker for nothing.
  */
  const applied = useRef(false);

  useEffect(() => {
    /*
      The effect reads the truth itself rather than trusting the render.

      `useSyncExternalStore` deliberately uses the *server* snapshot while React
      hydrates — "system", and light — so the first committed value of
      `resolved` is a placeholder, not the visitor's theme. Applying it
      overwrote what the blocking head script had already painted, and the real
      value arrived a frame later and animated back: measured on 2026-08-28 as
      **dark → light → dark over about 50ms**, with two view transitions and an
      unhandled rejection each time.

      Two fixes were tried before this one and both were wrong. Skipping the
      first run does not survive React Strict Mode, which invokes an effect,
      cleans it up and invokes it again on the same mount — so the "second" run
      was still the placeholder, and it applied light and stayed there. That
      version made the bug worse, which is why it was measured rather than
      assumed.

      Reading `localStorage` and the media query here sidesteps the whole
      question: this cannot see a placeholder, because it does not look at one.
      And nothing is written when the attribute already says the right thing,
      so a re-invoked effect is free and the head script's paint is never
      disturbed.
    */
    const stored = readStoredMode();
    const truth: ResolvedTheme = stored === "system" ? systemTheme() : stored;

    if (document.documentElement.getAttribute(THEME_ATTRIBUTE) === truth) {
      applied.current = true;
      return;
    }

    // Animated from the second application onwards. The first is either the
    // head script's own paint or a correction to it, and cross-fading a page
    // into the colours it is already wearing is a flicker for nothing.
    applyTheme(truth, applied.current);
    applied.current = true;
  }, [resolved]);

  const setMode = useCallback((next: ThemeMode) => {
    try {
      if (next === "system") {
        window.localStorage.removeItem(THEME_STORAGE_KEY);
      } else {
        window.localStorage.setItem(THEME_STORAGE_KEY, next);
      }
    } catch {
      // Storage unavailable — a privacy mode, usually. The choice still
      // applies for this page view; it simply will not survive a reload.
    }

    /*
      Storage is the source of truth, so the write comes first and this is what
      tells React to read it again — which re-runs the effect above, which
      applies it.

      Deliberately not applied here as well. Two places writing the attribute is
      two places that can disagree about whether to animate, and the effect
      already has to exist for the cross-tab and system-preference cases.
    */
    announceModeChange();
  }, []);

  const toggle = useCallback(() => {
    setMode(resolved === "dark" ? "light" : "dark");
  }, [resolved, setMode]);

  const value = useMemo(
    () => ({ mode, resolved, setMode, toggle }),
    [mode, resolved, setMode, toggle],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used inside a ThemeProvider");
  }
  return context;
}
