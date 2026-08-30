import type { Metadata } from "next";
import Link from "next/link";
import { CircleSlash, Shield, UserRound } from "lucide-react";
import { ADMIN_NAV_ITEMS, navItem } from "@/components/admin/nav";
import { GRANTABLE_ITEMS, resolveMenu } from "@/lib/auth/menu";
import { assignableRoles, roleByKey, type RoleDefinition } from "@/lib/auth/roles";
import { requireMenu } from "@/lib/auth/session";
import { getLeaveTypes } from "@/lib/queries/leave-types";
import { getRoles } from "@/lib/queries/roles";
import { getAccounts, type Account } from "@/lib/queries/users-admin";
import { cn } from "@/lib/utils";
import { AccountForm } from "./account-form";
import { AccountSecurity } from "./account-security";
import { NewAccountForm } from "./new-account-form";
import { LeaveTypes } from "./leave-types";
import { NewRoleForm } from "./new-role-form";
import { RoleForm } from "./role-form";

export const metadata: Metadata = {
  title: "Users",
  robots: { index: false, follow: false, nocache: true },
};

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/**
 * Accounts and roles.
 *
 * Two tabs on one screen rather than two entries in the menu, because they are
 * one subject. Deciding what somebody may do means moving between "what is this
 * person" and "what does that role mean" several times in a minute, and a
 * navigation between the two turns that into a decision about where to click.
 *
 * The same three columns as every other admin screen: the list, the editor, and
 * — where every content screen shows a preview of the page — the effect of what
 * is being edited. For an account that is the menu they end up with; for a role
 * it is who holds it. Both are the thing you actually want to check before
 * pressing Save, which is what a preview is for.
 *
 * This screen is the estate's control plane (spec section 14). Everything it
 * writes is enforced twice more: `requireMenu()` decides which screens exist
 * for a given account, and the row policies refuse the data underneath whatever
 * either of them says.
 */
export default async function UsersScreen({ searchParams }: Props) {
  const session = await requireMenu("users");

  const query = await searchParams;

  /*
    Three tabs, one subject: who somebody is, what their role means, and what
    they can ask time off for. All three are answers to "what may this person
    do", and moving between them is a normal minute's work — a separate menu
    entry for each would turn that into a decision about where to click.
  */
  const tab =
    query.tab === "roles" ? "roles" : query.tab === "leave" ? "leave" : "people";

  const [{ accounts, capped }, roles, leaveTypes] = await Promise.all([
    getAccounts(),
    getRoles(),
    getLeaveTypes(),
  ]);

  const assignable = assignableRoles(roles, session.role);

  return (
    <div className="mx-auto w-full max-w-7xl">
      <header>
        <h1 className="font-display text-2xl font-semibold">Users</h1>
        <p className="measure mt-2 text-sm leading-relaxed text-text-muted">
          Everybody who can sign in anywhere in the estate, and what each of
          them may do. An account is created here and never signs itself up; a
          password is generated and emailed and can never be read back; and
          blocking somebody ends their access everywhere at once without
          deleting anything.
        </p>
      </header>

      <nav className="mt-8 flex gap-1 border-b border-border" aria-label="Users sections">
        <Tab href="/admin/users" label="People" active={tab === "people"} count={accounts.length} />
        <Tab
          href="/admin/users?tab=roles"
          label="Roles"
          active={tab === "roles"}
          count={roles.length}
        />
        <Tab
          href="/admin/users?tab=leave"
          label="Leave types"
          active={tab === "leave"}
          count={leaveTypes.length}
        />
      </nav>

      {capped && (
        <p className="mt-6 rounded-lg border border-warning/35 bg-warning-soft px-3.5 py-3 text-sm">
          Only the first 200 accounts are listed. Nothing is missing from the
          database — this screen has simply outgrown a single column.
        </p>
      )}

      {tab === "leave" ? (
        <LeaveTypes types={leaveTypes} />
      ) : tab === "people" ? (
        <People
          accounts={accounts}
          roles={roles}
          assignable={assignable}
          selectedId={pick(query.account, accounts.map((account) => account.id))}
          selfId={session.userId}
          justSent={query.sent === "1"}
        />
      ) : (
        <Roles
          roles={roles}
          accounts={accounts}
          selectedKey={pick(query.role, roles.map((role) => role.key))}
          ceiling={session.role.rank}
        />
      )}
    </div>
  );
}

/** The requested item if it exists, otherwise the first one, otherwise none. */
function pick(requested: string | string[] | undefined, ids: string[]): string | null {
  const wanted = typeof requested === "string" ? requested : null;
  if (wanted && ids.includes(wanted)) return wanted;
  return ids[0] ?? null;
}

