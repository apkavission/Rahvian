"use client";

import { useActionState, useEffect, useRef } from "react";
import Link from "next/link";
import { ChevronDown, ChevronUp, Copy, Eye, EyeOff, Plus, Trash2 } from "lucide-react";
import { requestPreviewRefresh } from "@/components/admin/preview-pane";
import { useBusyWhile } from "@/components/forms/use-busy-while";
import { useFormToast } from "@/components/forms/use-form-toast";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { FIELD } from "@/components/ui/field";
import {
  addSection,
  deleteSection,
  duplicateSection,
  moveSection,
  toggleSection,
} from "@/lib/actions/pages";
import { SECTION_DEFINITIONS, SECTION_TYPES } from "@/lib/sections/definitions";
import { initialPageActionState } from "@/lib/validation/pages";
import { cn } from "@/lib/utils";

export interface ListSection {
  id: string;
  type: string;
  is_active: boolean;
}

/**
 * The ordered list of sections, and everything you can do to one.
 *
 * Reordering is two buttons rather than a drag handle. Drag is the nicer
 * gesture and it is the only one a keyboard cannot perform and a phone
 * performs badly — so the buttons are the mechanism and drag, when it arrives,
 * is an enhancement on top of them rather than a replacement for them.
 *
 * Every action is its own form posting to a Server Action, so each one refuses
 * or reports independently.
 */
