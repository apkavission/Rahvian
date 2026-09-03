"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { clientEnv } from "@/lib/env";
import { usePathname } from "next/navigation";
import { ExternalLink, LogOut, Menu, UserCog, X } from "lucide-react";
import { CommandPalette } from "@/components/admin/command-palette";
import { AdminNav } from "@/components/admin/sidebar";
import type { AdminNavGroup } from "@/components/admin/nav";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { cn } from "@/lib/utils";

/**
 * The admin chrome: a fixed rail on desktop, a drawer on a phone.
 *
 * The owner will spend more time in here than anywhere else on the site, so
 * the shell is held to the same standard as the public pages rather than being
 * a bootstrap-grade wrapper: the same tokens, the same motion timings, correct
 * in both themes, and usable on a phone — which is where a lead notification
 * is read and answered.
 */
export function AdminShell({
  groups,
  user,
  signOutAction,
  children,
}: {
  groups: AdminNavGroup[];
  user: { name: string; email: string | null; role: string };
  signOutAction: () => Promise<void>;
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  /*
    The drawer's state is the path it was opened on, not a boolean.

    A drawer left open across a navigation covers the page that was just
    requested, so it has to close when the path changes — including on the back
    button, where no click handler of ours runs. Storing the path makes that
    fall out of a comparison instead of needing an effect that sets state on
    every navigation, which is both a wasted render and a rule the linter is
    right to flag.
  */
  const [openedAt, setOpenedAt] = useState<string | null>(null);
  const open = openedAt === pathname;

  const close = useCallback(() => setOpenedAt(null), []);

  // Escape closes it, because a drawer that traps a keyboard user is worse
  // than no drawer.
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpenedAt(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div className="min-h-dvh bg-bg lg:grid lg:grid-cols-[16rem_1fr]">
      {/* Desktop rail. */}
      <aside className="hidden border-r border-border bg-surface lg:flex lg:h-dvh lg:flex-col lg:sticky lg:top-0">
        <Brand />
        {/*
          `min-h-0`, and it is load-bearing.

          A flex item's default `min-height: auto` refuses to shrink below its
          content, so `flex-1` alone does not make this scroll — it makes the
          column taller than the screen and the account panel below it ends up
          drawn over the last menu item. It was invisible until the menu reached
          eighteen entries on 2026-09-03, at which point "Logo & banners" sat
          underneath the account card on any 900-pixel-tall laptop: present in
          the markup, reachable by keyboard, and unclickable.
        */}
        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-6">
          <AdminNav groups={groups} />
        </div>
        <UserPanel user={user} signOutAction={signOutAction} />
      </aside>

      {/* Mobile drawer. Rendered only while open, so nothing behind the page
          is focusable when it is shut. */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Close menu"
            onClick={close}
            className="absolute inset-0 bg-overlay backdrop-blur-sm"
          />
          <div className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col border-r border-border bg-surface">
            <Brand onClose={close} />
            {/* `min-h-0` for the same reason as the rail above. */}
            <div className="min-h-0 flex-1 overflow-y-auto px-3 py-6">
              <AdminNav groups={groups} onNavigate={close} />
            </div>
            <UserPanel user={user} signOutAction={signOutAction} />
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-surface/85 px-4 backdrop-blur-md sm:px-6">
          <button
            type="button"
            onClick={() => setOpenedAt(pathname)}
            aria-label="Open menu"
            aria-expanded={open}
            className="-ml-1 grid size-9 place-items-center rounded-lg text-text-muted transition-colors hover:bg-surface-2 hover:text-text lg:hidden"
          >
            <Menu className="size-5" aria-hidden />
          </button>

          {/*
            The palette lives in the header rather than being invisible behind
            its shortcut. It is the same menu the rail shows, resolved on the
            server and already in this component, so it costs nothing to pass
            down — and a search box a person can see is how they find out the
            shortcut exists at all.
          */}
          <CommandPalette groups={groups} />

          <div className="ml-auto flex items-center gap-1">
            <Link
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden items-center gap-1.5 rounded-lg px-3 py-2 text-sm text-text-muted transition-colors hover:bg-surface-2 hover:text-text sm:inline-flex"
            >
              View site
              <ExternalLink className="size-3.5" aria-hidden />
            </Link>

            {/*
              The client portal, which is a different application.

              This admin is the control plane for the estate, so the way into
              each of the other applications belongs here. What is shared with
              the portal is this address and nothing else — no import, no
              package, no table — because a change over there must never be able
              to break this panel.
            */}
            <Link
              href={clientEnv.NEXT_PUBLIC_PORTAL_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden items-center gap-1.5 rounded-lg px-3 py-2 text-sm text-text-muted transition-colors hover:bg-surface-2 hover:text-text lg:inline-flex"
            >
              Client portal
              <ExternalLink className="size-3.5" aria-hidden />
            </Link>

            {/*
              The role, in the header.

              It was already in the sidebar under the person's name, which is
              the right place for "this is your account" and the wrong place
              for "this is why the menu looks like this" — the rail is hidden
              on a phone and closed on a tablet, so on the two devices where a
              missing screen is most confusing the answer was not on screen at
              all. The tracker states it in its header for the same reason and
              this matches it.

              The label the role carries, never a word invented here, so a role
              renamed in the accounts screen is renamed everywhere at once.
            */}
            <span className="hidden items-center rounded-full bg-surface-2 px-2.5 py-1 font-mono text-[0.65rem] uppercase tracking-[0.12em] text-text-subtle sm:inline-flex">
              {user.role}
            </span>

            <ThemeToggle />
          </div>
        </header>

        <main className="flex-1 px-4 py-8 sm:px-6 lg:px-10">{children}</main>
      </div>
    </div>
  );
}

function Brand({ onClose }: { onClose?: () => void }) {
  return (
    <div className="flex h-16 shrink-0 items-center gap-2 border-b border-border px-5">
      <Link href="/admin" className="font-display text-base font-semibold">
        Admin
      </Link>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          aria-label="Close menu"
          className="ml-auto grid size-9 place-items-center rounded-lg text-text-muted transition-colors hover:bg-surface-2 hover:text-text"
        >
          <X className="size-5" aria-hidden />
        </button>
      )}
    </div>
  );
}

/**
 * Who is signed in, and the two things they can do about it.
 *
 * The name is a link to their own account screen, which is where anybody
 * changes their own password. It lives here rather than in the menu because it
 * is the one screen no owner can take away — everybody who can sign in must be
 * able to reach it — and the menu is a list of things that can be.
 *
 * Sign-out is a form posting to a Server Action rather than a link: it changes
 * state, and a GET that ends a session can be triggered by any image tag on
 * any page the browser happens to load.
 */
function UserPanel({
  user,
  signOutAction,
}: {
  user: { name: string; email: string | null; role: string };
  signOutAction: () => Promise<void>;
}) {
  return (
    <div className="shrink-0 border-t border-border p-3">
      <Link
        href="/admin/account"
        className="flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-surface-2"
      >
        <span
          aria-hidden
          className="grid size-9 shrink-0 place-items-center rounded-full bg-accent-soft font-medium text-accent"
        >
          {initial(user.name, user.email)}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{user.name}</p>
          <p className="truncate text-xs text-text-subtle">{user.role}</p>
        </div>
        <UserCog className="size-4 shrink-0 text-text-subtle" aria-hidden />
        <span className="sr-only">Your account</span>
      </Link>

      <form action={signOutAction}>
        <button
          type="submit"
          className={cn(
            "mt-1 flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm",
            "text-text-muted transition-colors duration-[--duration-fast]",
            "hover:bg-surface-2 hover:text-text",
          )}
        >
          <LogOut className="size-4 shrink-0" aria-hidden />
          Sign out
        </button>
      </form>
    </div>
  );
}

/** First letter of the name, or of the address when no name is set yet. */
function initial(name: string, email: string | null): string {
  const source = name.trim() || email?.trim() || "?";
  return source.charAt(0).toUpperCase();
}
