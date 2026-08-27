"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
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

export function HeaderNav({ items, companyName, logo, ctaLabel, ctaHref }: Props) {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Frosted background appears only once content is behind the header.
  // Sitting flush at the top with no border reads as part of the hero.
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close the mobile panel on navigation, otherwise it stays open over the
  // page the visitor just asked for.
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

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

        <nav aria-label="Main" className="ml-auto hidden items-center gap-1 lg:flex">
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
          <ButtonLink href={ctaHref} size="sm" className="hidden sm:inline-flex">
            {ctaLabel}
          </ButtonLink>
          <button
            type="button"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((open) => !open)}
            className="grid size-9 place-items-center rounded-lg text-text-muted transition-colors hover:bg-surface-2 hover:text-text lg:hidden"
          >
            {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <MobilePanel items={items} ctaLabel={ctaLabel} ctaHref={ctaHref} onClose={() => setMobileOpen(false)} />
      )}
    </header>
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

function MobilePanel({
  items,
  ctaLabel,
  ctaHref,
  onClose,
}: {
  items: NavNode[];
  ctaLabel: string;
  ctaHref: string;
  onClose: () => void;
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
