"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { saveStationery } from "@/lib/actions/letterhead";
import { idleLetterState } from "@/lib/letter-state";
import {
  LAYOUTS,
  statutoryGaps,
  type LayoutKey,
  type LetterheadCompany,
} from "@/lib/letterhead";
import {
  FIELD_SLOTS,
  FIELD_SOURCES,
  fieldId,
  moveField,
  resolveFields,
  type FieldSlot,
  type FieldSource,
  type LetterheadField,
} from "@/lib/letterhead-fields";
import { LetterheadSheet, SheetPreview } from "@/components/admin/letterhead/sheet";
import { FIELD, LABEL } from "@/components/ui/field";
import { cn } from "@/lib/utils";

/**
 * The company's own paper.
 *
 * ---------------------------------------------------------------------------
 * **The preview is the sheet, not a picture of one.** It is the same component
 * the print page renders, at 56%, so nothing can be true on screen and false
 * on paper.
 *
 * ---------------------------------------------------------------------------
 * **The blocks are a list, and the list is the design.** Adding a field
 * appends to it; dragging a row reorders it; a row with nothing in it is drawn
 * nowhere. Each row also has an up and a down button, because a list that can
 * only be reordered by dragging cannot be reordered by somebody using a
 * keyboard — and the two paths call the same `moveField()` so they cannot
 * disagree.
 */
