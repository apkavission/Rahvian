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
    <nav aria-label="Admin" className="space-y-6">
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

                And a child being open does not also light up its parent:
                `/admin/estate/demos` starts with `/admin/estate`, so a plain
                prefix test paints two rows in the active style and neither of
                them is where you are. The parent keeps the highlight for its
                own pages and hands it to whichever child matches.
              */
              const inside =
                item.href === "/admin"
                  ? pathname === "/admin"
                  : pathname.startsWith(item.href);

              const onChild = (item.children ?? []).some((child) =>
                pathname.startsWith(child.href),
              );

              const active = inside && !onChild;

              if (item.planned) {
                return (
                  <li key={item.href}>
                    <span
                      className="flex cursor-not-allowed items-center gap-3 rounded-lg px-3 py-1.5 text-sm text-text-subtle opacity-60"
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
                      "flex items-center gap-3 rounded-lg px-3 py-1.5 text-sm transition-colors duration-[--duration-fast]",
                      active
                        ? "bg-accent-soft font-semibold text-accent shadow-[inset_3px_0_0_var(--accent)]"
                        : "text-text-muted hover:bg-surface-2 hover:text-text",
                    )}
                  >
                    <Icon name={item.icon} className="size-4 shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </Link>

                  {/*
                    The screens inside this one, always shown rather than
                    revealed when the section is open.

                    An accordion would keep the rail shorter and would put the
                    screen that decides who may open a demo back where it was:
                    somewhere you have to already know about. These six rows are
                    the whole complaint — the rail scrolls, and it can afford
                    them.
                  */}
                  {item.children && item.children.length > 0 && (
                    <ul className="mt-0.5 space-y-0.5 border-l border-border pl-3 ml-6">
                      {item.children.map((child) => {
                        const here = pathname.startsWith(child.href);

                        return (
                          <li key={child.href}>
                            <Link
                              href={child.href}
                              onClick={onNavigate}
                              aria-current={here ? "page" : undefined}
                              className={cn(
                                "block truncate rounded-lg px-3 py-1.5 text-[0.8125rem] transition-colors duration-[--duration-fast]",
                                here
                                  ? "bg-accent-soft font-semibold text-accent"
                                  : "text-text-subtle hover:bg-surface-2 hover:text-text",
                              )}
                            >
                              {child.label}
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
