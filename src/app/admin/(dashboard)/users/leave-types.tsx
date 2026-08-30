"use client";

import { useActionState, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { BrandSpinner } from "@/components/brand/brand-loader";
import { useFormToast } from "@/components/forms/use-form-toast";
import { Button } from "@/components/ui/button";
import { Field, FIELD } from "@/components/ui/field";
import {
  createLeaveType,
  deleteLeaveType,
  saveLeaveType,
} from "@/lib/actions/leave-types";
import type { LeaveTypeDefinition } from "@/lib/queries/leave-types";
import { initialRecordState } from "@/lib/validation/records";
import { cn } from "@/lib/utils";

/**
 * The kinds of leave the company offers.
 *
 * Master data since 2026-08-30, on the owner's instruction — the task tracker
 * has no list of its own and shows exactly what is here. Adding one appears in
 * the tracker's leave form on the next request; switching one off stops it being
 * offered without touching a single past request.
 *
 * **Two flags that are not decoration**, and both are labelled with what they
 * do rather than with their column name:
 *
 *   *Counts against an allowance* decides whether the tracker shows somebody a
 *   balance for it. Off for unpaid leave, so nobody is told they have "-3 left"
 *   of something that was never rationed.
 *
 *   *Paid* is the one fact payroll needs, recorded once here rather than by
 *   remembering which names mean unpaid.
 */
export function LeaveTypes({ types }: { types: LeaveTypeDefinition[] }) {
  const [adding, setAdding] = useState(false);

  return (
    <div className="mt-8 max-w-3xl">
      <p className="measure text-sm leading-relaxed text-text-muted">
        Every kind of leave the task tracker offers. It has no list of its own:
        what is here is what employees can ask for, and a type switched off stops
        being offered while everything already recorded against it stays
        readable.
      </p>

      {types.length === 0 ? (
        <p className="mt-6 rounded-xl border border-warning/35 bg-warning-soft px-4 py-3 text-sm">
          There are no leave types yet. Until the migration that creates this
          list has been run, the tracker&rsquo;s leave form has nothing to offer
          — it says so rather than showing an empty dropdown.
        </p>
      ) : (
        <ul className="mt-6 space-y-3">
          {types.map((type) => (
            <li key={type.key}>
              <LeaveTypeRow type={type} />
            </li>
          ))}
        </ul>
      )}

      <div className="mt-8 border-t border-border pt-6">
        {adding ? (
          <NewLeaveType onDone={() => setAdding(false)} />
        ) : (
          <Button type="button" variant="secondary" onClick={() => setAdding(true)}>
            <Plus className="size-4" aria-hidden />
            Add a leave type
          </Button>
        )}
      </div>
    </div>
  );
}

function LeaveTypeRow({ type }: { type: LeaveTypeDefinition }) {
  const [state, action, pending] = useActionState(saveLeaveType, initialRecordState);
  useFormToast(state, { successTitle: "Leave type saved", errorTitle: "Could not save" });

  return (
    <form
      action={action}
      className={cn(
        "rounded-xl border border-border bg-surface p-4",
        !type.is_active && "opacity-70",
      )}
    >
      <input type="hidden" name="key" value={type.key} />

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-mono text-[0.65rem] uppercase tracking-[0.12em] text-text-subtle">
            {type.key}
            {type.is_system && " · built in"}
          </p>

          <div className="mt-2 flex flex-wrap items-center gap-2">
            <input
              name="label"
              defaultValue={type.label}
              required
              maxLength={60}
              aria-label={`Name for ${type.key}`}
              className={cn(FIELD, "w-44 py-1.5 text-sm")}
            />
            <input
              name="sort_order"
              type="number"
              min={0}
              max={9999}
              step={10}
              defaultValue={type.sort_order}
              aria-label={`Order for ${type.key}`}
              className={cn(FIELD, "w-20 py-1.5 text-sm")}
            />
          </div>

          <input
            name="description"
            defaultValue={type.description}
            maxLength={300}
            placeholder="What it is for — shown under the picker in the tracker."
            aria-label={`Description for ${type.key}`}
            className={cn(FIELD, "mt-2 w-full py-1.5 text-sm")}
          />

          <div className="mt-3 flex flex-wrap gap-4 text-sm">
            <Tick name="is_paid" label="Paid" checked={type.is_paid} typeKey={type.key} />
            <Tick
              name="needs_balance"
              label="Counts against an allowance"
              checked={type.needs_balance}
              typeKey={type.key}
            />
            <Tick
              name="is_active"
              label="Offered"
              checked={type.is_active}
              typeKey={type.key}
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button type="submit" variant="secondary" disabled={pending} className="py-2 text-sm">
            {pending ? <BrandSpinner className="size-3" /> : null}
            {pending ? "Saving" : "Save"}
          </Button>

          {!type.is_system && <RemoveLeaveType typeKey={type.key} label={type.label} />}
        </div>
      </div>

      {state.status === "error" && state.message && (
        <p role="alert" className="mt-2 text-sm text-danger">
          {state.message}
        </p>
      )}
    </form>
  );
}

function Tick({
  name,
  label,
  checked,
  typeKey,
}: {
  name: string;
  label: string;
  checked: boolean;
  typeKey: string;
}) {
  return (
    <label className="flex items-center gap-2" htmlFor={`${typeKey}-${name}`}>
      <input
        id={`${typeKey}-${name}`}
        type="checkbox"
        name={name}
        defaultChecked={checked}
        className="size-4 rounded-sm border-border-strong text-accent focus:ring-2 focus:ring-accent/20"
      />
      {label}
    </label>
  );
}

function RemoveLeaveType({ typeKey, label }: { typeKey: string; label: string }) {
  const [state, action, pending] = useActionState(deleteLeaveType, initialRecordState);
  useFormToast(state, { successTitle: "Leave type removed", errorTitle: "Not removed" });

  return (
    <form action={action}>
      <input type="hidden" name="key" value={typeKey} />
      <button
        type="submit"
        disabled={pending}
        aria-label={`Remove ${label}`}
        className="rounded-lg p-2 text-text-subtle transition-colors hover:bg-surface-2 hover:text-danger disabled:opacity-50"
      >
        <Trash2 className="size-4" aria-hidden />
      </button>
    </form>
  );
}

/**
 * Adding one.
 *
 * The key is asked for once and never again — it is what every request recorded
 * against this type will point at, so it is fixed from the moment it is saved.
 * The form says so, because somebody typing `cl` as a shortcut deserves to know
 * before pressing the button rather than a year later.
 */
function NewLeaveType({ onDone }: { onDone: () => void }) {
  const [state, action, pending] = useActionState(createLeaveType, initialRecordState);
  useFormToast(state, { successTitle: "Leave type added", errorTitle: "Could not add" });

  return (
    <form action={action} className="space-y-5 rounded-xl border border-border bg-surface p-5">
      <h3 className="text-sm font-medium">A new kind of leave</h3>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Name"
          required
          hint="What people will see — Maternity, Bereavement, Study."
          error={state.fieldErrors?.label}
        >
          {(id, describedBy) => (
            <input
              id={id}
              name="label"
              required
              maxLength={60}
              aria-describedby={describedBy}
              className={FIELD}
            />
          )}
        </Field>

        <Field
          label="Key"
          required
          hint="Permanent. Every request recorded against this type points at it, so it can never be changed — lower case, no spaces."
          error={state.fieldErrors?.key}
        >
          {(id, describedBy) => (
            <input
              id={id}
              name="key"
              required
              maxLength={40}
              placeholder="maternity"
              aria-describedby={describedBy}
              className={FIELD}
            />
          )}
        </Field>
      </div>

      <Field label="Description" hint="Shown under the picker in the tracker.">
        {(id, describedBy) => (
          <input
            id={id}
            name="description"
            maxLength={300}
            aria-describedby={describedBy}
            className={FIELD}
          />
        )}
      </Field>

      <div className="flex flex-wrap gap-4 text-sm">
        <Tick name="is_paid" label="Paid" checked typeKey="new" />
        <Tick
          name="needs_balance"
          label="Counts against an allowance"
          checked
          typeKey="new"
        />
        <Tick name="is_active" label="Offered" checked typeKey="new" />
      </div>

      <input type="hidden" name="sort_order" value={900} />

      {state.status === "error" && state.message && !state.fieldErrors && (
        <p role="alert" className="text-sm text-danger">
          {state.message}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? <BrandSpinner /> : <Plus className="size-4" aria-hidden />}
          {pending ? "Adding" : "Add it"}
        </Button>
        <Button type="button" variant="ghost" onClick={onDone}>
          Never mind
        </Button>
      </div>
    </form>
  );
}