export function StationeryForm({
  company,
  initial,
}: {
  company: LetterheadCompany;
  initial: {
    layout: LayoutKey;
    accent: string;
    logoScale: number;
    footerNote: string;
    fields: LetterheadField[];
  };
}) {
  const [state, action, pending] = useActionState(saveStationery, idleLetterState);

  const [layout, setLayout] = useState<LayoutKey>(initial.layout);
  const [accent, setAccent] = useState(initial.accent);
  const [logoScale, setLogoScale] = useState(initial.logoScale);
  const [footerNote, setFooterNote] = useState(initial.footerNote);
  const [fields, setFields] = useState<LetterheadField[]>(initial.fields);

  const [dragging, setDragging] = useState<string | null>(null);
  const [adding, setAdding] = useState<FieldSource>("custom");

  const gaps = statutoryGaps(company);

  const patch = (id: string, change: Partial<LetterheadField>) =>
    setFields((was) => was.map((field) => (field.id === id ? { ...field, ...change } : field)));

  const add = () => {
    const source = FIELD_SOURCES.find((entry) => entry.key === adding);
    setFields((was) => [
      ...was,
      {
        id: fieldId(),
        source: adding,
        label: source && adding !== "custom" ? source.label : "",
        value: "",
        slot: "footer",
        showLabel: adding === "custom" || adding === "cin" || adding === "gst",
      },
    ]);
  };

  /* What is on the page right now, so the screen can say what is not. */
  const drawn = new Set(
    [
      ...resolveFields(company, fields, "header", { hasBand: layout === "band" }),
      ...resolveFields(company, fields, "band", { hasBand: layout === "band" }),
      ...resolveFields(company, fields, "footer", { hasBand: layout === "band" }),
    ].map((field) => field.id),
  );

  return (
    <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_auto]">
      <form action={action} className="space-y-8">
        {/* The blocks travel as one JSON field: they are an ordered list, and
            a form cannot post an order any other way without inventing index
            names that break the moment a row is removed. */}
        <input type="hidden" name="fields" value={JSON.stringify(fields)} />

        {/* ------------------------------------------------- what the law asks */}

        <section
          className={cn(
            "rounded-lg border p-5",
            gaps.length === 0
              ? "border-border bg-surface"
              : "border-amber-400/60 bg-amber-50 dark:bg-amber-950/20",
          )}
        >
          <h2 className="text-sm font-semibold">What has to be on the page</h2>

          <p className="mt-2 text-sm leading-relaxed text-text-muted">
            Section 12(3)(c) of the Companies Act 2013 requires a company to
            print its name, registered office address, CIN, telephone number,
            email and website on every business letter. All six come from{" "}
            <Link href="/admin/settings" className="text-accent hover:underline">
              Settings
            </Link>{" "}
            — the same row the website&rsquo;s footer reads, so the address on
            the paper cannot disagree with the address on the site.
          </p>

          {gaps.length === 0 ? (
            <p className="mt-3 text-sm font-medium text-text">All six are filled in.</p>
          ) : (
            <>
              <p className="mt-3 text-sm font-medium text-text">
                {gaps.length} of the six {gaps.length === 1 ? "is" : "are"} empty in Settings, so
                nothing is printed for {gaps.length === 1 ? "it" : "them"}.
              </p>
              <ul className="mt-2 space-y-1 text-sm text-text-muted">
                {gaps.map((field) => (
                  <li key={field.key}>
                    <span className="font-medium text-text">{field.label}</span> — {field.why}
                  </li>
                ))}
              </ul>
            </>
          )}

          <p className="mt-3 text-xs text-text-subtle">
            Stated from the Act as it is commonly applied to a private limited
            company. It is not advice — and a lawyer is already needed for the
            legal pages, so it is worth one question while they are looking.
          </p>
        </section>

        {/* ------------------------------------------------------ the layout */}

        <fieldset>
          <legend className="text-sm font-semibold">Arrangement</legend>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {LAYOUTS.map((option) => (
              <label
                key={option.key}
                className={cn(
                  "flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors",
                  layout === option.key
                    ? "border-accent bg-accent/5"
                    : "border-border hover:bg-surface-2",
                )}
              >
                <input
                  type="radio"
                  name="layout"
                  value={option.key}
                  checked={layout === option.key}
                  onChange={() => setLayout(option.key)}
                  className="mt-1"
                />
                <span>
                  <span className="block text-sm font-medium">{option.label}</span>
                  <span className="mt-0.5 block text-xs leading-relaxed text-text-muted">
                    {option.note}
                  </span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        {/* ------------------------------------------------------ the blocks */}

        <fieldset>
          <legend className="text-sm font-semibold">What is on the paper</legend>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-text-muted">
            Drag a row to move it, or use the arrows. Anything that is empty in
            Settings is simply not printed — the row below it closes the gap,
            so there is never a label with nothing after it.
          </p>

          <ul className="mt-4 space-y-2">
            {fields.map((field, index) => {
              const source = FIELD_SOURCES.find((entry) => entry.key === field.source);
              const shown = drawn.has(field.id);

              return (
                <li
                  key={field.id}
                  draggable
                  onDragStart={() => setDragging(field.id)}
                  onDragEnd={() => setDragging(null)}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => {
                    event.preventDefault();
                    if (dragging && dragging !== field.id) {
                      setFields((was) => moveField(was, dragging, index));
                    }
                    setDragging(null);
                  }}
                  className={cn(
                    "rounded-lg border bg-surface p-3 transition-colors",
                    dragging === field.id ? "border-accent opacity-60" : "border-border",
                  )}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      aria-hidden
                      title="Drag to move"
                      className="cursor-grab select-none px-1 text-text-subtle"
                    >
                      ⠿
                    </span>

                    <span className="min-w-28 text-sm font-medium">
                      {source?.label ?? field.source}
                    </span>

                    {field.source === "custom" ? (
                      <>
                        <input
                          value={field.label}
                          onChange={(event) => patch(field.id, { label: event.target.value })}
                          placeholder="Label — PAN, Udyam, Bank"
                          maxLength={60}
                          aria-label="Field label"
                          className={cn(FIELD, "w-40 py-1.5 text-sm")}
                        />
                        <input
                          value={field.value}
                          onChange={(event) => patch(field.id, { value: event.target.value })}
                          placeholder="What it says"
                          maxLength={300}
                          aria-label="Field value"
                          className={cn(FIELD, "min-w-40 flex-1 py-1.5 text-sm")}
                        />
                      </>
                    ) : (
                      <input
                        value={field.label}
                        onChange={(event) => patch(field.id, { label: event.target.value })}
                        placeholder="Label"
                        maxLength={60}
                        aria-label="Field label"
                        className={cn(FIELD, "w-40 py-1.5 text-sm")}
                      />
                    )}

                    <select
                      value={field.slot}
                      onChange={(event) =>
                        patch(field.id, { slot: event.target.value as FieldSlot })
                      }
                      aria-label="Where it goes"
                      className={cn(FIELD, "w-44 py-1.5 text-sm")}
                    >
                      {FIELD_SLOTS.map((slot) => (
                        <option key={slot.key} value={slot.key}>
                          {slot.label}
                        </option>
                      ))}
                    </select>

                    <label className="flex items-center gap-1.5 text-xs text-text-muted">
                      <input
                        type="checkbox"
                        checked={field.showLabel}
                        onChange={(event) => patch(field.id, { showLabel: event.target.checked })}
                        className="size-3.5 rounded border-border"
                      />
                      show label
                    </label>

                    <div className="ml-auto flex items-center gap-1">
                      <button
                        type="button"
                        aria-label="Move up"
                        disabled={index === 0}
                        onClick={() => setFields((was) => moveField(was, field.id, index - 1))}
                        className="rounded px-2 py-1 text-xs text-text-muted hover:bg-surface-2 disabled:opacity-40"
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        aria-label="Move down"
                        disabled={index === fields.length - 1}
                        onClick={() => setFields((was) => moveField(was, field.id, index + 1))}
                        className="rounded px-2 py-1 text-xs text-text-muted hover:bg-surface-2 disabled:opacity-40"
                      >
                        ↓
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setFields((was) => was.filter((entry) => entry.id !== field.id))
                        }
                        className="rounded px-2 py-1 text-xs text-text-muted hover:bg-surface-2 hover:text-red-600 dark:hover:text-red-400"
                      >
                        Remove
                      </button>
                    </div>
                  </div>

                  {!shown && (
                    <p className="mt-2 pl-6 text-xs text-text-subtle">
                      {field.source === "custom"
                        ? "Nothing typed in, so this is not printed."
                        : "Empty in Settings, so this is not printed."}
                    </p>
                  )}
                  {shown && source?.hint && (
                    <p className="mt-2 pl-6 text-xs text-text-subtle">{source.hint}</p>
                  )}
                </li>
              );
            })}
          </ul>

          {fields.length === 0 && (
            <p className="mt-4 rounded-lg border border-dashed border-border p-6 text-center text-sm text-text-muted">
              No blocks. The letterhead will print the company name and nothing
              else — add what belongs on it.
            </p>
          )}

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <select
              value={adding}
              onChange={(event) => setAdding(event.target.value as FieldSource)}
              aria-label="What to add"
              className={cn(FIELD, "w-64 py-2 text-sm")}
            >
              {FIELD_SOURCES.map((source) => (
                <option key={source.key} value={source.key}>
                  {source.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={add}
              className="rounded-full border border-border px-4 py-2 text-sm font-medium transition-colors hover:bg-surface-2"
            >
              Add this field
            </button>
            <span className="text-xs text-text-subtle">
              &ldquo;Something else&rdquo; takes any label and value — a PAN, a
              Udyam number, a bank account, a second office.
            </span>
          </div>
        </fieldset>

        {/* ------------------------------------------------------- the detail */}

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <span className={LABEL}>The rule and the band</span>
            <div className="mt-1.5 flex items-center gap-3">
              <input
                type="color"
                value={/^#[0-9a-fA-F]{6}$/.test(accent) ? accent : "#000000"}
                onChange={(event) => setAccent(event.target.value)}
                aria-label="Letterhead colour"
                className="size-10 shrink-0 cursor-pointer rounded-md border border-border bg-surface p-1"
              />
              <input
                name="accent"
                value={accent}
                onChange={(event) => setAccent(event.target.value)}
                spellCheck={false}
                className={cn(FIELD, "font-mono text-xs")}
              />
            </div>
            <p className="mt-1 text-xs text-text-subtle">
              Set it to the logo&rsquo;s own colour. A rule that fights the mark
              is the commonest thing wrong with a letterhead.
            </p>
            {state.fieldErrors?.accent && (
              <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                {state.fieldErrors.accent}
              </p>
            )}
          </div>

          <div>
            <label className={LABEL} htmlFor="logo_scale">
              Mark size — {logoScale}%
            </label>
            <input
              id="logo_scale"
              name="logo_scale"
              type="range"
              min={40}
              max={220}
              step={5}
              value={logoScale}
              onChange={(event) => setLogoScale(Number(event.target.value))}
              className="mt-3 w-full"
            />
            <p className="mt-1 text-xs text-text-subtle">
              {company.logo.light
                ? "A logo is drawn at whatever size its file happens to be, and on paper that is almost never right."
                : "No logo uploaded yet — add one under Settings and it appears here."}
            </p>
          </div>
        </div>

        <div>
          <label className={LABEL} htmlFor="footer_note">
            One more line at the very foot
          </label>
          <input
            id="footer_note"
            name="footer_note"
            value={footerNote}
            onChange={(event) => setFooterNote(event.target.value)}
            maxLength={200}
            placeholder="An ISO number, or “This is a computer-generated letter”"
            className={cn(FIELD, "mt-1.5")}
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 border-t border-border pt-5">
          <button
            type="submit"
            disabled={pending}
            className="rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-accent-fg transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {pending ? "Saving" : "Save the letterhead"}
          </button>

          <a
            href="/admin/print/letterhead"
            target="_blank"
            rel="noreferrer"
            className="rounded-full border border-border px-5 py-2.5 text-sm font-medium transition-colors hover:bg-surface-2"
          >
            Download the blank sheet
          </a>

          {state.status !== "idle" && !pending && (
            <span
              role="status"
              className={cn(
                "text-sm",
                state.status === "error" ? "text-red-600 dark:text-red-400" : "text-text-muted",
              )}
            >
              {state.message}
            </span>
          )}
        </div>

        <p className="text-xs text-text-subtle">
          The blank sheet opens the print dialogue, where &ldquo;Save as
          PDF&rdquo; gives a file to send to a printer or to keep.
          {layout === "band" &&
            " The side band runs to the edge of the paper: a press needs 3mm of bleed for that, and a desk printer will stop about 4mm short of the edge."}
        </p>
      </form>

      {/* ------------------------------------------------------- the preview */}

      <div className="xl:sticky xl:top-6">
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-text-subtle">
          A4, at 56%
        </p>
        <SheetPreview scale={0.56}>
          <LetterheadSheet
            company={company}
            options={{ layout, accent, logoScale, footerNote, fields }}
            blank
          />
        </SheetPreview>
        <p className="mt-2 max-w-[112mm] text-xs text-text-subtle">
          The dashed box is where the letter goes and is never printed.
          Everything else is exactly what comes out of the printer.
        </p>
      </div>
    </div>
  );
}
