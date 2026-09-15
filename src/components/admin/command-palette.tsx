"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { useRouter } from "next/navigation";
import { clientEnv } from "@/lib/env";
import { CornerDownLeft, ExternalLink, Search, UserCog } from "lucide-react";
import type { AdminNavGroup, MenuKey } from "@/components/admin/nav";
import { Icon } from "@/components/ui/icon";
import { searchAdmin } from "@/lib/actions/search";
import type { SearchHit } from "@/lib/search/sources";
import { cn } from "@/lib/utils";

/**
 * The command palette — Ctrl+K, or ⌘K.
 *
 * Two lists in one box, and the split is the whole design.
 *
 * **Screens and actions are instant**, filtered in the browser from the menu
 * the shell already holds. That menu was resolved on the server and is already
 * in this page, so filtering it costs nothing and there is no reason for the
 * common case — "take me to the pricing screen" — to wait on a network round
 * trip.
 *
 * **Records are searched on the server**, because they are rows in eleven
 * tables and the person's own menu decides which of those may be read at all.
 * That decision is re-made server-side on every call; see `actions/search.ts`.
 *
 * It is deliberately a keyboard tool with a mouse fallback rather than the
 * reverse. Everything is reachable by pointer — the trigger in the header, the
 * rows themselves — but the arrow keys and Enter are the point, and the
 * shortcut is printed on the trigger because a keyboard shortcut nobody is
 * told about is not a feature.
 *
 * Built on the native `<dialog>` with `showModal()`, the same as the
 * confirmation dialog and for the same reasons: focus is trapped, Escape
 * closes, the page behind is inert to a screen reader, and it renders in the
 * browser's top layer so no `z-index` can cover it.
 */

/**
 * Read once, outside the component.
 *
 * `clientEnv` is validated at module load, and reading it during render would
 * make this component depend on an import that throws — which in a palette that
 * opens over every screen would take the whole panel down rather than one link.
 */
const PORTAL_URL = clientEnv.NEXT_PUBLIC_PORTAL_URL;

/** Actions that are not a screen in the menu. All three are always reachable. */
const ACTIONS: { id: string; label: string; detail: string; href: string; external?: boolean }[] = [
  {
    id: "action:view-site",
    label: "View the site",
    detail: "Opens the public home page in a new tab",
    href: "/",
    external: true,
  },
  {
    id: "action:portal",
    label: "Client portal",
    detail: "The projects clients sign in to see. A separate application",
    href: PORTAL_URL,
    external: true,
  },
  {
    id: "action:account",
    label: "Your account",
    detail: "Your name, and where you change your own password",
    href: "/admin/account",
  },
];

/*
  Sign-out is deliberately absent.

  A palette is a place where somebody types three letters and presses Enter
  without reading the row. That is exactly the right interaction for "go to
  pricing" and exactly the wrong one for ending a session in the middle of an
  unsaved form. It stays where it is: a button, in the sidebar, that has to be
  looked at to be pressed.
*/

/** Below this a search matches most of the database and helps nobody. */
const MIN_QUERY = 2;

/** Long enough that a word typed at speed is one query rather than five. */
const DEBOUNCE_MS = 160;

interface Row {
  id: string;
  label: string;
  detail: string;
  href: string;
  group: string;
  icon: React.ReactNode;
  external?: boolean;
}