function Tab({
  href,
  label,
  active,
  count,
}: {
  href: string;
  label: string;
  active: boolean;
  count: number;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "-mb-px border-b-2 px-4 py-2.5 text-sm font-medium transition-colors",
        active
          ? "rounded-t-lg border-accent bg-accent-soft font-semibold text-accent"
          : "border-transparent text-text-muted hover:text-text",
      )}
    >
      {label}
      <span className="ml-2 font-mono text-[0.65rem] text-text-subtle">{count}</span>
    </Link>
  );
}

// ---------------------------------------------------------------------------
// People
// ---------------------------------------------------------------------------

function People({
  accounts,
  roles,
  assignable,
  selectedId,
  selfId,
  justSent,
}: {
  accounts: Account[];
  roles: RoleDefinition[];
  assignable: RoleDefinition[];
  selectedId: string | null;
  selfId: string;
  justSent: boolean;
}) {
  const selected = accounts.find((account) => account.id === selectedId) ?? null;
  const selectedRole = selected ? roleByKey(roles, selected.role) : undefined;

  return (
    <div className="mt-10 grid gap-8 xl:grid-cols-[17rem_minmax(0,1fr)_minmax(0,1fr)]">
      <div className="xl:sticky xl:top-24 xl:self-start">
        <h2 className="font-mono text-[0.65rem] uppercase tracking-[0.16em] text-text-subtle">
          Accounts
        </h2>

        <ul className="mt-3 space-y-2">
          {accounts.map((account) => {
            const active = account.id === selectedId;

            return (
              <li key={account.id}>
                <Link
                  href={`/admin/users?account=${account.id}`}
                  aria-current={active ? "true" : undefined}
                  className={cn(
                    "flex items-start gap-2.5 rounded-xl border p-3 transition-colors",
                    active
                      ? "border-accent bg-accent-soft/60 shadow-[inset_3px_0_0_var(--accent)]"
                      : "border-border bg-surface hover:bg-surface-2",
                    !account.is_active && "opacity-70",
                  )}
                >
                  <span className="mt-0.5 shrink-0 text-text-subtle">
                    {account.is_active ? (
                      <UserRound className="size-4" aria-hidden />
                    ) : (
                      <CircleSlash className="size-4 text-danger" aria-hidden />
                    )}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">
                      {account.full_name || account.email || "Unnamed account"}
                      {account.id === selfId && (
                        <span className="ml-1.5 text-xs font-normal text-text-subtle">
                          you
                        </span>
                      )}
                    </span>
                    <span className="block truncate font-mono text-[0.65rem] uppercase tracking-[0.12em] text-text-subtle">
                      {account.is_active
                        ? roleByKey(roles, account.role)?.label ?? account.role
                        : "Blocked"}
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}

          {accounts.length === 0 && (
            <li className="rounded-xl border border-dashed border-border p-4 text-sm text-text-muted">
              No accounts yet.
            </li>
          )}
        </ul>

        <NewAccountForm assignable={assignable} />
      </div>

      <div className="min-w-0 space-y-6">
        {justSent && (
          <p className="rounded-lg border border-success/35 bg-success-soft px-3.5 py-3 text-sm">
            The account is ready and the password is on its way to them. It
            cannot be read again — if it never arrives, reset it below.
          </p>
        )}

        {selected ? (
          <>
            <div className="surface-raised rounded-2xl border border-border p-6">
              <AccountFacts account={selected} />

              {/*
                Keyed on the account, so choosing another one remounts the form.
                Without it React reuses the component and keeps the first
                person's ticks — the editor would show one menu under another's
                name.
              */}
              <div className="mt-6 border-t border-border pt-6">
                <AccountForm
                  key={selected.id}
                  values={{
                    id: selected.id,
                    full_name: selected.full_name,
                    role: selected.role,
                    app_access: selected.app_access,
                    menu_extra: selected.menu_extra,
                    menu_denied: selected.menu_denied,
                    address: selected.address,
                    work_latitude: selected.work_latitude,
                    work_longitude: selected.work_longitude,
                    work_radius_metres: selected.work_radius_metres,
                  }}
                  roles={roles}
                  assignable={assignable}
                  isSelf={selected.id === selfId}
                />
              </div>
            </div>

            <AccountSecurity
              key={`security-${selected.id}`}
              id={selected.id}
              name={selected.full_name}
              email={selected.email}
              isActive={selected.is_active}
              isSelf={selected.id === selfId}
            />
          </>
        ) : (
          <div className="rounded-2xl border border-dashed border-border bg-surface-2/40 p-8">
            <h2 className="font-display text-lg font-semibold">No account selected</h2>
            <p className="measure mt-3 text-sm leading-relaxed text-text-muted">
              Choose somebody on the left, or create the first account.
            </p>
          </div>
        )}
      </div>

      <div className="min-w-0 xl:sticky xl:top-24 xl:self-start">
        {selected && <AccessSummary account={selected} role={selectedRole} />}
      </div>
    </div>
  );
}

function AccountFacts({ account }: { account: Account }) {
  return (
    <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
      <Fact label="Email">{account.email ?? "Not available"}</Fact>
      <Fact label="Status">
        {account.is_active ? (
          "Active"
        ) : (
          <span className="text-danger">Blocked — cannot sign in anywhere</span>
        )}
      </Fact>
      <Fact label="Last signed in">
        {account.last_login_at ? formatDate(account.last_login_at) : "Never"}
      </Fact>
      <Fact label="Created">{formatDate(account.created_at)}</Fact>
    </dl>
  );
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="font-mono text-[0.6rem] uppercase tracking-[0.14em] text-text-subtle">
        {label}
      </dt>
      <dd className="mt-1 truncate text-sm">{children}</dd>
    </div>
  );
}

/**
 * The third column: what this account actually reaches.
 *
 * Rendered from what is saved, not from what is currently ticked, and that is
 * the point — it is the answer to "what did I just do", checked against the
 * database rather than against the form that wrote to it. It reappears with the
 * new answer as soon as a save completes, because the action revalidates this
 * path.
 */
function AccessSummary({
  account,
  role,
}: {
  account: Account;
  role: RoleDefinition | undefined;
}) {
  const menu = resolveMenu(account, role);
  const reachable = ADMIN_NAV_ITEMS.filter((item) => menu.has(item.key));

  const added = account.menu_extra.map((key) => navItem(key)?.label ?? key);
  const removed = account.menu_denied.map((key) => navItem(key)?.label ?? key);

  return (
    <div className="rounded-2xl border border-border bg-surface-2/40 p-6">
      <h2 className="font-display text-base font-semibold">What they can reach</h2>
      <p className="measure mt-2 text-sm leading-relaxed text-text-muted">
        As saved. Anything not on this list answers as a page that does not
        exist, and the database refuses its rows as well.
      </p>

      {!account.is_active && (
        <p className="mt-4 rounded-lg border border-danger/35 bg-danger-soft px-3.5 py-3 text-sm text-danger">
          None of it, while the account is blocked.
        </p>
      )}

      {!role && (
        <p className="mt-4 rounded-lg border border-warning/35 bg-warning-soft px-3.5 py-3 text-sm">
          This account holds a role that no longer exists, so it reaches
          nothing. Give it a role that does.
        </p>
      )}

      {reachable.length > 0 && (
        <ul className="mt-4 flex flex-wrap gap-1.5">
          {reachable.map((item) => (
            <li
              key={item.key}
              className="rounded-full bg-surface px-3 py-1 text-xs text-text-muted ring-1 ring-border"
            >
              {item.label}
            </li>
          ))}
        </ul>
      )}

      <dl className="mt-6 space-y-3 border-t border-border pt-4 text-sm">
        <div>
          <dt className="text-text-subtle">Role</dt>
          <dd className="mt-0.5">
            {role ? (
              <>
                <span className="font-medium">{role.label}</span>
                {role.description && (
                  <span className="measure mt-1 block text-text-muted">
                    {role.description}
                  </span>
                )}
              </>
            ) : (
              account.role
            )}
          </dd>
        </div>

        <div>
          <dt className="text-text-subtle">Differences from the role</dt>
          <dd className="mt-0.5 text-text-muted">
            {added.length === 0 && removed.length === 0 ? (
              "None — exactly what the role gives."
            ) : (
              <>
                {added.length > 0 && <span>Added: {added.join(", ")}. </span>}
                {removed.length > 0 && <span>Removed: {removed.join(", ")}.</span>}
              </>
            )}
          </dd>
        </div>

        <div>
          <dt className="text-text-subtle">Applications</dt>
          <dd className="mt-0.5 text-text-muted">
            {account.app_access.length > 0 ? account.app_access.join(", ") : "None"}
          </dd>
        </div>
      </dl>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Roles
// ---------------------------------------------------------------------------

function Roles({
  roles,
  accounts,
  selectedKey,
  ceiling,
}: {
  roles: RoleDefinition[];
  accounts: Account[];
  selectedKey: string | null;
  ceiling: number;
}) {
  const selected = roles.find((role) => role.key === selectedKey) ?? null;

  const holders = (key: string) => accounts.filter((account) => account.role === key);

  return (
    <div className="mt-10 grid gap-8 xl:grid-cols-[17rem_minmax(0,1fr)_minmax(0,1fr)]">
      <div className="xl:sticky xl:top-24 xl:self-start">
        <h2 className="font-mono text-[0.65rem] uppercase tracking-[0.16em] text-text-subtle">
          In order of authority
        </h2>

        <ul className="mt-3 space-y-2">
          {roles.map((role) => {
            const active = role.key === selectedKey;

            return (
              <li key={role.key}>
                <Link
                  href={`/admin/users?tab=roles&role=${role.key}`}
                  aria-current={active ? "true" : undefined}
                  className={cn(
                    "flex items-start gap-2.5 rounded-xl border p-3 transition-colors",
                    active
                      ? "border-accent bg-accent-soft/40"
                      : "border-border bg-surface hover:bg-surface-2",
                    !role.is_active && "opacity-70",
                  )}
                >
                  <span className="mt-0.5 shrink-0 text-text-subtle">
                    <Shield className="size-4" aria-hidden />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">{role.label}</span>
                    <span className="block truncate font-mono text-[0.65rem] uppercase tracking-[0.12em] text-text-subtle">
                      {role.is_active
                        ? `${holders(role.key).length} ${holders(role.key).length === 1 ? "account" : "accounts"}`
                        : "Switched off"}
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>

        <NewRoleForm />
      </div>

      <div className="min-w-0">
        {selected ? (
          <div className="surface-raised rounded-2xl border border-border p-6">
            <RoleForm
              key={selected.key}
              role={selected}
              ceiling={ceiling}
              accountCount={holders(selected.key).length}
            />
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-border bg-surface-2/40 p-8">
            <h2 className="font-display text-lg font-semibold">No role selected</h2>
            <p className="measure mt-3 text-sm leading-relaxed text-text-muted">
              Choose one on the left.
            </p>
          </div>
        )}
      </div>

      <div className="min-w-0 xl:sticky xl:top-24 xl:self-start">
        {selected && <RoleHolders role={selected} accounts={holders(selected.key)} />}
      </div>
    </div>
  );
}

/**
 * The third column: who this actually applies to.
 *
 * A role edit is a change to every one of these people at once, and the list is
 * here so that is a fact on the screen rather than something to be remembered.
 */
function RoleHolders({
  role,
  accounts,
}: {
  role: RoleDefinition;
  accounts: Account[];
}) {
  const grantable = new Set<string>(GRANTABLE_ITEMS.map((item) => item.key));

  return (
    <div className="rounded-2xl border border-border bg-surface-2/40 p-6">
      <h2 className="font-display text-base font-semibold">Who holds it</h2>
      <p className="measure mt-2 text-sm leading-relaxed text-text-muted">
        {accounts.length === 0
          ? "Nobody, yet. Changes here affect nothing until somebody is given this role."
          : `Saving this screen changes what ${accounts.length === 1 ? "this person reaches" : "these people reach"}, on their next request.`}
      </p>

      {accounts.length > 0 && (
        <ul className="mt-4 space-y-2">
          {accounts.map((account) => {
            const extra = account.menu_extra.filter((key) => grantable.has(key)).length;
            const denied = account.menu_denied.filter((key) => grantable.has(key)).length;

            return (
              <li key={account.id}>
                <Link
                  href={`/admin/users?account=${account.id}`}
                  className="flex items-center gap-2.5 rounded-lg bg-surface px-3 py-2 text-sm ring-1 ring-border transition-colors hover:bg-surface-2"
                >
                  <span className="min-w-0 flex-1 truncate">
                    {account.full_name || account.email}
                  </span>
                  {(extra > 0 || denied > 0) && (
                    <span className="shrink-0 font-mono text-[0.6rem] uppercase tracking-[0.12em] text-accent">
                      adjusted
                    </span>
                  )}
                  {!account.is_active && (
                    <span className="shrink-0 font-mono text-[0.6rem] uppercase tracking-[0.12em] text-danger">
                      blocked
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      {!role.is_active && (
        <p className="mt-4 rounded-lg border border-warning/35 bg-warning-soft px-3.5 py-3 text-sm">
          This role is switched off, so everybody holding it is signed out
          everywhere — the same as being blocked individually.
        </p>
      )}
    </div>
  );
}

/** A date as a person reads it, in the site's own locale. */
function formatDate(value: string): string {
  return new Date(value).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
