"use client";

import { useActionState, useState } from "react";
import { BrandSpinner } from "@/components/brand/brand-loader";
import { useBusyWhile } from "@/components/forms/use-busy-while";
import { useFormToast } from "@/components/forms/use-form-toast";
import { Button } from "@/components/ui/button";
import { Field, FIELD } from "@/components/ui/field";
import { GRANTABLE_ITEMS, resolveMenu } from "@/lib/auth/menu";
import { roleByKey, type RoleDefinition } from "@/lib/auth/roles";
import { saveAccount } from "@/lib/actions/users";
import { APP_ACCESS_OPTIONS, initialAccountState } from "@/lib/validation/users";
import { formatCoordinates } from "@/lib/coordinates";
import { MenuChecklist } from "./menu-checklist";
import { WorkplaceFields } from "./workplace-fields";

export interface AccountFormValues {
  id: string;
  full_name: string;
  role: string;
  app_access: string[];
  menu_extra: string[];
  menu_denied: string[];
  address: string | null;
  work_latitude: number | null;
  work_longitude: number | null;
  work_radius_metres: number;
}

/**
 * One account, as a form.
 *
 * Four things, in the order they are decided: who they are, what they are,
 * which applications they reach, and which screens of this one they see. The
 * fourth reads as an adjustment of the second, which is exactly what it is —
 * the ticks start at the role's own menu and the ones that differ are marked.
 *
 * What is deliberately *not* here: blocking, and the password. Both sit in
 * their own panel below, because both are things you do to an account rather
 * than fields you edit about it, and neither should be a side effect of
 * pressing Save on a name change.
 */
export function AccountForm({
  values,
  roles,
  assignable,
  isSelf,
}: {
  values: AccountFormValues;
  roles: RoleDefinition[];
  /** The roles this owner may hand out. Never more authority than their own. */
  assignable: RoleDefinition[];
  isSelf: boolean;
}) {
  const [state, formAction, pending] = useActionState(saveAccount, initialAccountState);
  const [roleKey, setRoleKey] = useState(values.role);

  useBusyWhile(pending, "Saving the account");
  useFormToast(state, { successTitle: "Account saved", errorTitle: "Could not save" });

  const role = roleByKey(roles, roleKey);
  const current = roleByKey(roles, values.role);

  // What they reach today, so the ticks open at the truth rather than at the
  // role default with the person's own grants quietly missing.
  const reaches = resolveMenu(values, current);

  return (
    <form action={formAction} className="space-y-8">
      <input type="hidden" name="id" value={values.id} />

      <div className="space-y-5">
        <Field
          label="Name"
          required
          hint="As they would introduce themselves. Shown in the panel and on anything they are assigned."
          error={state.fieldErrors?.full_name}
        >
          {(id, describedBy) => (
            <input
              id={id}
              name="full_name"
              defaultValue={values.full_name}
              required
              aria-describedby={describedBy}
              className={FIELD}
            />
          )}
        </Field>

        <Field
          label="Role"
          required
          hint={role?.description || "What this account is, and what it can do by default."}
          error={state.fieldErrors?.role}
        >
          {(id, describedBy) => (
            <select
              id={id}
              name="role"
              value={roleKey}
              onChange={(event) => setRoleKey(event.target.value)}
              disabled={isSelf}
              aria-describedby={describedBy}
              className={FIELD}
            >
              {assignable.map((option) => (
                <option key={option.key} value={option.key}>
                  {option.label}
                </option>
              ))}

              {/*
                The role they hold, listed even when it is not one this owner
                may assign — a super admin edited by an owner, say. Disabled, so
                it can be seen but not chosen, and the select is not silently
                showing somebody a role other than the one they have.
              */}
              {!assignable.some((option) => option.key === values.role) && (
                <option value={values.role} disabled>
                  {current?.label ?? values.role} (you cannot assign this)
                </option>
              )}
            </select>
          )}
        </Field>

        {/*
          A disabled select posts nothing, so the role would arrive missing and
          be reported as a validation error on a field the person was not
          allowed to touch. The hidden input is what makes "you cannot change
          this" mean "it stays as it is".
        */}
        {isSelf && <input type="hidden" name="role" value={values.role} />}

        {isSelf && (
          <p className="rounded-lg border border-border bg-surface-2/50 px-3.5 py-3 text-sm text-text-muted">
            This is your own account, so its role is fixed here. Ask another
            owner to change it — that way there is always somebody who can undo
            it.
          </p>
        )}
      </div>

      <fieldset className="border-t border-border pt-6">
        <legend className="sr-only">Applications</legend>
        <h3 className="font-mono text-[0.65rem] uppercase tracking-[0.16em] text-text-subtle">
          Applications
        </h3>
        <p className="measure mt-2 text-sm leading-relaxed text-text-muted">
          One login serves the whole estate, and this is what scopes it. An
          account granted the task tracker does not reach this panel, and an
          account granted this one does not reach the tracker.
        </p>

        <div className="mt-4 grid gap-x-6 gap-y-2 sm:grid-cols-2">
          {APP_ACCESS_OPTIONS.map((app) => (
            <label key={app.value} className="flex items-start gap-3 rounded-lg px-2 py-1.5 text-sm">
              <input
                type="checkbox"
                name="app_access"
                value={app.value}
                defaultChecked={values.app_access.includes(app.value)}
                className="mt-0.5 size-4 shrink-0 rounded-sm border-border-strong text-accent focus:ring-2 focus:ring-accent/20"
              />
              <span className="min-w-0">
                <span className="block">{app.label}</span>
                {app.hint && (
                  <span className="block text-xs text-text-subtle">{app.hint}</span>
                )}
              </span>
            </label>
          ))}
        </div>

        {state.fieldErrors?.app_access && (
          <p className="mt-2 text-sm text-danger">{state.fieldErrors.app_access}</p>
        )}
      </fieldset>

      <WorkplaceFields
        address={values.address}
        coordinates={formatCoordinates(values.work_latitude, values.work_longitude)}
        radiusMetres={values.work_radius_metres}
        error={state.fieldErrors?.coordinates}
      />

      <div className="border-t border-border pt-6">
        <MenuChecklist
          name="menu"
          items={GRANTABLE_ITEMS}
          selected={GRANTABLE_ITEMS.filter((item) => reaches.has(item.key)).map(
            (item) => item.key,
          )}
          baseline={role?.default_menu ?? []}
          legend="Screens"
          hint="The role's own menu, adjusted for this person. Anything marked Added or Removed is a difference from the role — change the role and the rest follows it. The accounts screen is not here: it is what an owner is, not a screen to hand out."
        />
      </div>

      <div className="sticky bottom-0 -mx-6 border-t border-border bg-surface/90 px-6 py-4 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <Button type="submit" disabled={pending}>
            {pending ? (
              <>
                <BrandSpinner />
                Saving
              </>
            ) : (
              "Save account"
            )}
          </Button>

          {state.status === "error" && !state.fieldErrors ? (
            <p role="alert" className="text-sm text-danger">
              {state.message}
            </p>
          ) : null}
        </div>
      </div>
    </form>
  );
}
