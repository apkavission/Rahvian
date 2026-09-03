-- ===========================================================================
-- Staff documents, issued from the company admin.
--
-- ---------------------------------------------------------------------------
-- The owner asked for two things that land in the same place:
--
--   * an offer letter when somebody is taken on, with their tracker link and
--     their sign-in;
--   * a salary slip when somebody is paid, with proof.
--
-- Both are about a member of staff, and staff are managed here — the portal's
-- own team screen was removed on 2026-08-31 precisely so there would be one
-- place. So the screen that adds a person is the screen that issues their
-- papers.
--
-- ---------------------------------------------------------------------------
-- **Through `control`, with the caller's session, exactly like the staff list
-- beside it.** Every function here asks `control.is_owner()` itself, so it is
-- the database refusing rather than the screen choosing not to offer. Reaching
-- `portal` from the website any other way needs the service role — which would
-- make this page's markup the only thing standing between a curious admin and
-- everybody's salary.
--
-- That matters more here than anywhere else in this schema. A salary slip is
-- the most private row in the estate.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- The kinds that can be issued to a person.
--
-- Read from the portal's own master list rather than named here. The whole
-- point of that table is that adding an experience letter is a row, not a
-- deploy — and a hard-coded list in this file would be the second list.
-- ---------------------------------------------------------------------------

create or replace function control.staff_document_kinds()
returns table (
  key              text,
  label            text,
  needs_period     boolean,
  needs_amount     boolean,
  signs_by_default boolean
)
language sql
stable
security definer
set search_path = control, portal, public
as $$
  select t.key, t.label, t.needs_period, t.needs_amount, t.signs_by_default
  from portal.document_types t
  where control.is_owner()
    and t.is_active
    -- 'client' kinds are an invoice or a contract; they belong to a company
    -- and are issued from the portal, against a project.
    and t.belongs_to in ('staff', 'both')
  order by t.sort_order;
$$;

comment on function control.staff_document_kinds() is
  'The kinds of document that can be issued to a member of staff, from the portal''s master list. Empty to anybody who is not an estate owner.';

grant execute on function control.staff_document_kinds() to authenticated;

-- ---------------------------------------------------------------------------
-- What has already been issued to one person.
-- ---------------------------------------------------------------------------

create or replace function control.staff_documents(p_staff_id uuid)
returns table (
  id            uuid,
  kind_key      text,
  kind_label    text,
  title         text,
  amount        numeric,
  period_start  date,
  period_end    date,
  issued_on     date,
  paid_on       date,
  paid_method   text,
  has_file      boolean,
  note          text
)
language sql
stable
security definer
set search_path = control, portal, public
as $$
  select
    d.id,
    d.kind_key,
    coalesce(t.label, d.kind_key),
    d.title,
    d.amount,
    d.period_start,
    d.period_end,
    d.issued_on,
    d.paid_on,
    d.paid_method,
    d.storage_key is not null,
    d.note
  from portal.documents d
  left join portal.document_types t on t.key = d.kind_key
  where control.is_owner()
    and d.staff_id = p_staff_id
  order by d.issued_on desc, d.created_at desc;
$$;

comment on function control.staff_documents(uuid) is
  'Documents already issued to one member of staff. Empty to anybody who is not an estate owner.';

grant execute on function control.staff_documents(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Issue one.
--
-- The kind's own row decides what is required, so this function does not know
-- what a salary slip is. It passes what it was given and lets the trigger on
-- `portal.documents` refuse anything the kind says is incomplete — which means
-- a kind added next month is enforced here without this file changing.
-- ---------------------------------------------------------------------------

create or replace function control.issue_staff_document(
  p_staff_id     uuid,
  p_kind_key     text,
  p_title        text,
  p_amount       numeric default null,
  p_period_start date    default null,
  p_period_end   date    default null,
  p_paid_on      date    default null,
  p_paid_method  text    default null,
  p_note         text    default null
)
returns uuid
language plpgsql
security definer
set search_path = control, portal, public
as $$
declare
  new_id uuid;
  person portal.staff%rowtype;
begin
  if not control.is_owner() then
    raise exception 'Only an estate owner may issue somebody''s documents.'
      using errcode = '42501';
  end if;

  select * into person from portal.staff where id = p_staff_id;

  if not found then
    raise exception 'That person is not on the staff list.' using errcode = 'P0002';
  end if;

  insert into portal.documents (
    kind_key, title, staff_id, amount,
    period_start, period_end, paid_on, paid_method, note
  )
  values (
    p_kind_key, p_title, p_staff_id, p_amount,
    p_period_start, p_period_end, p_paid_on, p_paid_method, p_note
  )
  returning id into new_id;

  /*
    Written down, because this is money and somebody's employment.

    `control.audit_log` is the estate's record of who did what across
    applications. Issuing a salary slip is exactly the kind of act that should
    not rest on somebody's memory of having done it.
  */
  perform control.note(
    'document.issued',
    'portal',
    person.full_name,
    jsonb_strip_nulls(jsonb_build_object(
      'document_id', new_id,
      'kind',        p_kind_key,
      'staff_id',    p_staff_id,
      'amount',      p_amount,
      'paid_on',     p_paid_on,
      'paid_method', p_paid_method
    ))
  );

  return new_id;
end;
$$;

comment on function control.issue_staff_document(uuid, text, text, numeric, date, date, date, text, text) is
  'Issues a document to a member of staff, from the company admin. What each kind requires is decided by that kind''s own row, not here.';

grant execute on function control.issue_staff_document(uuid, text, text, numeric, date, date, date, text, text)
  to authenticated;
