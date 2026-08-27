"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
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
    document.startViewTransition(commit);
    return;
  }

  commit();
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Initialised to "system" on both server and client so hydration matches.
  // The real stored value is read in the effect below. The visible theme is
  // already correct by then, because the blocking script in <head> set it.
  const [mode, setModeState] = useState<ThemeMode>("system");
  const [resolved, setResolved] = useState<ResolvedTheme>("light");

  useEffect(() => {
    const stored = readStoredMode();
    setModeState(stored);
    setResolved(stored === "system" ? systemTheme() : stored);
  }, []);

  // Follow the operating system while the visitor has made no explicit choice.
  useEffect(() => {
    if (mode !== "system") return;

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      const next = media.matches ? "dark" : "light";
      setResolved(next);
      applyTheme(next, true);
    };

    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [mode]);

  // Keep other tabs in sync.
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== THEME_STORAGE_KEY) return;
      const next = isThemeMode(event.newValue) ? event.newValue : "system";
      setModeState(next);
      const nextResolved = next === "system" ? systemTheme() : next;
      setResolved(nextResolved);
      applyTheme(nextResolved, false);
    };

    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const setMode = useCallback((next: ThemeMode) => {
    setModeState(next);

    try {
      if (next === "system") {
        window.localStorage.removeItem(THEME_STORAGE_KEY);
      } else {
        window.localStorage.setItem(THEME_STORAGE_KEY, next);
      }
    } catch {
      // Storage unavailable. The theme still applies for this page view.
    }

    const nextResolved = next === "system" ? systemTheme() : next;
    setResolved(nextResolved);
    applyTheme(nextResolved, true);
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
