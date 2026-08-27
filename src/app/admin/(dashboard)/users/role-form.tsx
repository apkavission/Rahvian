"use client";

import { useActionState, useRef } from "react";
import { Trash2 } from "lucide-react";
import { BrandSpinner } from "@/components/brand/brand-loader";
import { useBusyWhile } from "@/components/forms/use-busy-while";
import { useFormToast } from "@/components/forms/use-form-toast";
import { Button } from "@/components/ui/button";
import { Field, FIELD } from "@/components/ui/field";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { ADMIN_NAV_ITEMS } from "@/components/admin/nav";
import type { RoleDefinition } from "@/lib/auth/roles";
import { deleteRole, saveRole } from "@/lib/actions/roles";
import { initialRecordState } from "@/lib/validation/records";
import { MenuChecklist } from "./menu-checklist";

/**
 * One role, as a form.
 *
 * The most consequential form in the panel: everything on it applies to every
 * account holding the role, at once, on their next request. So it says what
 * each switch actually does in the words of the thing it does — "sees
 * enquiries", not "can_manage_leads" — and the three that grant power are
 * grouped together rather than scattered between a name and a menu.
 *
 * A built-in role can be edited freely except for its key, which is stored on
 * every profile that holds it, and it cannot be deleted. Both are enforced by a
 * trigger as well; this form's job is to say so before somebody tries.
 */
export function RoleForm({
  role,
  /** The highest rank this owner may set. Their own. */
  ceiling,
  accountCount,
}: {
  role: RoleDefinition;
  ceiling: number;
  accountCount: number;
}) {
  const [state, formAction, pending] = useActionState(saveRole, initialRecordState);

  useBusyWhile(pending, "Saving the role");
  useFormToast(state, { successTitle: "Role saved", errorTitle: "Could not save" });

  const locked = role.rank > ceiling;

  return (
    <div className="space-y-6">
      {locked && (
        <p className="rounded-lg border border-warning/35 bg-warning-soft px-3.5 py-3 text-sm">
          This role has more authority than your own, so it can be read here but
          not changed.
        </p>
      )}

      <form action={formAction} className="space-y-8">
        <input type="hidden" name="key" value={role.key} />

        <fieldset disabled={locked} className="space-y-5">
          <legend className="sr-only">Name and authority</legend>

          <Field
            label="Name"
            required
            hint="What this role is called wherever an account names it."
            error={state.fieldErrors?.label}
          >
            {(id, describedBy) => (
              <input
                id={id}
                name="label"
                defaultValue={role.label}
                required
                aria-describedby={describedBy}
                className={FIELD}
              />
            )}
          </Field>

          <Field
            label="Description"
            hint="One or two sentences, shown under the role when somebody is being given it."
            error={state.fieldErrors?.description}
          >
            {(id, describedBy) => (
              <textarea
                id={id}
                name="description"
                defaultValue={role.description}
                rows={3}
                aria-describedby={describedBy}
                className={FIELD}
              />
            )}
          </Field>

          <Field
            label="Authority"
            required
            hint={`Higher outranks lower. Nobody can create or edit an account into a role above their own, so ${ceiling} is the highest you can set here.`}
            error={state.fieldErrors?.rank}
          >
            {(id, describedBy) => (
              <input
                id={id}
                name="rank"
                type="number"
                min={0}
                max={ceiling}
                step={1}
                defaultValue={role.rank}
                required
                aria-describedby={describedBy}
                className={`${FIELD} max-w-32`}
              />
            )}
          </Field>

          <div>
            <p className="font-mono text-[0.65rem] uppercase tracking-[0.16em] text-text-subtle">
              What it can do
            </p>
            <p className="measure mt-2 text-sm leading-relaxed text-text-muted">
              These three are read by the database itself, not only by the
              screens. Whatever is ticked here is what the tables will allow, and
              whatever is not is refused even to a request that goes round the
              panel entirely.
            </p>

            <div className="mt-4 space-y-3">
              <Switch
                name="is_active"
                label="In use"
                hint="Switch a role off to suspend everybody holding it at once, without editing a single account."
                defaultChecked={role.is_active}
              />
              <Switch
                name="is_staff"
                label="Reaches this admin panel"
                hint="Without this the account can sign in nowhere here, whatever its menu says."
                defaultChecked={role.is_staff}
              />
              <Switch
                name="can_manage_leads"
                label="Sees enquiries"
                hint="Commercial data. Content access must not imply this — give it deliberately."
                defaultChecked={role.can_manage_leads}
              />
              <Switch
                name="is_owner"
                label="Manages accounts and roles"
                hint="This screen, and the power to change every other role including this one. The strongest thing on the page."
                defaultChecked={role.is_owner}
              />
            </div>
          </div>
        </fieldset>

        <div className="border-t border-border pt-6">
          <MenuChecklist
            name="default_menu"
            items={ADMIN_NAV_ITEMS}
            selected={role.default_menu}
            legend="Default menu"
            hint="The screens everybody with this role reaches before anything is said about them individually. A person can be given more or fewer on their own account."
            disabled={locked}
          />
        </div>

        {state.status === "error" && !state.fieldErrors ? (
          <p role="alert" className="text-sm text-danger">
            {state.message}
          </p>
        ) : null}

        <div className="sticky bottom-0 -mx-6 border-t border-border bg-surface/90 px-6 py-4 backdrop-blur-md">
          <Button type="submit" disabled={pending || locked}>
            {pending ? (
              <>
                <BrandSpinner />
                Saving
              </>
            ) : (
              "Save role"
            )}
          </Button>
        </div>
      </form>

      <DeleteRole role={role} accountCount={accountCount} locked={locked} />
    </div>
  );
}

