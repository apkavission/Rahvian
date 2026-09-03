-- ===========================================================================
-- Birthdays and joining dates, set where people are managed.
--
-- The two columns already exist on `portal.staff`. Nothing could write them:
-- the portal's team screen was removed so there would be one place for staff,
-- and that place is here — but `control.set_portal_staff` only knew about roles
-- and menus.
--
-- ---------------------------------------------------------------------------
-- **Nobody is required to give either.** Both stay nullable, and a person with
-- no date of birth simply never appears on the birthday list. Somebody who
-- would rather not have it announced is not asked twice, and no screen shows a
-- gap where their date should be.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- Returned alongside the rest, so one screen edits the whole person.
-- ---------------------------------------------------------------------------

drop function if exists control.portal_staff();

create or replace function control.portal_staff()
returns table (
  id                    uuid,
  auth_user_id          uuid,
  full_name             text,
  email                 text,
  role_key              text,
  role_label            text,
  is_active             boolean,
  menu_extra            text[],
  menu_denied           text[],
  tracker_menu_extra    text[],
  tracker_menu_denied   text[],
  has_company_account   boolean,
  date_of_birth         date,
  joined_on             date,
  /*
    Whether this person actually holds the estate.

    Read from their WEBSITE role, which is what `control.is_owner()` checks —
    not from `role_key` beside it. The two are separate rows kept in step by
    remembering to, and when they disagree somebody reads "Developer" on every
    screen they use while holding the power to manage all staff and read every
    salary slip.

    Surfaced here so the screen that manages people can say so out loud. Found
    on 2026-09-01 by a refusal test that passed for the wrong reason.
  */
  holds_the_estate      boolean
)
language sql
stable
security definer
set search_path = control, portal, company, public
as $$
  select
    s.id,
    s.auth_user_id,
    s.full_name,
    s.email,
    s.role_key,
    coalesce(r.label, s.role_key, 'No role') as role_label,
    s.is_active,
    coalesce(s.menu_extra, '{}')::text[],
    coalesce(s.menu_denied, '{}')::text[],
    coalesce(s.tracker_menu_extra, '{}')::text[],
    coalesce(s.tracker_menu_denied, '{}')::text[],
    exists (select 1 from company.profiles p where p.id = s.auth_user_id),
    s.date_of_birth,
    s.joined_on,
    coalesce(
      (
        select cr.is_owner
        from company.profiles p
        join company.roles cr on cr.key = p.role
        where p.id = s.auth_user_id and p.is_active
      ),
      false
    )
  from portal.staff s
  left join company.roles r on r.key = s.role_key
  where control.is_owner()
  order by s.is_active desc, lower(s.full_name);
$$;

comment on function control.portal_staff() is
  'The portal and tracker staff list, for the company admin. Includes whether each person actually holds the estate, which their portal role does not always show. Empty to anybody who is not an estate owner.';

grant execute on function control.portal_staff() to authenticated;

-- ---------------------------------------------------------------------------
-- Setting them.
--
-- `null` still means "leave it alone" for every argument, as it does for the
-- rest of this function — the screen sends what it changed.
--
-- That makes clearing a date impossible through this argument, which is the
-- right trade for the common case and is worth naming: somebody who wants a
-- birthday removed is asking for it to be forgotten, and that is a deliberate
-- act rather than an empty box submitted by accident.
-- ---------------------------------------------------------------------------

/*
  The seven-argument version is dropped, not left beside this one.

  Adding parameters to a Postgres function creates an *overload*; it does not
  replace anything. Two functions with the same name and all-default arguments
  are ambiguous to PostgREST, which resolves an RPC by the names it was given —
  so a call sending only `p_id` and `p_role_key` matches both and fails at
  runtime with an error about the schema cache, nowhere near the cause.
*/
drop function if exists control.set_portal_staff(
  uuid, text, boolean, text[], text[], text[], text[]
);

create or replace function control.set_portal_staff(
  p_id                  uuid,
  p_role_key            text    default null,
  p_is_active           boolean default null,
  p_menu_extra          text[]  default null,
  p_menu_denied         text[]  default null,
  p_tracker_menu_extra  text[]  default null,
  p_tracker_menu_denied text[]  default null,
  p_date_of_birth       date    default null,
  p_joined_on           date    default null
)
returns void
language plpgsql
security definer
set search_path = control, portal, company, public
as $$
declare
  before_row portal.staff%rowtype;
begin
  if not control.is_owner() then
    raise exception 'Only an estate owner may change who works here.'
      using errcode = '42501';
  end if;

  select * into before_row from portal.staff where id = p_id;

  if not found then
    raise exception 'That person is not on the staff list.' using errcode = 'P0002';
  end if;

  update portal.staff
  set
    role_key            = coalesce(p_role_key, role_key),
    is_active           = coalesce(p_is_active, is_active),
    menu_extra          = coalesce(p_menu_extra, menu_extra),
    menu_denied         = coalesce(p_menu_denied, menu_denied),
    tracker_menu_extra  = coalesce(p_tracker_menu_extra, tracker_menu_extra),
    tracker_menu_denied = coalesce(p_tracker_menu_denied, tracker_menu_denied),
    date_of_birth       = coalesce(p_date_of_birth, date_of_birth),
    joined_on           = coalesce(p_joined_on, joined_on),
    updated_at          = now()
  where id = p_id;

  perform control.note(
    'portal_staff.updated',
    'portal',
    before_row.full_name,
    jsonb_strip_nulls(jsonb_build_object(
      'staff_id',      p_id,
      'role_key',      p_role_key,
      'is_active',     p_is_active,
      'date_of_birth', p_date_of_birth,
      'joined_on',     p_joined_on
    ))
  );
end;
$$;

comment on function control.set_portal_staff(uuid, text, boolean, text[], text[], text[], text[], date, date) is
  'Change one person''s role, menus, activity and dates. Null means leave it alone, so the screen sends only what it changed.';

grant execute on function control.set_portal_staff(uuid, text, boolean, text[], text[], text[], text[], date, date)
  to authenticated;
