-- ===========================================================================
-- Roles, as master data.
--
-- Asked for by the owner on 2026-08-27: roles come from a master table the
-- admin edits, not from a list compiled into the application. It is the
-- standing rule — nothing a non-developer might reasonably want to change is
-- allowed to live only in code — applied to the one table where getting it
-- wrong is an access-control incident rather than a typo on a page.
--
-- What a role now is:
--
--   a label and a description, shown wherever the role is named;
--   a rank, which is what stops anyone creating an account above their own;
--   three capability flags, which the RLS helpers read;
--   a default menu, which is the set of screens it reaches before anything is
--     said about the individual.
--
-- So an owner can add "Content lead" — content screens plus enquiries, no
-- settings — without a deploy, and every policy in the schema honours it
-- immediately, because the policies read the flags rather than a list of role
-- names.
--
-- profiles.role stops being an enum and becomes a foreign key into this table.
-- An enum is exactly the wrong shape for data somebody is supposed to add to:
-- every new value is a migration, and a value can never be renamed because it
-- is stored in every row that uses it. A key with a label beside it can be
-- renamed on screen a hundred times and mean the same thing underneath.
--
-- The seven original enum values are inserted as system rows before the column
-- changes type, so every existing profile still points at something. The four
-- that this panel offers are the four staff roles; client, developer and
-- demo_viewer are seeded reaching nothing here — they exist so the estate's
-- other panels have their rows waiting (spec section 14).
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- The table
-- ---------------------------------------------------------------------------

create table if not exists company.roles (
  key         text primary key check (key ~ '^[a-z][a-z0-9_]*$'),
  label       text not null,
  description text not null default '',

  -- Authority, compared and never assumed. An account may only be created or
  -- edited into a role ranked at or below the rank of the person doing it, so
  -- an owner cannot mint a super admin and an admin cannot mint an owner.
  rank        integer not null default 0,

  -- The three capabilities the policies read. Named for the helper functions
  -- that read them, so the connection is not something to be worked out.
  is_staff          boolean not null default false,
  can_manage_leads  boolean not null default false,
  is_owner          boolean not null default false,

  -- Screens this role reaches by default. The keys are the ones declared in
  -- src/components/admin/nav.ts; a key that no longer exists resolves to
  -- nothing rather than to a broken link.
  default_menu text[] not null default '{}'::text[],

  -- A system role is one the application itself depends on. Its key cannot be
  -- changed and it cannot be deleted; everything else about it can be edited,
  -- including its menu and its label.
  is_system  boolean not null default false,
  is_active  boolean not null default true,
  sort_order integer not null default 0,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table company.roles is
  'Master list of roles. Labels, ranks, capabilities and default menus are all editable from the admin panel.';
comment on column company.roles.rank is
  'Authority. Nobody may create or edit an account into a role ranked above their own.';
comment on column company.roles.default_menu is
  'Admin menu keys this role reaches before any per-person grant. See profiles.menu_extra / menu_denied.';
comment on column company.roles.is_system is
  'True for the roles the application depends on. Their keys are fixed and they cannot be deleted.';

drop trigger if exists roles_set_updated_at on company.roles;
create trigger roles_set_updated_at
  before update on company.roles
  for each row execute function company.set_updated_at();

-- ---------------------------------------------------------------------------
-- The system roles
--
-- These are the seven values of the old enum, with the capabilities that were
-- previously written into the three helper functions and the default menus
-- that were previously written into the sidebar. Nothing here is new
-- behaviour; it is the same behaviour, in a table where it can be read and
-- changed.
--
-- "on conflict do nothing", so re-running this never overwrites an edit an
-- owner has made to a label, a menu or a rank.
-- ---------------------------------------------------------------------------

insert into company.roles
  (key, label, description, rank, is_staff, can_manage_leads, is_owner, default_menu, is_system, sort_order)
values
  (
    'super_admin',
    'Super admin',
    'Everything an owner can do, across the whole estate. Kept for the person who maintains the software.',
    30, true, true, true,
    array['dashboard','leads','pages','navigation','services','portfolio','case-studies','blog','pricing','faqs','team','media','settings','seo','users'],
    true, 10
  ),
  (
    'owner',
    'Owner',
    'The business. Every screen, including accounts and site settings.',
    20, true, true, true,
    array['dashboard','leads','pages','navigation','services','portfolio','case-studies','blog','pricing','faqs','team','media','settings','seo','users'],
    true, 20
  ),
  (
    'admin',
    'Admin',
    'Content and enquiries. Cannot reach accounts or site settings.',
    10, true, true, false,
    array['dashboard','leads','pages','navigation','services','portfolio','case-studies','blog','pricing','faqs','team','media'],
    true, 30
  ),
  (
    'editor',
    'Editor',
    'Content only. Never sees enquiries — access to content must not imply access to commercial data.',
    0, true, false, false,
    array['dashboard','pages','navigation','services','portfolio','case-studies','blog','pricing','faqs','team','media'],
    true, 40
  ),
  (
    'client',
    'Client',
    'A customer, in the client portal. Reaches nothing in this admin.',
    0, false, false, false, '{}'::text[], true, 50
  ),
  (
    'developer',
    'Developer',
    'An employee in the task tracker. Reaches nothing in this admin.',
    0, false, false, false, '{}'::text[], true, 60
  ),
  (
    'demo_viewer',
    'Demo viewer',
    'A visitor signed in to a demo application. Reaches nothing in this admin.',
    0, false, false, false, '{}'::text[], true, 70
  )
on conflict (key) do nothing;

-- ---------------------------------------------------------------------------
-- profiles.role: enum -> foreign key
--
-- The cast is safe because every enum label was inserted above as a key. The
-- default has to be dropped first: Postgres will not cast a column out from
-- under a default of the old type.
--
-- "on update cascade" so renaming a key — which only a non-system role can do —
-- carries every profile with it rather than orphaning them.
-- ---------------------------------------------------------------------------

do $mig$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'company'
      and table_name = 'profiles'
      and column_name = 'role'
      and data_type = 'USER-DEFINED'
  ) then
    alter table company.profiles alter column role drop default;
    alter table company.profiles alter column role type text using role::text;
    alter table company.profiles alter column role set default 'editor';
  end if;