function Switch({
  name,
  label,
  hint,
  defaultChecked,
}: {
  name: string;
  label: string;
  hint: string;
  defaultChecked: boolean;
}) {
  return (
    <label className="flex items-start gap-3 rounded-lg border border-border bg-surface px-3.5 py-3">
      <input
        type="checkbox"
        name={name}
        defaultChecked={defaultChecked}
        className="mt-0.5 size-4 shrink-0 rounded-sm border-border-strong text-accent focus:ring-2 focus:ring-accent/20"
      />
      <span className="min-w-0">
        <span className="block text-sm font-medium">{label}</span>
        <span className="measure mt-0.5 block text-sm leading-relaxed text-text-muted">
          {hint}
        </span>
      </span>
    </label>
  );
}

/**
 * Delete, behind a confirmation, and refused for a role in use.
 *
 * The count is read on the server and shown here, so the reason a role cannot
 * go is visible before the button is pressed rather than after.
 */
function DeleteRole({
  role,
  accountCount,
  locked,
}: {
  role: RoleDefinition;
  accountCount: number;
  locked: boolean;
}) {
  const [state, formAction, pending] = useActionState(deleteRole, initialRecordState);
  const form = useRef<HTMLFormElement>(null);
  const confirm = useConfirm();

  useBusyWhile(pending, "Deleting the role");
  useFormToast(state, { successTitle: "Role deleted", errorTitle: "Could not delete it" });

  if (role.is_system) {
    return (
      <p className="rounded-lg border border-border bg-surface-2/50 px-3.5 py-3 text-sm text-text-muted">
        {role.label} is one of the roles the application is built around, so it
        cannot be deleted. Everything else about it — its name, its authority,
        its menu — is yours to change. If nobody should hold it, switch it off.
      </p>
    );
  }

  const blocked = accountCount > 0 || locked;

  return (
    <form action={formAction} ref={form}>
      <input type="hidden" name="key" value={role.key} />

      <button
        type="button"
        disabled={pending || blocked}
        onClick={async () => {
          const yes = await confirm({
            title: `Delete the ${role.label} role?`,
            body: "Nobody holds it, so nothing loses access. It cannot be brought back — a role of the same name would be a new row.",
            confirmLabel: "Delete role",
            tone: "danger",
          });
          if (yes) form.current?.requestSubmit();
        }}
        className="inline-flex items-center gap-2 rounded-lg border border-danger/40 bg-danger-soft px-4 py-2.5 text-sm font-medium text-danger transition-colors hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pending ? <BrandSpinner /> : <Trash2 className="size-4" aria-hidden />}
        Delete role
      </button>

      {accountCount > 0 && (
        <p className="mt-2 text-sm text-text-muted">
          {accountCount} {accountCount === 1 ? "account holds" : "accounts hold"}{" "}
          this role. Move them to another one first.
        </p>
      )}

      {state.status === "error" ? (
        <p role="alert" className="mt-2 text-sm text-danger">
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
