"use client";

import { useMemo, useState } from "react";
import { ADMIN_NAV, type AdminNavItem, type MenuKey } from "@/components/admin/nav";
import { cn } from "@/lib/utils";

/**
 * The menu, as a set of ticks.
 *
 * One component for both uses on this screen, because they are the same
 * question asked at two levels: which screens does this **role** carry by
 * default, and which screens does this **person** reach. Two components would
 * be two answers to "what does ticking this mean", and the second one always
 * drifts.
 *
 * Grouped exactly as the sidebar is grouped, in the same order, so what is
 * being ticked is recognisably the thing that will appear on the left.
 *
 * Uncontrolled by design: the ticks are real checkboxes with a `name`, so the
 * whole set posts as repeated form values and no JSON has to be assembled to
 * submit them. State is kept only to redraw the annotations.
 */
export function MenuChecklist({
  name,
  items,
  selected,
  /** Screens the role already carries. Ticks that differ from it are annotated. */
  baseline,
  legend,
  hint,
  disabled,
}: {
  /** The form field name each tick posts under. */
  name: string;
  /** Which screens may be ticked here. */
  items: AdminNavItem[];
  selected: string[];
  baseline?: string[];
  legend: string;
  hint: string;
  disabled?: boolean;
}) {
  const [ticked, setTicked] = useState<Set<string>>(() => new Set(selected));

  const allowed = useMemo(() => new Set(items.map((item) => item.key)), [items]);
  const base = useMemo(() => new Set(baseline ?? []), [baseline]);

  const groups = ADMIN_NAV.map((group) => ({
    label: group.label,
    items: group.items.filter((item) => allowed.has(item.key)),
  })).filter((group) => group.items.length > 0);

  function toggle(key: MenuKey, on: boolean) {
    setTicked((previous) => {
      const next = new Set(previous);
      if (on) next.add(key);
      else next.delete(key);
      return next;
    });
  }

  return (
    <fieldset disabled={disabled}>
      <legend className="font-mono text-[0.65rem] uppercase tracking-[0.16em] text-text-subtle">
        {legend}
      </legend>
      <p className="measure mt-2 text-sm leading-relaxed text-text-muted">{hint}</p>

      <div className="mt-4 space-y-5">
        {groups.map((group) => (
          <div key={group.label}>
            <p className="text-xs font-medium text-text-subtle">{group.label}</p>

            <div className="mt-2 grid gap-x-6 gap-y-2 sm:grid-cols-2">
              {group.items.map((item) => {
                const on = ticked.has(item.key);
                const byDefault = base.has(item.key);
                const differs = baseline !== undefined && on !== byDefault;

                return (
                  <label
                    key={item.key}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-2 py-1.5 text-sm transition-colors",
                      differs ? "bg-accent-soft/40" : "hover:bg-surface-2",
                    )}
                  >
                    <input
                      type="checkbox"
                      name={name}
                      value={item.key}
                      checked={on}
                      onChange={(event) => toggle(item.key, event.target.checked)}
                      className="size-4 shrink-0 rounded-sm border-border-strong text-accent focus:ring-2 focus:ring-accent/20"
                    />
                    <span className="min-w-0 flex-1 truncate">{item.label}</span>

                    {item.planned ? (
                      <span className="shrink-0 font-mono text-[0.6rem] uppercase tracking-[0.12em] text-text-subtle">
                        Not built
                      </span>
                    ) : differs ? (
                      <span className="shrink-0 font-mono text-[0.6rem] uppercase tracking-[0.12em] text-accent">
                        {on ? "Added" : "Removed"}
                      </span>
                    ) : null}
                  </label>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </fieldset>
  );
}
