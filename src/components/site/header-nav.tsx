"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  useEffect,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { ChevronDown, Menu, X } from "lucide-react";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { ButtonLink } from "@/components/ui/button";
import type { NavNode } from "@/lib/queries/navigation";
import { cn } from "@/lib/utils";

interface Props {
  items: NavNode[];
  companyName: string;
  /** Pre-rendered on the server; null until a logo is configured. */
  logo?: ReactNode;
  ctaLabel: string;
  ctaHref: string;
}

/**
 * Is the page scrolled past the point where the header should go frosted?
 *
 * A module-level pair rather than functions built in the component, because
 * `useSyncExternalStore` compares snapshots by identity: a `subscribe` that
 * changed on every render would resubscribe on every render.
 */
function subscribeToScroll(onChange: () => void) {
  window.addEventListener("scroll", onChange, { passive: true });
  return () => window.removeEventListener("scroll", onChange);
}

function isScrolled() {
  return window.scrollY > 8;
}

export function HeaderNav({
  items,
  companyName,
  logo,
  ctaLabel,
  ctaHref,
}: Props) {
  const pathname = usePathname();

  /*
    The panel's state is the path it was opened on, not a boolean.

    A panel left open across a navigation covers the page the visitor just
    asked for, so it has to close when the path changes — including on the back
    button, where no handler of ours runs. Storing the path makes that fall out
    of a comparison instead of needing an effect that sets state on every
    navigation, which is both a wasted render and a rule the React Compiler is
    right to flag.

    The same idiom the admin shell uses for its drawer, and now for the same
    stated reason in both places.
  */
  const [openedAt, setOpenedAt] = useState<string | null>(null);
  const mobileOpen = openedAt === pathname;

  /*
    Frosted background appears only once content is behind the header. Sitting
    flush at the top with no border reads as part of the hero.

    `useSyncExternalStore` rather than a listener that calls `setState`: this is
    a browser value being subscribed to, which is exactly what the hook is for.
    The earlier version also had to call its own handler once on mount to catch
    a page loaded already scrolled, and that call — `setState` in an effect
    body — is a cascading render the React Compiler is right to flag. Reading a
    snapshot has no such problem: the first render already has the answer.

    The server snapshot is `false`, because a document that has not been sent
    yet cannot be scrolled.
  */
  const scrolled = useSyncExternalStore(
    subscribeToScroll,
    isScrolled,
    () => false,
  );

  // Lock the page behind the full-screen panel.
  useEffect(() => {
    if (!mobileOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [mobileOpen]);

  return (
    <>
      <header
        className={cn(
          "sticky top-0 z-50 transition-[background-color,border-color,backdrop-filter]",
          "duration-[--duration-base] ease-[--ease-out]",
          scrolled
            ? "border-b border-border bg-bg/80 backdrop-blur-xl"
            : "border-b border-transparent bg-transparent",
        )}
      >
        <div className="container-page flex h-16 items-center gap-6 md:h-18">
          {/* Mark and name together. The mark alone is not yet known enough to
            identify the company, and the name alone wastes the mark. */}
          <Link
            href="/"
            aria-label={`${companyName} — home`}
            className="flex items-center gap-2.5 font-display text-base font-semibold tracking-tight"
          >
            {logo}
            <span>{companyName}</span>
          </Link>

          <nav
            aria-label="Main"
            className="ml-auto hidden items-center gap-1 lg:flex"
          >
            {items.map((item) =>
              item.children.length > 0 ? (
                <NavDropdown key={item.id} item={item} pathname={pathname} />
              ) : (
                <NavLink key={item.id} item={item} pathname={pathname} />
              ),
            )}
          </nav>

          <div className="ml-auto flex items-center gap-3 lg:ml-0">
            <ThemeToggle />
            <ButtonLink
              href={ctaHref}
              size="sm"
              className="hidden sm:inline-flex"
            >
              {ctaLabel}
            </ButtonLink>
            <button
              type="button"
              aria-label={mobileOpen ? "Close menu" : "Open menu"}
              aria-expanded={mobileOpen}
              onClick={() => setOpenedAt(mobileOpen ? null : pathname)}
              className="grid size-9 place-items-center rounded-lg text-text-muted transition-colors hover:bg-surface-2 hover:text-text lg:hidden"
            >
              {mobileOpen ? (
                <X className="size-5" />
              ) : (
                <Menu className="size-5" />
              )}
            </button>
          </div>
        </div>
      </header>

      {/*
        The panel is a sibling of the header, not a child of it — and that is
        load-bearing rather than tidiness.

        The header carries `backdrop-blur` once the page is scrolled, and an
        element with a `backdrop-filter` becomes the **containing block for
        every `position: fixed` descendant**. Inside the header, this panel's
        `top-16 bottom-0` was therefore measured against a 64px-tall header
        instead of the viewport, and resolved to a height of zero: the menu
        opened, the button turned into an X, and nothing appeared.

        It only happened once the visitor had scrolled past 8px, because that
        is when the blur is applied — so the menu worked on a freshly loaded
        page and stopped working the moment anybody scrolled. Found by a
        browser test on 2026-08-28, after the panel's own link turned out to be
        un-clickable.

        Out here the containing block is the viewport again. `z-40` against the
        header's `z-50` keeps the header and its close button above the panel,
        which is the behaviour that was always intended.
      */}
      {mobileOpen && (
        <MobilePanel items={items} ctaLabel={ctaLabel} ctaHref={ctaHref} />
      )}
    </>
  );
}

// ---------------------------------------------------------------------------

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

function NavLink({ item, pathname }: { item: NavNode; pathname: string }) {
  return (
    <Link
      href={item.href}
      target={item.openNewTab ? "_blank" : undefined}
      rel={item.isExternal ? "noopener noreferrer" : undefined}
      className={cn(
        "rounded-lg px-3 py-2 text-sm transition-colors duration-[--duration-fast]",
        isActive(pathname, item.href)
          ? "text-text"
          : "text-text-muted hover:text-text",
      )}
    >
      {item.label}
    </Link>
  );
}

function NavDropdown({ item, pathname }: { item: NavNode; pathname: string }) {
  const [open, setOpen] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const menuId = useId();

  // A short close delay keeps the menu usable when the pointer crosses the
  // gap between the trigger and the panel.
  const scheduleClose = () => {
    closeTimer.current = setTimeout(() => setOpen(false), 120);
  };
  const cancelClose = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
  };

  useEffect(() => () => cancelClose(), []);

  return (
    <div
      className="relative"
      onMouseEnter={() => {
        cancelClose();
        setOpen(true);
      }}
      onMouseLeave={scheduleClose}
    >
      <Link
        href={item.href}
        aria-expanded={open}
        aria-controls={menuId}
        onFocus={() => setOpen(true)}
        className={cn(
          "flex items-center gap-1 rounded-lg px-3 py-2 text-sm transition-colors duration-[--duration-fast]",
          isActive(pathname, item.href)
            ? "text-text"
            : "text-text-muted hover:text-text",
        )}
      >
        {item.label}
        <ChevronDown
          className={cn(
            "size-3.5 transition-transform duration-[--duration-fast]",
            open && "rotate-180",
          )}
          aria-hidden
        />
      </Link>

      <div
        id={menuId}
        className={cn(
          "absolute left-0 top-full w-72 origin-top-left pt-2",
          "transition-[opacity,transform] duration-[--duration-fast] ease-[--ease-out]",
          open
            ? "pointer-events-auto opacity-100 translate-y-0"
            : "pointer-events-none opacity-0 -translate-y-1",
        )}
      >
        <ul className="surface-raised overflow-hidden rounded-xl border border-border p-1.5">
          {item.children.map((child) => (
            <li key={child.id}>
              <Link
                href={child.href}
                className={cn(
                  "block rounded-lg px-3 py-2.5 text-sm transition-colors duration-[--duration-fast]",
                  pathname === child.href
                    ? "bg-surface-2 text-text"
                    : "text-text-muted hover:bg-surface-2 hover:text-text",
                )}
              >
                {child.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/**
 * The full-screen panel behind the menu button.
 *
 * It takes no close handler, and that is not an oversight: the header's own
 * toggle switches to an X and stays visible above the panel, and the panel
 * closes itself on navigation. A second control in a different position would
 * be two ways to do one thing.
 */
function MobilePanel({
  items,
  ctaLabel,
  ctaHref,
}: {
  items: NavNode[];
  ctaLabel: string;
  ctaHref: string;
}) {
  return (
    <div className="fixed inset-0 top-16 z-40 overflow-y-auto bg-bg lg:hidden md:top-18">
      <div className="container-page flex flex-col gap-1 py-6">
        {/* No close button here: the header toggle already switches to an X
            and stays visible above the panel. A second control in a different
            position would be two ways to do one thing. */}
        {items.map((item, index) => (
          <div
            key={item.id}
            // Staggered entry. Inline delay rather than a utility class, so the
            // stagger scales with however many items the admin has configured.
            style={{ animationDelay: `${index * 40}ms` }}
            className="animate-[fade-rise_320ms_var(--ease-out)_both]"
          >
            <Link
              href={item.href}
              className="block border-b border-border py-3.5 font-display text-lg"
            >
              {item.label}
            </Link>
            {item.children.length > 0 && (
              <ul className="py-1">
                {item.children.map((child) => (
                  <li key={child.id}>
                    <Link
                      href={child.href}
                      className="block py-2 pl-4 text-sm text-text-muted"
                    >
                      {child.label}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}

        <ButtonLink href={ctaHref} size="lg" className="mt-6 w-full">
          {ctaLabel}
        </ButtonLink>
      </div>
    </div>
  );
}
