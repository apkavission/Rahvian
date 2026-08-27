"use client";

import { useActionState, useEffect, useRef } from "react";
import Link from "next/link";
import { ChevronDown, ChevronUp, Copy, Trash2 } from "lucide-react";
import { requestPreviewRefresh } from "@/components/admin/preview-pane";
import { useBusyWhile } from "@/components/forms/use-busy-while";
import { useFormToast } from "@/components/forms/use-form-toast";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { initialRecordState, type RecordActionState } from "@/lib/validation/records";
import { cn } from "@/lib/utils";

export interface RecordListItem {
  id: string;
  /** The name on the row. */
  title: string;
  /** The line underneath — an address, a state, a date. Kept short. */
  subtitle: string;
  /** Draft, archived, hidden: rendered faded, so state is visible at a glance. */
  dimmed?: boolean;
  /** Optional glyph at the start of the row. */
  icon?: React.ReactNode;
}

type RecordAction = (
  previous: RecordActionState,
  formData: FormData,
) => Promise<RecordActionState>;

/**
 * The left column of every content screen.
 *
 * Every record of that kind, in the order they appear, with their state visible
 * and their actions on their own row — the standing rule, in one component so
 * that it is a rule rather than a resemblance. Services, portfolio, case
 * studies, blog, pricing, FAQs and team all render this; what differs between
 * them is the words on a row and which Server Actions the buttons post to.
 *
 * Reordering is two buttons rather than a drag handle. Drag is the nicer
 * gesture and it is the only one a keyboard cannot perform and a phone performs
 * badly — so the buttons are the mechanism, and drag, when it arrives, is an
 * enhancement on top of them rather than a replacement for them.
 *
 * The selected record lives in the query string, so the back button steps back
 * through what was being edited and a link to one record can be sent.
 */
export function RecordList({
  items,
  selectedId,
  basePath,
  queryKey,
  actions,
  emptyLabel,
  deleteCopy,
}: {
  items: RecordListItem[];
  selectedId: string | null;
  /** The screen this list is on, e.g. `/admin/services`. */
  basePath: string;
  /** The query parameter that selects a record, e.g. `service`. */
  queryKey: string;
  actions: {
    /**
     * Omitted where the record has no order of its own — case studies are
     * ordered by their publication date, so arrows on those rows would be
     * buttons that appear to do nothing.
     */
    move?: RecordAction;
    /**
     * Omitted where a copy would be meaningless — duplicating a stored file
     * would mean a second copy of the bytes under a second address, which is
     * not what anyone pressing it would expect.
     */
    duplicate?: RecordAction;
    remove: RecordAction;
  };
  emptyLabel: string;
  /** The confirmation shown before a delete. Say what is lost and what to do instead. */
  deleteCopy: (item: RecordListItem) => {
    title: string;
    body: string;
    confirmLabel: string;
  };
}) {
  return (
    <ul className="space-y-2">
      {items.map((item, index) => {
        const selected = item.id === selectedId;

        return (
          <li key={item.id}>
            <div
              className={cn(
                "rounded-xl border p-3 transition-colors",
                selected ? "border-accent bg-accent-soft/40" : "border-border bg-surface",
                item.dimmed && "opacity-70",
              )}
            >
              <div className="flex items-start gap-2">
                <Link
                  href={`${basePath}?${queryKey}=${item.id}`}
                  className="flex min-w-0 flex-1 items-start gap-2.5 text-left"
                  aria-current={selected ? "true" : undefined}
                >
                  {item.icon ? (
                    <span className="mt-0.5 shrink-0 text-text-subtle">{item.icon}</span>
                  ) : null}
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">{item.title}</span>
                    <span className="block truncate font-mono text-[0.65rem] uppercase tracking-[0.12em] text-text-subtle">
                      {item.subtitle}
                    </span>
                  </span>
                </Link>

                {actions.move ? (
                  <div className="flex shrink-0 gap-0.5">
                    <MoveButton
                      action={actions.move}
                      id={item.id}
                      direction="up"
                      disabled={index === 0}
                    />
                    <MoveButton
                      action={actions.move}
                      id={item.id}
                      direction="down"
                      disabled={index === items.length - 1}
                    />
                  </div>
                ) : null}
              </div>

              <div className="mt-2 flex gap-0.5 border-t border-border pt-2">
                {actions.duplicate ? (
                  <DuplicateButton action={actions.duplicate} id={item.id} />
                ) : null}
                <DeleteButton action={actions.remove} id={item.id} copy={deleteCopy(item)} />
              </div>
            </div>
          </li>
        );
      })}

      {items.length === 0 && (
        <li className="rounded-xl border border-dashed border-border p-4 text-sm text-text-muted">
          {emptyLabel}
        </li>
      )}
    </ul>
  );
}