end
$mig$;

alter table company.profiles
  drop constraint if exists profiles_role_fkey;

alter table company.profiles
  add constraint profiles_role_fkey
  foreign key (role) references company.roles(key)
  on update cascade;

-- The enum type itself is deliberately left in place. Dropping it is a one-way
-- door, it costs nothing to keep, and auth_role() returning it was the only
-- thing that referenced it — which the next section changes.

-- ---------------------------------------------------------------------------
-- The helpers, reading the table
--
-- Same three questions, same three names, same grants. What changes is where
-- the answer comes from: a join to company.roles instead of a list of names
-- written into the function body. A role added from the admin panel is
-- therefore honoured by every policy in the schema the moment it is saved,
-- with no migration and no deploy.
--
-- is_active is tested on both sides. A deactivated account is refused
-- everywhere at once (spec section 28), and a deactivated *role* is refused
-- the same way — switching a role off is how an owner suspends a whole class
-- of account without editing each one.
-- ---------------------------------------------------------------------------

drop function if exists company.auth_role();

create or replace function company.auth_role()
returns text
language sql
stable
security definer
set search_path = company, auth, pg_temp
as $fn$
  select p.role
  from company.profiles p
  where p.id = auth.uid()
    and p.is_active
  limit 1;
$fn$;

comment on function company.auth_role() is
  'Role key of the current user, or NULL when unauthenticated or deactivated.';

create or replace function company.is_staff()
returns boolean
language sql
stable
security definer
set search_path = company, auth, pg_temp
as $fn$
  select exists (
    select 1
    from company.profiles p
    join company.roles r on r.key = p.role
    where p.id = auth.uid()
      and p.is_active
      and r.is_active
      and r.is_staff
      and 'company' = any(p.app_access)
  );
$fn$;

comment on function company.is_staff() is
  'True when the caller may access the company admin panel.';

