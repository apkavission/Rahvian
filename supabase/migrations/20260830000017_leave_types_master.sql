-- ===========================================================================
-- Leave types stop being an enum and become master data, like roles.
--
-- The owner’s instruction, 2026-08-30:
--
--   > jo leave type bhi static mat rakhna samjhe ?? wo bhi admin panel se hi
--   > aayega samjhe ?? master
--
-- ---------------------------------------------------------------------------
-- The same argument as roles, and it is a good one.
--
-- `portal.leave_kind` is an enum: casual, sick, earned, unpaid, comp_off. Five
-- words fixed in the schema. Adding a sixth — maternity, bereavement, study,
-- anything a growing company decides it needs — meant a migration, a deploy, and
-- a developer. Which in practice means it never happens, and people record the
-- new thing as "casual" and the numbers stop meaning anything.
--
-- So this is the same shape as `company.roles`: the list lives here, it is
-- edited in this admin panel, and the other applications read it through a
-- one-way view.
--
-- ---------------------------------------------------------------------------
-- Two things that are stored here and are not decoration.
--
-- **`is_paid`.** Unpaid leave is a different thing from a day off, and it is the
-- one fact about a leave type that payroll needs. Recording it here means the
-- question is answered once rather than by remembering which names mean unpaid.
--
-- **`needs_balance`.** Most kinds are counted against an allowance; unpaid leave
-- is not, and neither is anything a company decides to grant freely. A type with
-- this off is asked for and approved without an entitlement ever being set, and
-- the tracker will not tell somebody they have "-3 left" of something that was
-- never rationed.
-- ===========================================================================

create table if not exists company.leave_types (
  key           text primary key check (key ~ '^[a-z][a-z0-9_]*$'),
  label         text not null,
  description   text not null default '',

  is_paid       boolean not null default true,
  needs_balance boolean not null default true,

  /* A system type is one that already has requests recorded against it in the
     five original names. Its key is fixed so old rows keep meaning what they
     meant; everything else about it — the label, whether it is paid, its
     order — can be edited freely. */
  is_system     boolean not null default false,
  is_active     boolean not null default true,
  sort_order    integer not null default 0,

  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

comment on table company.leave_types is
  'Master list of leave types, edited in this admin panel. The task tracker reads it through portal.leave_types_master and has no list of its own.';
comment on column company.leave_types.needs_balance is
  'Whether this kind is counted against an allowance. Off for unpaid or freely granted leave, so nobody is shown a negative balance for something that was never rationed.';
comment on column company.leave_types.is_active is
  'An inactive type can no longer be asked for. Requests already recorded against it keep it — deleting a type would orphan history.';

drop trigger if exists leave_types_set_updated_at on company.leave_types;
create trigger leave_types_set_updated_at
  before update on company.leave_types
  for each row execute function company.set_updated_at();

-- ---------------------------------------------------------------------------
-- The five that already exist.
--
-- Exactly the values of `portal.leave_kind`, with the same keys, so the tracker’s
-- existing rows carry straight over and nothing has to be mapped.
--
-- `on conflict do nothing` so re-running never overwrites an edit somebody has
-- made to a label or an order.
-- ---------------------------------------------------------------------------

insert into company.leave_types
  (key, label, description, is_paid, needs_balance, is_system, sort_order)
values
  ('casual',   'Casual',   'The ordinary kind — a day here and there.',            true,  true,  true, 10),
  ('sick',     'Sick',     'Unwell. Often put in after the fact, which is fine.',  true,  true,  true, 20),
  ('earned',   'Earned',   'Built up over the year. Usually a longer break.',      true,  true,  true, 30),
  ('comp_off', 'Comp off', 'A day back for one worked at a weekend or a holiday.', true,  true,  true, 40),
  ('unpaid',   'Unpaid',   'Beyond what is allowed. Agreed case by case.',         false, false, true, 50)
on conflict (key) do nothing;

-- ---------------------------------------------------------------------------
-- Who may read it, and who may change it.
--
-- Read by anybody signed in: the tracker asks on behalf of an employee filling
-- in a leave form, and a list of leave types is not confidential.
--
-- Written by an owner only, and the check is `company.is_owner()` — the same
-- function every other master list in this schema uses, so there is one answer
-- to "who may change master data" rather than one per table.
-- ---------------------------------------------------------------------------

alter table company.leave_types enable row level security;

grant select on company.leave_types to anon, authenticated;
grant insert, update, delete on company.leave_types to authenticated;

drop policy if exists leave_types_read on company.leave_types;
create policy leave_types_read on company.leave_types
  for select using (true);

drop policy if exists leave_types_owner_write on company.leave_types;
create policy leave_types_owner_write on company.leave_types
  for all using (company.is_owner()) with check (company.is_owner());

/*
  A system type cannot be deleted or renamed.

  Its key is written into leave requests going back however long the company has
  been running. Deleting the row would leave those requests pointing at nothing,
  and renaming the key would silently move them to a type that does not exist.
  The label can be changed as often as anybody likes — that is what a label is
  for.
*/
create or replace function company.protect_system_leave_types()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'DELETE' then
    if old.is_system then
      raise exception 'This leave type is in use across past requests and cannot be deleted. Switch it off instead.';
    end if;
    return old;
  end if;

  if old.is_system and new.key is distinct from old.key then
    raise exception 'The key of a built-in leave type cannot be changed. Edit its label instead.';
  end if;

  return new;
end;
$$;

drop trigger if exists leave_types_protect_system on company.leave_types;
create trigger leave_types_protect_system
  before update or delete on company.leave_types
  for each row execute function company.protect_system_leave_types();
