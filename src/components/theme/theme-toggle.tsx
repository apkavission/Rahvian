"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "@/components/theme/theme-provider";
import { THEME_MODES, type ThemeMode } from "@/lib/theme/constants";
import { cn } from "@/lib/utils";

const ICONS: Record<ThemeMode, typeof Sun> = {
  light: Sun,
  dark: Moon,
  system: Monitor,
};

const LABELS: Record<ThemeMode, string> = {
  light: "Light",
  dark: "Dark",
  system: "System",
};

/**
 * Three-state theme control.
 *
 * A segmented control rather than a single toggle, because "follow my system"
 * is a real preference and hiding it behind a two-way switch loses it.
 * The active segment is marked with aria-checked so screen readers get the
 * same information the highlight conveys visually.
 */
export function ThemeToggle({ className }: { className?: string }) {
  const { mode, setMode } = useTheme();

  return (
    <div
      role="radiogroup"
      aria-label="Colour theme"
      className={cn(
        "inline-flex items-center gap-0.5 rounded-full border border-border bg-surface-2 p-0.5",
        className,
      )}
    >
      {THEME_MODES.map((value) => {
        const Icon = ICONS[value];
        const active = mode === value;

        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={LABELS[value]}
            title={LABELS[value]}
            onClick={() => setMode(value)}
            className={cn(
              "grid size-7 place-items-center rounded-full transition-colors",
              "duration-[--duration-fast] ease-[--ease-out]",
              active
                ? "bg-surface text-text shadow-[var(--shadow-1)]"
                : "text-text-subtle hover:text-text",
            )}
          >
            <Icon className="size-3.5" aria-hidden />
          </button>
        );
      })}
    </div>
  );
}