// ---------------------------------------------------------------------------

function MoveButton({
  action,
  id,
  direction,
  disabled,
}: {
  action: RecordAction;
  id: string;
  direction: "up" | "down";
  disabled: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, initialRecordState);
  useFormToast(state, { successTitle: "Moved", errorTitle: "Could not move it" });
  usePreviewRefresh(state);

  return (
    <form action={formAction}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="direction" value={direction} />
      <IconButton
        label={direction === "up" ? "Move up" : "Move down"}
        disabled={disabled || pending}
      >
        {direction === "up" ? (
          <ChevronUp className="size-4" aria-hidden />
        ) : (
          <ChevronDown className="size-4" aria-hidden />
        )}
      </IconButton>
    </form>
  );
}

function DuplicateButton({ action, id }: { action: RecordAction; id: string }) {
  const [state, formAction, pending] = useActionState(action, initialRecordState);
  useBusyWhile(pending, "Duplicating");
  useFormToast(state, { successTitle: "Duplicated", errorTitle: "Could not duplicate it" });

  return (
    <form action={formAction}>
      <input type="hidden" name="id" value={id} />
      <IconButton label="Duplicate" disabled={pending}>
        <Copy className="size-4" aria-hidden />
      </IconButton>
    </form>
  );
}

/**
 * Delete, behind a confirmation.
 *
 * The one irreversible action on these screens, which is why it is the only one
 * that asks first — and why the caller's wording is expected to offer archiving
 * instead, since that is usually what was meant and it is a dropdown away in the
 * form.
 *
 * `type="button"` because the question has to be answered before the form is
 * submitted, not after: an async handler on submit cannot hold a submission back
 * once it has started.
 */
function DeleteButton({
  action,
  id,
  copy,
}: {
  action: RecordAction;
  id: string;
  copy: { title: string; body: string; confirmLabel: string };
}) {
  const [state, formAction, pending] = useActionState(action, initialRecordState);
  const form = useRef<HTMLFormElement>(null);
  const confirm = useConfirm();

  useBusyWhile(pending, "Deleting");
  useFormToast(state, { successTitle: "Deleted", errorTitle: "Could not delete it" });

  return (
    <form action={formAction} ref={form} className="ml-auto">
      <input type="hidden" name="id" value={id} />

      <IconButton
        label="Delete"
        disabled={pending}
        danger
        type="button"
        onClick={async () => {
          const yes = await confirm({
            title: copy.title,
            body: copy.body,
            confirmLabel: copy.confirmLabel,
          });
          if (yes) form.current?.requestSubmit();
        }}
      >
        <Trash2 className="size-4" aria-hidden />
      </IconButton>
    </form>
  );
}

/**
 * Refresh the preview once, after a successful action.
 *
 * Compared against the state object rather than its status: `useActionState`
 * returns the same object on unrelated re-renders, so a status comparison would
 * reload the preview every time anything else on the screen changed.
 */
function usePreviewRefresh(state: { status: string }) {
  const announced = useRef<unknown>(null);

  useEffect(() => {
    if (state.status !== "success" || announced.current === state) return;
    announced.current = state;
    requestPreviewRefresh();
  }, [state]);
}

function IconButton({
  label,
  disabled,
  danger,
  type = "submit",
  onClick,
  children,
}: {
  label: string;
  disabled?: boolean;
  danger?: boolean;
  type?: "submit" | "button";
  onClick?: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      aria-label={label}
      title={label}
      disabled={disabled}
      className={cn(
        "grid size-8 place-items-center rounded-md transition-colors",
        danger
          ? "text-text-subtle hover:bg-danger-soft hover:text-danger"
          : "text-text-subtle hover:bg-surface-3 hover:text-text",
        "disabled:pointer-events-none disabled:opacity-40",
      )}
    >
      {children}
    </button>
  );
}