export function CommandPalette({ groups }: { groups: AdminNavGroup[] }) {
  const router = useRouter();
  const dialog = useRef<HTMLDialogElement>(null);
  const input = useRef<HTMLInputElement>(null);

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [searching, setSearching] = useState(false);

  /*
    The highlight belongs to a query, not to the component.

    Stored with the text it was chosen against, the same idiom the shell uses
    for its drawer, so a new query starts at the top by falling out of a
    comparison rather than by an effect that resets it. It is also clamped: a
    query typed after arrowing down to the eighth row can leave three rows on
    screen, and an index past the end selects nothing.
  */
  const [selection, setSelection] = useState({ query: "", index: 0 });

  /** The icon each screen uses in the sidebar, so a result looks like its home. */
  const iconFor = useMemo(() => {
    const map = new Map<MenuKey, string>();
    for (const group of groups) {
      for (const item of group.items) map.set(item.key, item.icon);
    }
    return map;
  }, [groups]);

  /** The pending keystroke's search. Cleared on close and on unmount. */
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const close = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    setOpen(false);
    setQuery("");
    setHits([]);
    setSearching(false);
    setSelection({ query: "", index: 0 });
  }, []);

  // Ctrl+K and ⌘K. Bound to the window rather than to a field, because the
  // point of the shortcut is that it works from anywhere on the screen.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      /*
        `key` is read defensively because it is not always there.

        A `keydown` carries one in every case the specification cares about, and
        not in several the browser produces anyway: a value committed by a
        password manager or an autofill, and some IME composition events, all
        dispatch a KeyboardEvent with `key` undefined. `event.key.toLowerCase()`
        then throws inside a window listener that is live on every admin screen,
        which is how this turned up in the log as an uncaught TypeError with no
        obvious action behind it.
      */
      if (event.key?.toLowerCase() !== "k" || !(event.metaKey || event.ctrlKey)) return;
      event.preventDefault();
      setOpen((current) => !current);
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // `showModal()` has to be called on the element rather than expressed as a
  // prop, which is what makes an effect the right tool here rather than a smell.
  useEffect(() => {
    const element = dialog.current;
    if (!element) return;

    if (open && !element.open) {
      element.showModal();
      input.current?.focus();
    }
    if (!open && element.open) element.close();
  }, [open]);

  /*
    The server search, driven by the keystroke rather than by an effect.

    Typing is an event, and starting a request is what an event handler is
    for — so this hangs off `onChange` instead of watching the query from an
    effect. That also keeps the "searching" flag out of an effect body, where
    setting state schedules a second render for no reason.

    Two things it has to get right. **A short delay**, so a word typed at
    speed is one query rather than five. And **a sequence number**, because
    two searches can be in flight and the slower one can answer last: without
    it, typing "pri" then "pric" could leave the results for "pri" on screen
    under the word "pric".
  */
  const sequence = useRef(0);

  const search = useCallback((term: string) => {
    if (timer.current) clearTimeout(timer.current);

    const trimmed = term.trim();
    const mine = ++sequence.current;

    if (trimmed.length < MIN_QUERY) {
      setHits([]);
      setSearching(false);
      return;
    }

    setSearching(true);

    timer.current = setTimeout(() => {
      searchAdmin(trimmed)
        .then((results) => {
          if (mine !== sequence.current) return;
          setHits(results);
        })
        .catch(() => {
          if (mine !== sequence.current) return;
          setHits([]);
        })
        .finally(() => {
          if (mine === sequence.current) setSearching(false);
        });
    }, DEBOUNCE_MS);
  }, []);

  // A palette closed mid-keystroke would otherwise leave a timer to fire into
  // a component that is no longer there.
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  /** Screens and actions, filtered here; records, as they arrive. */
  const rows: Row[] = useMemo(() => {
    const term = query.trim().toLowerCase();

    /*
      The screens inside a screen are searchable too.

      A palette that knows "Blog" but not "Categories" sends somebody to the
      blog to look for a link, which is the same journey the sidebar used to
      force. A child is listed under its parent's icon and names its parent as
      its detail, so "demos" finds "Who may open a demo · Estate".
    */
    const screens: Row[] = groups.flatMap((group) =>
      group.items
        .filter((item) => !item.planned)
        .flatMap((item) => {
          const rows: Row[] = [];

          if (!term || item.label.toLowerCase().includes(term)) {
            rows.push({
              id: `screen:${item.key}`,
              label: item.label,
              detail: group.label,
              href: item.href,
              group: "Screens",
              icon: <Icon name={item.icon} className="size-4 shrink-0" />,
            });
          }

          for (const child of item.children ?? []) {
            if (term && !child.label.toLowerCase().includes(term)) continue;

            rows.push({
              id: `screen:${item.key}:${child.href}`,
              label: child.label,
              detail: item.label,
              href: child.href,
              group: "Screens",
              icon: <Icon name={item.icon} className="size-4 shrink-0" />,
            });
          }

          return rows;
        }),
    );

    const actions: Row[] = ACTIONS.filter(
      (action) => !term || action.label.toLowerCase().includes(term),
    ).map((action) => ({
      ...action,
      group: "Actions",
      icon: action.external ? (
        <ExternalLink className="size-4 shrink-0" aria-hidden />
      ) : (
        <UserCog className="size-4 shrink-0" aria-hidden />
      ),
    }));

    const records: Row[] = hits.map((hit) => ({
      id: hit.id,
      label: hit.label,
      detail: hit.detail,
      href: hit.href,
      group: "Records",
      icon: <Icon name={iconFor.get(hit.menu) ?? "file-text"} className="size-4 shrink-0" />,
    }));

    return [...screens, ...actions, ...records];
  }, [groups, query, hits, iconFor]);

  const active =
    selection.query === query
      ? Math.min(selection.index, Math.max(rows.length - 1, 0))
      : 0;

  const setActive = useCallback(
    (index: number) => setSelection({ query, index }),
    [query],
  );

  const choose = useCallback(
    (row: Row | undefined) => {
      if (!row) return;
      close();

      if (row.external) {
        window.open(row.href, "_blank", "noopener,noreferrer");
        return;
      }

      router.push(row.href);
    },
    [close, router],
  );

  /**
   * Arrow keys wrap rather than stop at the ends.
   *
   * A palette is a short list and the fastest way to the last row is usually
   * one press upwards. Wrapping is also why the two handlers read `active`
   * directly instead of an updater function: the highlight is derived from the
   * query, not held independently, so there is no previous value to update
   * from — which is the point of deriving it.
   */
  function onKeyDown(event: React.KeyboardEvent) {
    if (rows.length === 0 && event.key !== "Enter") return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((active + 1) % rows.length);
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((active - 1 + rows.length) % rows.length);
    }
    if (event.key === "Enter") {
      event.preventDefault();
      choose(rows[active]);
    }
  }

  let printedGroup = "";

  return (
    <>
      <PaletteTrigger onClick={() => setOpen(true)} />

      <dialog
        ref={dialog}
        onCancel={(event) => {
          event.preventDefault();
          close();
        }}
        // A click on the backdrop lands on the dialog element itself; a click
        // on anything inside it lands on a child.
        onClick={(event) => {
          if (event.target === dialog.current) close();
        }}
        aria-label="Search and go to"
        className={cn(
          "mx-auto mt-[10vh] mb-auto w-[min(36rem,calc(100vw-2rem))] rounded-2xl border border-border",
          "bg-surface p-0 text-text shadow-[var(--shadow-3)]",
          "backdrop:bg-overlay backdrop:backdrop-blur-sm",
        )}
      >
        <div className="flex items-center gap-3 border-b border-border px-4">
          <Search className="size-4 shrink-0 text-text-subtle" aria-hidden />
          <input
            ref={input}
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              search(event.target.value);
            }}
            onKeyDown={onKeyDown}
            placeholder="Go to a screen, or search for anything"
            aria-label="Search"
            // The list is not a listbox: rows are links, and a screen reader
            // should hear them as such. The live region below is what tells it
            // how many there are.
            autoComplete="off"
            spellCheck={false}
            className="w-full bg-transparent py-4 text-sm text-text outline-none placeholder:text-text-subtle"
          />
          <kbd className="hidden shrink-0 rounded border border-border px-1.5 py-0.5 font-mono text-[0.6rem] text-text-subtle sm:block">
            esc
          </kbd>
        </div>

        <div className="max-h-[min(24rem,60vh)] overflow-y-auto p-2">
          {rows.length === 0 ? (
            <p className="px-3 py-8 text-center text-sm text-text-muted">
              {searching
                ? "Searching…"
                : query.trim().length > 0 && query.trim().length < MIN_QUERY
                  ? "Keep typing — one letter matches too much to be useful."
                  : `Nothing matches “${query.trim()}”.`}
            </p>
          ) : (
            <ul>
              {rows.map((row, index) => {
                const heading = row.group === printedGroup ? null : row.group;
                printedGroup = row.group;

                return (
                  <li key={row.id}>
                    {heading ? (
                      <p className="px-3 pb-1 pt-3 font-mono text-[0.6rem] uppercase tracking-[0.18em] text-text-subtle first:pt-1">
                        {heading}
                      </p>
                    ) : null}

                    <button
                      type="button"
                      // Pointer and keyboard agree on one highlight rather than
                      // having a hover style and a separate selection: two
                      // things that look chosen is one too many.
                      onMouseMove={() => setActive(index)}
                      onClick={() => choose(row)}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors",
                        index === active
                          ? "bg-accent-soft text-text"
                          : "text-text-muted hover:text-text",
                      )}
                    >
                      <span className={index === active ? "text-accent" : "text-text-subtle"}>
                        {row.icon}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm">{row.label}</span>
                        {row.detail ? (
                          <span className="block truncate text-xs text-text-subtle">
                            {row.detail}
                          </span>
                        ) : null}
                      </span>
                      {index === active ? (
                        <CornerDownLeft className="size-3.5 shrink-0 text-text-subtle" aria-hidden />
                      ) : null}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <p aria-live="polite" className="sr-only">
          {searching ? "Searching" : `${rows.length} results`}
        </p>

        <div className="flex items-center gap-4 border-t border-border px-4 py-2.5 font-mono text-[0.6rem] uppercase tracking-[0.14em] text-text-subtle">
          <span>↑↓ move</span>
          <span>↵ open</span>
          <span className="ml-auto">
            {searching ? "searching…" : `${rows.length} result${rows.length === 1 ? "" : "s"}`}
          </span>
        </div>
      </dialog>
    </>
  );
}

/**
 * The way in for anybody who does not know the shortcut.
 *
 * A search box on a phone and a narrow button beside it on a laptop, both of
 * which open the same palette. The shortcut is printed on it from `sm` up,
 * because that is the only place anyone will ever learn it.
 */
function PaletteTrigger({ onClick }: { onClick: () => void }) {
  /*
    Which key to print.

    Both work — the handler accepts either modifier — but printing "Ctrl" to
    somebody on a Mac is printing the wrong key, and a shortcut label is only
    worth having if it is the one they would actually press.

    `useSyncExternalStore` rather than state set from an effect. The server has
    no user agent, so it renders the server snapshot; React then re-renders
    with the client's without calling it a hydration mismatch, which is exactly
    what this needs and what a `useState` plus `useEffect` pair only
    approximates. The subscribe function returns an empty unsubscribe because
    the answer never changes while the page is open.
  */
  const mac = useSyncExternalStore(
    () => () => {},
    () => /Mac|iPhone|iPad|iPod/.test(navigator.userAgent),
    () => false,
  );

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 rounded-lg border border-border bg-surface-2/60 px-3 py-2",
        "text-sm text-text-subtle transition-colors hover:border-border-strong hover:text-text",
        "sm:w-64",
      )}
    >
      <Search className="size-4 shrink-0" aria-hidden />
      <span className="hidden sm:inline">Search</span>
      <span className="sr-only sm:hidden">Search</span>
      <kbd className="ml-auto hidden rounded border border-border px-1.5 py-0.5 font-mono text-[0.6rem] sm:block">
        {mac ? "⌘ K" : "Ctrl K"}
      </kbd>
    </button>
  );
}
