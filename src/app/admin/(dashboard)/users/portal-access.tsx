"use client";

import { useActionState, useState } from "react";
import { BrandSpinner } from "@/components/brand/brand-loader";
import { Button } from "@/components/ui/button";
import { FIELD, LABEL } from "@/components/ui/field";
import { savePortalStaff } from "@/lib/actions/portal-staff";
import type { RoleDefinition } from "@/lib/auth/roles";
import type { DesignationRow } from "@/types/control";
import { cn } from "@/lib/utils";
import type { PortalStaffRow } from "@/types/control";

/**
 * One person's access to the portal and the task tracker, from this screen.
 *
 * ---------------------------------------------------------------------------
 * **Why it is here at all.**
 *
 * The portal had its own Team screen, and `portal.staff` has carried this
 * comment since it was created: *"a person who joins or leaves must be added or
 * removed in both."* Two lists of people, kept in step by remembering to — and
 * the tracker decides who may sign in by looking for a row in that list, so
 * forgetting is not an inconvenience, it is somebody keeping access after they
 * have gone. The owner asked for one place. This is it.
 *
 * ---------------------------------------------------------------------------
 * **Three things are decided here**: the role, whether they may sign in at
 * all, and which screens they reach.
 *
 * The last one arrived late, and only because the portal's role-to-screen map
 * moved into `company.roles.portal_menu` first. While it lived in the portal's
 * own TypeScript, editing a grant from here would have meant copying that map
 * into this application — a second list of what each role sees, kept in step
 * by remembering to, which is the exact duplication this screen exists to end.
 * It is master data now, so the checkboxes below read it rather than repeat it.
 */
