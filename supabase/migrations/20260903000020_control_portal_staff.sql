-- ===========================================================================
-- Portal and tracker staff, managed from the company admin.
--
-- The owner's instruction, 2026-08-31:
--
--   > portal me jo team ka wo nahi hoga ... wo bas ek hi jagah hoga, wo hoga
--   > services ke admin me, aur usme bhi portal ka jo super admin hoga wahan
--   > se manage hoga ... yahan se admin ko bhi kya dekhna wo bhi manage kar
--   > sakte hain aur baki role ko bhi
--
-- ---------------------------------------------------------------------------
-- The duplication being removed, in its own words.
--
-- `portal.staff` has carried this comment since the day it was created:
--
--   > Employees, for this application only. The company website keeps its own
--   > list; a person who joins or leaves must be added or removed in both.
--
-- Two lists of people, kept in step by remembering to. The tracker decides who
-- may sign in by looking for a row here, so forgetting the second half does not
-- fail loudly — it leaves somebody with an account they should not have, or
-- without one they should.
--
-- ---------------------------------------------------------------------------
-- Why `control` and not a direct read.
--
-- The company admin reads `company`. Reaching into `portal` from there would
-- either need the service role — which would make the panel's markup the only
-- thing deciding who may edit staff — or a policy in `portal` naming the
-- website, which is the coupling that schema was built without.
--
-- `control` is the estate's own schema and already the answer to exactly this
-- question. Every function in it carries the caller's session and asks
-- `control.is_owner()` itself, so authority is decided in the database and the
-- screen is only a screen. These two are no different.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- Who is on the portal's staff list.
--
-- Returns the master role's own label alongside the key, so the screen never
-- invents a word for a role: rename it in Users and it is renamed here.
-- ---------------------------------------------------------------------------

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
  has_company_account   boolean
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
    -- Whether the same person also exists on the website's own list. This is
    -- the duplication made visible: a true here means one person, two rows,
    -- and a false means somebody who can open the tracker and not the website.
    exists (select 1 from company.profiles p where p.id = s.auth_user_id)
  from portal.staff s
  left join company.roles r on r.key = s.role_key
  where control.is_owner()
  order by s.is_active desc, lower(s.full_name);
$$;

comment on function control.portal_staff() is
  'The portal and tracker staff list, for the company admin. Empty to anybody who is not an estate owner.';

grant execute on function control.portal_staff() to authenticated;

-- ---------------------------------------------------------------------------
-- Change one person's role, their two menus, and whether they are active.
--
-- One function rather than four, because these are one decision. A role change
-- moves the defaults that the menu overrides are expressed against, so saving
-- them separately means a moment where the stored grants describe a role the
-- person no longer holds.
--
-- `null` means "leave it alone" for every argument, so the screen can send only
-- what it changed rather than having to know the whole row.
-- ---------------------------------------------------------------------------

create or replace function control.set_portal_staff(
  p_id                  uuid,
  p_role_key            text    default null,
  p_is_active           boolean default null,
  p_menu_extra          text[]  default null,
  p_menu_denied         text[]  default null,
  p_tracker_menu_extra  text[]  default null,
  p_tracker_menu_denied text[]  default null
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

  /*
    A role key that is not in the master list is refused rather than stored.

    The portal reads this key and resolves it against `company.roles`; a key
    that matches nothing resolves to no menu at all, so a typo here would not
    error anywhere — it would quietly remove somebody's access and look like a
    bug in the portal a week later.
  */
  if p_role_key is not null then
    if not exists (
      select 1 from company.roles where key = p_role_key and is_active
    ) then
      raise exception 'There is no active role called %.', p_role_key
        using errcode = '23503';
    end if;
  end if;

  update portal.staff
  set
    role_key            = coalesce(p_role_key, role_key),
    is_active           = coalesce(p_is_active, is_active),
    menu_extra          = coalesce(p_menu_extra, menu_extra),
    menu_denied         = coalesce(p_menu_denied, menu_denied),
    tracker_menu_extra  = coalesce(p_tracker_menu_extra, tracker_menu_extra),
    tracker_menu_denied = coalesce(p_tracker_menu_denied, tracker_menu_denied)
  where id = p_id;

  /*
    Written down, because this is the audit log's whole purpose.

    `control.audit_log` has been built and empty since it was created — every
    screen that should write to it was left to do it later. A change to who may
    open what is the first thing anybody would want a record of, so this one
    does not wait.
  */
  perform control.note(
    'portal_staff.updated',
    'portal',
    before_row.full_name,
    jsonb_strip_nulls(jsonb_build_object(
      'staff_id',  p_id,
      'role_from', case when p_role_key  is not null and p_role_key  is distinct from before_row.role_key  then before_row.role_key  end,
      'role_to',   case when p_role_key  is not null and p_role_key  is distinct from before_row.role_key  then p_role_key           end,
      'active_from', case when p_is_active is not null and p_is_active is distinct from before_row.is_active then before_row.is_active end,
      'active_to',   case when p_is_active is not null and p_is_active is distinct from before_row.is_active then p_is_active          end
    ))
  );
end;
$$;

comment on function control.set_portal_staff(uuid, text, boolean, text[], text[], text[], text[]) is
  'Change a portal/tracker staff member''s role, menus or active state from the company admin. Estate owners only; writes control.audit_log.';

grant execute on function control.set_portal_staff(uuid, text, boolean, text[], text[], text[], text[]) to authenticated;
