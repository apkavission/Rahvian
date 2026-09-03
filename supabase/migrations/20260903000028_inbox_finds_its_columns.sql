-- ===========================================================================
-- The estate inbox has been broken since the shop demo was registered.
--
-- ---------------------------------------------------------------------------
-- **What was wrong.**
--
-- `estate_inbox` builds one `union all` across every application's enquiry and
-- message tables. It already knew that the column holding a person's *name*
-- differs per demo — `patient_name`, `guest_name`, `student_name` — and looked
-- it up rather than assuming. It then assumed `created_at` for the time.
--
-- `demo_shop.orders` calls it `placed_at`, because an order is placed. So every
-- render of `/admin/estate/inbox` failed with
--
--     column e.created_at does not exist
--
-- and the screen caught it and drew "These screens are not connected yet",
-- which names the wrong cause entirely: it tells whoever is looking to go and
-- run a migration that has already been run. A broken query wearing the face of
-- a missing migration is the most expensive kind of error message.
--
-- ---------------------------------------------------------------------------
-- **Why nobody noticed.**
--
-- The browser suite walks every admin screen and asserts its heading. The three
-- estate screens were not on that list — so a suite reporting that every admin
-- screen opens had never requested the three most powerful ones. They are on it
-- now, and this migration is what that discovered.
--
-- ---------------------------------------------------------------------------
-- **The `exception when others` was not catching this.**
--
-- It wraps the block that *builds* one fragment of SQL. The column that does
-- not exist is not a problem until the assembled statement runs, which happens
-- after the loop, outside every handler. The comment on it said "one
-- application's odd table must not take the whole inbox down", and that is
-- exactly what happened — so the guard is made real here by refusing to add a
-- fragment whose columns were not found, rather than by catching an error that
-- arrives too late to catch.
-- ===========================================================================

/**
 * The first of these columns that the table actually has.
 *
 * The candidates are given in preference order and that order is respected —
 * a table with both `created_at` and `placed_at` is dated by whichever the
 * caller asked for first, rather than by whichever the catalogue happens to
 * return first, which is not stable.
 *
 * Null when it has none of them, which is the caller's signal to leave that
 * table out rather than to build SQL that cannot run.
 */
create or replace function control.first_column(
  p_schema text,
  p_table text,
  p_candidates text[]
)
returns text
language sql
stable
security definer
set search_path = control, public
as $fn$
  select c.column_name::text
  from information_schema.columns c
  where c.table_schema = p_schema
    and c.table_name = p_table
    and c.column_name = any (p_candidates)
  order by array_position(p_candidates, c.column_name::text)
  limit 1;
$fn$;

comment on function control.first_column(text, text, text[]) is
  'The first of the named columns a table actually has, in the order asked for. Null means it has none — leave that table out rather than building SQL that cannot run.';

/**
 * Everything anybody has written to any application, newest first.
 *
 * Every column this depends on is looked up rather than assumed, and a table
 * missing one is skipped. Eight applications with schemas written months apart
 * will not agree on names for ever, and the inbox failing entirely because one
 * of them calls a date something else is the wrong trade every time.
 */
create or replace function control.estate_inbox(p_limit integer default 50)
returns table (app_key text, app_name text, kind text, who text, summary text, at timestamptz)
language plpgsql
stable
security definer
set search_path = control, public
as $fn$
declare
  app record;
  sql text;
  parts text[] := '{}';
  name_column text;
  time_column text;
begin
  if not control.is_owner() then
    raise exception 'The estate inbox is an owner''s screen.' using errcode = '42501';
  end if;

  for app in
    select * from control.applications
     where is_active and db_schema is not null
     order by sort_order
  loop
    /* ------------------------------------------------------------ messages */
    if app.message_table is not null then
      time_column := control.first_column(
        app.db_schema, app.message_table,
        array['created_at', 'sent_at', 'received_at', 'at']
      );

      if time_column is not null and control.first_column(
        app.db_schema, app.message_table, array['body']
      ) is not null then
        parts := parts || format(
          'select %L::text, %L::text, %L::text, m.name::text, left(m.body, 140)::text, m.%I
             from %I.%I m',
          app.key, app.name, 'message', time_column, app.db_schema, app.message_table
        );
      end if;
    end if;

    /* ----------------------------------------------------------- enquiries */
    if app.enquiry_table is not null then
      name_column := control.first_column(
        app.db_schema, app.enquiry_table,
        array['contact_name', 'customer_name', 'patient_name', 'guest_name',
              'student_name', 'visitor_name', 'person_name', 'full_name', 'name']
      );

      /* An order is `placed_at`, a viewing is `created_at`. Both are "when this
         arrived", and the inbox is a list in time order — so it needs one of
         them and does not care which. */
      time_column := control.first_column(
        app.db_schema, app.enquiry_table,
        array['created_at', 'placed_at', 'requested_at', 'submitted_at', 'at']
      );

      if name_column is not null and time_column is not null then
        parts := parts || format(
          'select %L::text, %L::text, %L::text, e.%I::text, %L::text, e.%I
             from %I.%I e',
          app.key, app.name, 'enquiry', name_column,
          app.enquiry_table, time_column, app.db_schema, app.enquiry_table
        );
      end if;
    end if;
  end loop;

  if array_length(parts, 1) is null then
    return;
  end if;

  sql := array_to_string(parts, ' union all ')
    || format(' order by 6 desc limit %s', greatest(1, least(p_limit, 200)));

  return query execute sql;
end;
$fn$;

grant execute on function control.estate_inbox(integer) to authenticated;