export function SectionList({
  pageId,
  sections,
  selectedId,
}: {
  pageId: string;
  sections: ListSection[];
  selectedId: string | null;
}) {
  return (
    <div>
      <ul className="space-y-2">
        {sections.map((section, index) => {
          const definition = SECTION_DEFINITIONS[section.type];
          const selected = section.id === selectedId;

          return (
            <li key={section.id}>
              <div
                className={cn(
                  "rounded-xl border p-3 transition-colors",
                  selected ? "border-accent bg-accent-soft/40" : "border-border bg-surface",
                  !section.is_active && "opacity-60",
                )}
              >
                <div className="flex items-start gap-2">
                  <Link
                    href={`/admin/pages/${pageId}?section=${section.id}`}
                    className="min-w-0 flex-1 text-left"
                    aria-current={selected ? "true" : undefined}
                  >
                    <p className="truncate text-sm font-medium">
                      {definition?.label ?? section.type}
                    </p>
                    <p className="truncate font-mono text-[0.65rem] uppercase tracking-[0.12em] text-text-subtle">
                      {section.is_active ? section.type : `${section.type} · hidden`}
                    </p>
                  </Link>

                  <div className="flex shrink-0 gap-0.5">
                    <MoveButton
                      pageId={pageId}
                      sectionId={section.id}
                      direction="up"
                      disabled={index === 0}
                    />
                    <MoveButton
                      pageId={pageId}
                      sectionId={section.id}
                      direction="down"
                      disabled={index === sections.length - 1}
                    />
                  </div>
                </div>

                <div className="mt-2 flex gap-0.5 border-t border-border pt-2">
                  <ToggleButton
                    pageId={pageId}
                    sectionId={section.id}
                    active={section.is_active}
                  />
                  <DuplicateButton pageId={pageId} sectionId={section.id} />
                  <DeleteButton
                    pageId={pageId}
                    sectionId={section.id}
                    label={definition?.label ?? section.type}
                  />
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      {sections.length === 0 && (
        <p className="rounded-xl border border-dashed border-border p-4 text-sm text-text-muted">
          This page has no sections yet. Add one below.
        </p>
      )}

      <AddSection pageId={pageId} />
    </div>
  );
}

// ---------------------------------------------------------------------------

function MoveButton({
  pageId,
  sectionId,
  direction,
  disabled,
}: {
  pageId: string;
  sectionId: string;
  direction: "up" | "down";
  disabled: boolean;
}) {
  const [state, action, pending] = useActionState(moveSection, initialPageActionState);
  useFormToast(state, { successTitle: "Moved", errorTitle: "Could not move it" });
  usePreviewRefresh(state);

  return (
    <form action={action}>
      <input type="hidden" name="page_id" value={pageId} />
      <input type="hidden" name="section_id" value={sectionId} />
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

function ToggleButton({
  pageId,
  sectionId,
  active,
}: {
  pageId: string;
  sectionId: string;
  active: boolean;
}) {
  const [state, action, pending] = useActionState(toggleSection, initialPageActionState);
  useBusyWhile(pending, "Saving");
  useFormToast(state, { successTitle: "Saved", errorTitle: "Could not do that" });
  usePreviewRefresh(state);

  return (
    <form action={action}>
      <input type="hidden" name="page_id" value={pageId} />
      <input type="hidden" name="section_id" value={sectionId} />
      <IconButton label={active ? "Hide from the page" : "Show on the page"} disabled={pending}>
        {active ? <Eye className="size-4" aria-hidden /> : <EyeOff className="size-4" aria-hidden />}
      </IconButton>
    </form>
  );
}

function DuplicateButton({ pageId, sectionId }: { pageId: string; sectionId: string }) {
  const [state, action, pending] = useActionState(duplicateSection, initialPageActionState);
  useBusyWhile(pending, "Duplicating");
  useFormToast(state, { successTitle: "Duplicated", errorTitle: "Could not duplicate it" });
  usePreviewRefresh(state);

  return (
    <form action={action}>
      <input type="hidden" name="page_id" value={pageId} />
      <input type="hidden" name="section_id" value={sectionId} />
      <IconButton label="Duplicate" disabled={pending}>
        <Copy className="size-4" aria-hidden />
      </IconButton>
    </form>
  );
}

/**
 * Delete, behind a confirmation.
 *
 * The only irreversible action in the builder, which is why it is the only one
 * that asks first — and why the dialog offers hiding instead, since that is
 * what the person usually meant and it is one button to the left.
 */
function DeleteButton({
  pageId,
  sectionId,
  label,
}: {
  pageId: string;
  sectionId: string;
  label: string;
}) {
  const [state, action, pending] = useActionState(deleteSection, initialPageActionState);
  const form = useRef<HTMLFormElement>(null);
  const confirm = useConfirm();

  useBusyWhile(pending, "Deleting");
  useFormToast(state, { successTitle: "Deleted", errorTitle: "Could not delete it" });
  usePreviewRefresh(state);

  return (
    <form action={action} ref={form} className="ml-auto">
      <input type="hidden" name="page_id" value={pageId} />
      <input type="hidden" name="section_id" value={sectionId} />

      {/*
        A real dialog, not `window.confirm`. The browser's own is unstyled,
        ignores the theme, names the origin rather than the company, and on
        some platforms offers to suppress every later dialog on the page.

        `type="button"` because the question has to be answered before the form
        is submitted, not after — an async handler on submit cannot hold a
        submission back once it has started.
      */}
      <IconButton
        label="Delete"
        disabled={pending}
        danger
        type="button"
        onClick={async () => {
          const yes = await confirm({
            title: `Delete the ${label} section?`,
            body: "It is removed from the page and cannot be brought back. To take it off the page without losing it, hide it instead.",
            confirmLabel: "Delete section",
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
 * `useActionState` returns the same object on unrelated re-renders, so the
 * comparison is against the object rather than its status — otherwise the
 * preview would reload on every keystroke elsewhere on the screen.
 */
function usePreviewRefresh(state: { status: string }) {
  const announced = useRef<unknown>(null);

  useEffect(() => {
    if (state.status !== "success" || announced.current === state) return;
    announced.current = state;
    requestPreviewRefresh();
  }, [state]);
}

function AddSection({ pageId }: { pageId: string }) {
  const [state, action, pending] = useActionState(addSection, initialPageActionState);
  useBusyWhile(pending, "Adding the section");
  useFormToast(state, { successTitle: "Section added", errorTitle: "Could not add it" });
  usePreviewRefresh(state);

  return (
    <form action={action} className="mt-4 rounded-xl border border-dashed border-border p-3">
      <input type="hidden" name="page_id" value={pageId} />

      <label htmlFor={`add-${pageId}`} className="sr-only">
        Section type
      </label>
      <select id={`add-${pageId}`} name="type" defaultValue="" className={cn(FIELD, "text-sm")}>
        <option value="" disabled>
          Choose a section…
        </option>
        {SECTION_TYPES.map((type) => (
          <option key={type} value={type}>
            {SECTION_DEFINITIONS[type].label}
          </option>
        ))}
      </select>

      <button
        type="submit"
        disabled={pending}
        className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-accent px-3.5 py-2 text-sm font-medium text-accent-fg transition-colors hover:bg-accent-hover disabled:pointer-events-none disabled:opacity-60"
      >
        <Plus className="size-4" aria-hidden />
        Add section
      </button>
    </form>
  );
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