-- Enquiries, made to agree with the menu.
--
-- The standing rule's own example is "a senior employee who also handles
-- enquiries". Granting that person the screen while this helper read only
-- their role would have handed them a working page listing nothing — a worse
-- answer than refusing the page, because they would report that there are no
-- enquiries and be believed.
--
-- So a per-person grant means the same thing at the table as it does in the
-- sidebar, and a per-person removal does too: an admin whose enquiries screen
-- has been taken away must not still be able to read the rows through anything
-- else that calls this.
create or replace function company.can_manage_leads()
returns boolean
language sql
stable
security definer
set search_path = company, auth, pg_temp
as $fn$
  select exists (
    select 1
    from company.profiles p
    join company.roles r on r.key = p.role
    where p.id = auth.uid()
      and p.is_active
      and r.is_active
      and 'company' = any(p.app_access)
      and (
        (r.can_manage_leads and not ('leads' = any(p.menu_denied)))
        or 'leads' = any(p.menu_extra)
      )
  );
$fn$;

comment on function company.can_manage_leads() is
  'True when the caller may read and modify leads: a role that carries it and has not had the screen taken away, or anyone it has been granted to.';

create or replace function company.is_owner()
returns boolean
language sql
stable
security definer
set search_path = company, auth, pg_temp
as $fn$
  select exists (
    select 1
    from company.profiles p
    join company.roles r on r.key = p.role
    where p.id = auth.uid()
      and p.is_active
      and r.is_active
      and r.is_owner
  );
$fn$;

comment on function company.is_owner() is
  'True when the caller may manage accounts and roles, and hard-delete records.';

-- ---------------------------------------------------------------------------
-- Access to the table itself
--
-- Every signed-in account reads the roles: the admin shell resolves its own
-- menu from them on every request, so a staff member who could not read their
-- own role's default menu would see an empty sidebar. Only an owner writes.
--
-- Readable by anon as well, because getRoles() is a cached read and a cached
-- read is shared with requests that carry no session. Nothing here is
-- sensitive — it is the shape of the admin panel, not a key to it, and the
-- decisions that matter are taken by SECURITY DEFINER functions server-side.
-- ---------------------------------------------------------------------------

alter table company.roles enable row level security;

grant select on company.roles to anon, authenticated;
grant insert, update, delete on company.roles to authenticated;

drop policy if exists roles_read on company.roles;
create policy roles_read on company.roles
  for select to anon, authenticated using (true);

drop policy if exists roles_owner_write on company.roles;
create policy roles_owner_write on company.roles
  for all to authenticated
  using (company.is_owner()) with check (company.is_owner());

-- A system role is never deleted, whoever asks, and its key never changes. The
-- screen hides both; this is what makes them true.
create or replace function company.protect_system_roles()
returns trigger
language plpgsql
as $fn$
begin
  if old.is_system then
    if tg_op = 'DELETE' then
      raise exception 'The % role is part of the application and cannot be deleted.', old.label;
    end if;

    if new.key is distinct from old.key then
      raise exception 'The key of a built-in role cannot be changed. Change its name instead.';
    end if;
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;

  return new;
end;
$fn$;

drop trigger if exists roles_protect_system on company.roles;
create trigger roles_protect_system
  before update or delete on company.roles
  for each row execute function company.protect_system_roles();

-- The last way in is never closed. Removing is_owner from the only role that
-- carries it, or deactivating that role, would leave a database nobody can
-- administer and no screen to fix it from.
--
-- A deferred constraint trigger rather than a check: the question is about the
-- whole table, not about one row, and it has to be asked after a statement
-- that moves the flag from one role to another has finished moving it.
create or replace function company.ensure_an_owner_role()
returns trigger
language plpgsql
as $fn$
begin
  if not exists (
    select 1 from company.roles where is_owner and is_active
  ) then
    raise exception 'At least one active role must be able to manage accounts.';
  end if;

  return null;
end;
$fn$;

drop trigger if exists roles_keep_an_owner on company.roles;
create constraint trigger roles_keep_an_owner
  after update or delete on company.roles
  deferrable initially deferred
  for each row execute function company.ensure_an_owner_role();