export function PortalAccess({
  person,
  roles,
  designations,
}: {
  person: PortalStaffRow | null;
  /** The master list, so the options here are the same ones Users offers. */
  roles: RoleDefinition[];
  designations: DesignationRow[];
}) {
  const [state, action, pending] = useActionState(savePortalStaff, {
    status: "idle" as const,
    message: "",
  });

  /*
    The role being edited, held here rather than read at submit time.

    A per-person grant is stored as a difference from the role's default menu,
    so changing the role changes what counts as a difference. Keeping it in
    state is what lets the ticks below recompute against the role about to be
    saved rather than the one that was on screen when the page loaded — the
    same rule the portal's own team screen had, for the same reason.
  */
  const [roleKey, setRoleKey] = useState(person?.role_key ?? "");

  /* Whether the portal role chosen here is itself an owner role. The
     warning below is about the two *disagreeing*, not about being an owner. */
  const roleIsOwner = roles.some((role) => role.key === roleKey && role.is_owner);

  if (!person) {
    return (
      <section className="surface-raised rounded-2xl border border-border p-6">
        <h2 className="font-display text-base font-semibold">Portal and tracker</h2>
        <p className="mt-3 text-sm text-text-muted">
          This account has no row on the portal&rsquo;s staff list, so it cannot
          sign in to the internal panel or the task tracker.
        </p>
        <p className="mt-3 text-sm text-text-subtle">
          Adding one is not possible from here yet — a staff row has to be
          matched to the same auth account, and that flow is still to be built.
        </p>
      </section>
    );
  }

  return (
    <section className="surface-raised rounded-2xl border border-border p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-display text-base font-semibold">Portal and tracker</h2>
        <p className="font-mono text-xs uppercase tracking-[0.14em] text-text-subtle">
          {person.role_label}
        </p>
      </div>

      <p className="mt-2 text-sm text-text-muted">
        The same sign-in opens the internal panel and the task tracker. What they
        may do in both is decided by this role.
      </p>

      <form action={action} className="mt-5 space-y-5">
        <input type="hidden" name="id" value={person.id} />

        <div>
          <label htmlFor="portal-role" className={LABEL}>
            Role in the portal and tracker
          </label>
          <select
            id="portal-role"
            name="role_key"
            value={roleKey}
            onChange={(event) => setRoleKey(event.target.value)}
            className={cn(FIELD, "mt-1.5")}
          >
            {/* Only active roles. A role switched off is how a whole class of
                account is suspended, and offering it here would undo that. */}
            {roles
              .filter((role) => role.is_active)
              .map((role) => (
                <option key={role.key} value={role.key}>
                  {role.label}
                </option>
              ))}
          </select>
        </div>

        {/*
          Under the role, and deliberately so.

          The two are confused constantly — "make him a senior developer" means
          a title, not access — and the fastest way to say they are different
          things is to show them one above the other with different words.
        */}
        <div>
          <label htmlFor="portal-designation" className={LABEL}>
            Designation
          </label>
          <select
            id="portal-designation"
            name="designation_key"
            defaultValue={person.designation_key ?? ""}
            className={cn(FIELD, "mt-1.5")}
          >
            {/* First, and it clears the title. Somebody can work here before
                anybody decides what to call them, and a blank is better than a
                wrong one. */}
            <option value="">No designation</option>

            {designations.map((designation) => (
              <option key={designation.key} value={designation.key}>
                {designation.label}
              </option>
            ))}
          </select>
          <p className="mt-1.5 text-sm text-text-subtle">
            What they are called — on an offer letter, and beside their name on a
            project. It decides nothing about what they can open; the role above
            does that.
          </p>
        </div>

        {/*
          Two dates, both optional.

          They drive the birthday and anniversary list in the tracker, and
          nobody is required to give either — somebody who would rather not have
          their birthday announced simply has no date here, and no screen asks
          them twice.
        */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="portal-dob" className={LABEL}>
              Date of birth
            </label>
            <input
              id="portal-dob"
              name="date_of_birth"
              type="date"
              defaultValue={person.date_of_birth ?? ""}
              className={cn(FIELD, "mt-1.5")}
            />
          </div>

          <div>
            <label htmlFor="portal-joined" className={LABEL}>
              Joined on
            </label>
            <input
              id="portal-joined"
              name="joined_on"
              type="date"
              defaultValue={person.joined_on ?? ""}
              className={cn(FIELD, "mt-1.5")}
            />
          </div>
        </div>

        {/*
          When the portal role and the website role disagree.

          `control.is_owner()` reads the WEBSITE role, so somebody can be a
          developer on every screen they use and still hold the whole estate.
          Said here because this is the screen where it gets fixed.
        */}
        {person.holds_the_estate && !roleIsOwner && (
          <p
            role="status"
            className="rounded-lg border border-warning/40 bg-warning-soft px-3 py-2.5 text-sm text-warning"
          >
            This account holds the whole estate through its website role — it can
            manage all staff and read every salary slip — while the portal calls
            it &ldquo;{person.role_label}&rdquo;. Change the website role on the
            Users tab if that is not intended.
          </p>
        )}

        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            name="is_active"
            defaultChecked={person.is_active}
            className="mt-1 size-4 shrink-0 rounded border-border-strong"
          />
          <span>
            <span className="block text-sm font-medium">
              They may sign in to the portal and tracker
            </span>
            <span className="block text-sm text-text-subtle">
              Clearing this stops both at once. It is not a deletion — their work
              and their history stay exactly where they are.
            </span>
          </span>
        </label>

        <PortalScreens person={person} roles={roles} roleKey={roleKey} />

        {!person.has_company_account && (
          <p className="rounded-xl border border-warning/40 bg-warning/5 p-4 text-sm text-text-muted">
            This person is on the portal&rsquo;s list but has no account on this
            website — so they can open the tracker and not this panel. That is
            the split this screen exists to make visible.
          </p>
        )}

        <div className="flex items-center gap-3">
          <Button type="submit" disabled={pending}>
            {pending && <BrandSpinner className="mr-2" />}
            Save portal access
          </Button>

          {state.status !== "idle" && (
            <p
              role="status"
              className={cn(
                "text-sm",
                state.status === "error" ? "text-danger" : "text-text-muted",
              )}
            >
              {state.message}
            </p>
          )}
        </div>
      </form>
    </section>
  );
}

/**
 * Which portal screens this person may open.
 *
 * ---------------------------------------------------------------------------
 * **The list of screens is derived, not written down here.**
 *
 * Every option is the union of `portal_menu` across the active roles — master
 * data, edited in this screen's own Roles tab. A hardcoded list would be a
 * second copy of what the portal reaches, kept in step by remembering to,
 * which is the exact duplication this work removed. The trade is that a screen
 * no role reaches by default cannot be handed out; the fix for that is to put
 * it in a role's default, which is where it belongs anyway.
 *
 * **What is stored is the difference, not the ticks.** A grant is
 * `menu_extra`, a removal is `menu_denied`, both measured against the role's
 * own menu — so changing somebody's role carries their defaults with it
 * instead of freezing whatever they happened to have on the day. That is why
 * this recomputes against `roleKey`, the role about to be saved, rather than
 * the one the page loaded with.
 */
function PortalScreens({
  person,
  roles,
  roleKey,
}: {
  person: PortalStaffRow;
  roles: RoleDefinition[];
  roleKey: string;
}) {
  const everyScreen = [
    ...new Set(roles.filter((role) => role.is_active).flatMap((role) => role.portal_menu)),
  ].sort();

  const roleDefault = new Set(roles.find((role) => role.key === roleKey)?.portal_menu ?? []);

  /*
    Ticked to begin with: the role's own screens, plus this person's extras,
    minus their removals. **Taken away wins**, so a row that somehow holds both
    fails closed — the same order the portal resolves them in.
  */
  const initial = new Set(roleDefault);
  for (const key of person.menu_extra) initial.add(key);
  for (const key of person.menu_denied) initial.delete(key);

  const [ticked, setTicked] = useState<Set<string>>(initial);

  if (everyScreen.length === 0) {
    return (
      <p className="text-sm text-text-subtle">
        No role reaches any portal screen yet, so there is nothing to hand out.
      </p>
    );
  }

  return (
    <fieldset>
      <legend className={LABEL}>Screens in the portal</legend>
      <p className="mt-1 text-sm text-text-subtle">
        Ticked is what they can open. Anything different from their role is kept
        as a change for this person only.
      </p>

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {everyScreen.map((key) => {
          const on = ticked.has(key);
          const byDefault = roleDefault.has(key);

          return (
            <label key={key} className="flex items-start gap-2.5">
              <input
                type="checkbox"
                checked={on}
                onChange={(event) =>
                  setTicked((current) => {
                    const next = new Set(current);
                    if (event.target.checked) next.add(key);
                    else next.delete(key);
                    return next;
                  })
                }
                className="mt-1 size-4 shrink-0 rounded border-border-strong"
              />
              <span className="min-w-0">
                <span className="block text-sm">{screenLabel(key)}</span>
                {on !== byDefault && (
                  <span className="block text-xs text-text-subtle">
                    {on ? "Added for them" : "Taken away from them"}
                  </span>
                )}
              </span>
            </label>
          );
        })}
      </div>

      {/*
        The difference, as the two arrays the database stores.

        Computed here rather than in the Server Action because this is where
        the role being saved is known. Hidden inputs rather than a JSON blob,
        so the action reads them the same way it reads every other field.
      */}
      {everyScreen
        .filter((key) => ticked.has(key) && !roleDefault.has(key))
        .map((key) => (
          <input key={`extra-${key}`} type="hidden" name="menu_extra" value={key} />
        ))}

      {everyScreen
        .filter((key) => !ticked.has(key) && roleDefault.has(key))
        .map((key) => (
          <input key={`denied-${key}`} type="hidden" name="menu_denied" value={key} />
        ))}
    </fieldset>
  );
}

/**
 * A screen's name, for a key that comes from the database.
 *
 * Cosmetic only — the key is what is stored and what the portal resolves. An
 * unknown key is printed rather than hidden, so a screen added over there
 * appears here as something slightly ugly instead of silently missing.
 */
function screenLabel(key: string): string {
  const NAMES: Record<string, string> = {
    dashboard: "Dashboard",
    board: "My board",
    clients: "Clients",
    projects: "Projects",
    requests: "Requests",
  };

  return NAMES[key] ?? key.replace(/[-_]/g, " ");
}
