-- ===========================================================================
-- Setting somebody's title, from the one place people are managed.
--
-- `company.designations` exists and `portal.staff.designation_key` exists, and
-- nothing could write it — so the list was real and unreachable. This is the
-- other half.
--
-- ---------------------------------------------------------------------------
-- **The old signature is dropped, not left beside this one.**
--
-- Adding a parameter to a Postgres function creates an *overload*. Two
-- functions of the same name whose arguments all have defaults are ambiguous to
-- PostgREST — it resolves an RPC by the argument names it was given, so a call
-- sending three of them matches both and fails with an error about the schema
-- cache, nowhere near the cause. This happened once already, on 2026-09-02,
-- when the dates were added.
-- ===========================================================================

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
  holds_the_estate      boolean,
  /* What they are called. Separate from the role beside it, which is what they
     may do — the whole reason this column exists. */
  designation_key       text,
  designation_label     text
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
    ),
    s.designation_key,
    /* The key when the title has been retired from the list: ugly and true,
       rather than a blank that reads as "no title given". */
    coalesce(d.label, s.designation_key)
  from portal.staff s
  left join company.roles r on r.key = s.role_key
  left join company.designations d on d.key = s.designation_key
  where control.is_owner()
  order by s.is_active desc, lower(s.full_name);
$$;

grant execute on function control.portal_staff() to authenticated;

-- ---------------------------------------------------------------------------
-- The list to choose from.
-- ---------------------------------------------------------------------------

create or replace function control.designations()
returns table (key text, label text, family text, sort_order integer)
language sql
stable
security definer
set search_path = control, company, public
as $$
  select d.key, d.label, d.family, d.sort_order
  from company.designations d
  where control.is_owner() and d.is_active
  order by d.sort_order, d.label;
$$;

comment on function control.designations() is
  'The titles that can be given, for the staff form. Empty to anybody who is not an estate owner.';

grant execute on function control.designations() to authenticated;

-- ---------------------------------------------------------------------------
-- Setting one.
-- ---------------------------------------------------------------------------

drop function if exists control.set_portal_staff(
  uuid, text, boolean, text[], text[], text[], text[], date, date
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
  p_joined_on           date    default null,
  p_designation_key     text    default null
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
    A title that is not on the list is refused rather than stored.

    `designation_key` has no foreign key — the portal must not depend on the
    website's schema — so this is where the check has to live. Without it a
    typo files somebody under a title that will never resolve to a label, and
    it shows as the raw key on every screen forever.
  */
  if p_designation_key is not null and p_designation_key <> '' then
    if not exists (
      select 1 from company.designations
      where key = p_designation_key and is_active
    ) then
      raise exception 'There is no designation called "%".', p_designation_key
        using errcode = 'foreign_key_violation';
    end if;
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
    /*
      An empty string clears it, where null leaves it alone.

      Every other argument here means "leave it" when null, which makes
      removing a title impossible — and taking a wrong title off somebody is a
      thing that has to be possible. The empty string is the deliberate act.
    */
    designation_key     = case
                            when p_designation_key = '' then null
                            else coalesce(p_designation_key, designation_key)
                          end,
    updated_at          = now()
  where id = p_id;

  perform control.note(
    'portal_staff.updated',
    'portal',
    before_row.full_name,
    jsonb_strip_nulls(jsonb_build_object(
      'staff_id',        p_id,
      'role_key',        p_role_key,
      'is_active',       p_is_active,
      'date_of_birth',   p_date_of_birth,
      'joined_on',       p_joined_on,
      'designation_key', p_designation_key
    ))
  );
end;
$$;

grant execute on function control.set_portal_staff(
  uuid, text, boolean, text[], text[], text[], text[], date, date, text
) to authenticated;
