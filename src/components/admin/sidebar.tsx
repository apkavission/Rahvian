"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/ui/icon";
import type { AdminNavGroup } from "@/components/admin/nav";
import { cn } from "@/lib/utils";

/**
 * The admin navigation.
 *
 * A Client Component only because it needs the current path to mark the active
 * row. The menu itself is passed in already filtered by role — deciding that
 * on the client would put the full menu in the bundle, and a menu the browser
 * holds is a menu a curious user can read.
 */
export function AdminNav({
  groups,
  onNavigate,
}: {
  groups: AdminNavGroup[];
  /** Closes the mobile drawer. Not passed on the desktop rail. */
  onNavigate?: () => void;
}) {
  const pathname = usePathname();

  return (
    <nav aria-label="Admin" className="space-y-7">
      {groups.map((group) => (
        <div key={group.label}>
          <p className="px-3 font-mono text-[0.65rem] uppercase tracking-[0.18em] text-text-subtle">
            {group.label}
          </p>

          <ul className="mt-2 space-y-0.5">
            {group.items.map((item) => {
              /*
                `/admin` would otherwise match every route beneath it, so the
                dashboard is compared exactly and everything else by prefix —
                which is what keeps "Blog" highlighted on `/admin/blog/new`.
              */
              const active =
                item.href === "/admin"
                  ? pathname === "/admin"
                  : pathname.startsWith(item.href);

              if (item.planned) {
                return (
                  <li key={item.href}>
                    <span
                      className="flex cursor-not-allowed items-center gap-3 rounded-lg px-3 py-2 text-sm text-text-subtle opacity-60"
                      title="Not built yet"
                    >
                      <Icon name={item.icon} className="size-4 shrink-0" />
                      <span className="truncate">{item.label}</span>
                      <span className="ml-auto font-mono text-[0.6rem] uppercase tracking-[0.14em]">
                        Soon
                      </span>
                    </span>
                  </li>
                );
              }

              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors duration-[--duration-fast]",
                      active
                        ? "bg-accent-soft font-semibold text-accent shadow-[inset_3px_0_0_var(--accent)]"
                        : "text-text-muted hover:bg-surface-2 hover:text-text",
                    )}
                  >
                    <Icon name={item.icon} className="size-4 shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
