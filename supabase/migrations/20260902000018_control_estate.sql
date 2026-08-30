-- ===========================================================================
-- The super admin: one place that knows about all eight applications.
--
-- Phase 10 of the plan, and the one that never started. The cost of not having
-- it is visible every day: eight panels are opened by hand, the list of which
-- applications exist is a hardcoded array in a TypeScript file, and answering
-- "has anybody written in today" means signing into six demos in turn.
--
-- ---------------------------------------------------------------------------
-- **Everything here is owner-only, and it is the one schema where that is the
-- whole point.**
--
-- The unified inbox reaches across every schema in the estate. A function that
-- can read six demos’ enquiries plus the company’s leads is the single most
-- powerful thing in this database, so it checks `is_owner` itself, in the
-- function body, rather than relying on a policy on a table it does not read.
--
-- ---------------------------------------------------------------------------
-- **The inbox is built with dynamic SQL, and that is deliberate rather than
-- lazy.**
--
-- A hand-written union of eight schemas has to be edited every time an
-- application is added — and the edit is a migration, which means the ninth
-- demo silently does not appear in the inbox until somebody notices. Instead
-- the union is assembled from `control.applications` at call time, skipping any
-- schema that is not there yet. Add a row, and the inbox includes it.
--
-- The injection risk that normally makes this a bad idea is absent here:
-- schema and table names come from a table only an owner can write, and every
-- one goes through `format(%I)`.
-- ===========================================================================

create schema if not exists control;

grant usage on schema control to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Who is the estate’s owner?
-- ---------------------------------------------------------------------------

/*
  Deliberately not `company.is_admin()`. An administrator of the company website
  may edit its content; the estate is a different question, and the answer is
  the same one `is_owner` gives everywhere else in this database.
*/
create or replace function control.is_owner()
returns boolean language sql stable security definer
set search_path = company, public
as $$
  select exists (
    select 1 from company.profiles p
    join company.roles r on r.key = p.role
    where p.id = auth.uid() and p.is_active and r.is_active and r.is_owner
  );
$$;

grant execute on function control.is_owner() to authenticated;

-- ---------------------------------------------------------------------------
-- What the estate consists of.
-- ---------------------------------------------------------------------------

create table if not exists control.applications (
  key           text primary key check (key ~ '^[a-z][a-z0-9_]*$'),
  name          text not null,

  /* What kind of thing it is, which decides what the dashboard asks of it.
       site   — the company website
       panel  — an internal application with its own accounts
       demo   — a sales demonstration with variants and share links */
  kind          text not null default 'demo' check (kind in ('site', 'panel', 'demo')),

  base_url      text not null,

  /* Null for anything without a schema of its own. The task tracker has none —
     it reads `portal` — and pretending otherwise would put an empty row in
     every count on the dashboard. */
  db_schema     text,

  /* Where the enquiries and the messages live in that schema, so the inbox can
     find them without a hardcoded list per application. */
  enquiry_table text,
  message_table text,

  /* Whether this application's key grants access, and whether it is offered as
     a tick box in Users. An application being retired should stop being offered
     before its rows are deleted. */
  grants_access boolean not null default true,

  is_active     boolean not null default true,
  sort_order    integer not null default 0,

  created_at    timestamptz not null default now()
);

comment on table control.applications is
  'Every application in the estate. The authority on what exists — the Users screen and the estate dashboard both read it rather than carrying their own list.';

insert into control.applications
  (key, name, kind, base_url, db_schema, enquiry_table, message_table, grants_access, sort_order)
values
  ('company', 'Company website',  'site',  'http://localhost:3000', 'company',     'leads',        null,       true,  10),
  ('portal',  'Internal panel',   'panel', 'http://localhost:3100', 'portal',      null,           null,       false, 20),
  ('tracker', 'Task tracker',     'panel', 'http://localhost:3200', null,          null,           null,       false, 30),
  ('clinic',  'Clinic demo',      'demo',  'http://localhost:3300', 'demo_clinic', 'appointments', 'messages', true,  40),
  ('resto',   'Restaurant demo',  'demo',  'http://localhost:3400', 'demo_resto',  'reservations', 'messages', true,  50),
  ('school',  'School demo',      'demo',  'http://localhost:3500', 'demo_school', 'admissions',   'messages', true,  60),
  ('estate',  'Property demo',    'demo',  'http://localhost:3600', 'demo_estate', 'viewings',     'messages', true,  70),
  ('crm',     'CRM demo',         'demo',  'http://localhost:3700', 'demo_crm',    'trials',       'messages', true,  80),
  ('shop',    'Store demo',       'demo',  'http://localhost:3800', 'demo_shop',   'orders',       'messages', true,  90)
on conflict (key) do nothing;

/*
  The task tracker has `grants_access = false` and it is worth writing down why.

  It does not read `app_access` at all — it decides who may sign in by looking
  for a row in `portal.staff`. Offering a tick box that changes nothing would be
  worse than offering none: somebody eventually ticks it, nothing happens, and
  the panel loses credibility it does not get back.

  This is the same mistake that was live until 2026-08-30, when the box labelled
  "Task tracker" was in fact granting access to the property demo.
*/

-- ---------------------------------------------------------------------------
-- What was done, and by whom.
-- ---------------------------------------------------------------------------

create table if not exists control.audit_log (
  id         bigint generated always as identity primary key,

  at         timestamptz not null default now(),

  /* The id may point at an account that is later deleted, so the email is
     copied. An audit line that says "somebody" is not an audit line. */
  actor_id    uuid,
  actor_email text,

  app_key    text references control.applications(key) on delete set null,
  action     text not null,
  subject    text,
  detail     jsonb not null default '{}'::jsonb
);

create index if not exists audit_log_recent_idx on control.audit_log (at desc);
create index if not exists audit_log_actor_idx on control.audit_log (actor_id, at desc);

comment on table control.audit_log is
  'Append-only record of what was done across the estate. Nothing updates or deletes a row here; a log that can be edited is not evidence of anything.';

/*
  Write a line.

  `security definer` so the caller does not need write access to the log —
  which is the point: an application may add to it and may not tidy it. There is
  deliberately no update and no delete, and no policy granting either.
*/
create or replace function control.note(
  p_action  text,
  p_app_key text default null,
  p_subject text default null,
  p_detail  jsonb default '{}'::jsonb
)
returns void language plpgsql security definer
set search_path = control, company, public
as $$
declare
  who record;
begin
  select p.id, u.email into who
  from company.profiles p
  left join auth.users u on u.id = p.id
  where p.id = auth.uid();

  insert into control.audit_log (actor_id, actor_email, app_key, action, subject, detail)
  values (who.id, who.email, p_app_key, p_action, p_subject, coalesce(p_detail, '{}'::jsonb));
end;
$$;

grant execute on function control.note(text, text, text, jsonb) to authenticated;

-- ---------------------------------------------------------------------------
-- Row-level security.
-- ---------------------------------------------------------------------------

alter table control.applications enable row level security;
alter table control.audit_log    enable row level security;

grant select on control.applications to authenticated;
grant select, insert, update, delete on control.applications to authenticated;
grant select on control.audit_log to authenticated;
grant all on all tables in schema control to service_role;

/* Anybody signed in may read the list of applications — the Users screen needs
   it to draw its tick boxes, and it is not a secret. Only an owner may change
   what the estate consists of. */
drop policy if exists applications_read on control.applications;
create policy applications_read on control.applications
  for select using (auth.uid() is not null);

drop policy if exists applications_owner_write on control.applications;
create policy applications_owner_write on control.applications
  for all using (control.is_owner()) with check (control.is_owner());

/* The log is readable by an owner and writable by nobody: every insert goes
   through `control.note`, which runs as the definer. A table somebody can
   insert into directly is a table somebody can forge a line in. */
drop policy if exists audit_owner_read on control.audit_log;
create policy audit_owner_read on control.audit_log
  for select using (control.is_owner());

-- ---------------------------------------------------------------------------
-- The estate, counted.
-- ---------------------------------------------------------------------------

/**
 * How much is in each application, and whether it answers at all.
 *
 * `reachable` is the useful column. A schema that has been dropped, renamed, or
 * never created answers false rather than raising — because the dashboard's job
 * is to say which application is broken, and a function that dies on the first
 * missing schema reports nothing about the other seven.
 */
create or replace function control.estate_counts()
returns table (
  app_key   text,
  name      text,
  kind      text,
  base_url  text,
  reachable boolean,
  enquiries bigint,
  messages  bigint,
  variants  bigint
)
language plpgsql stable security definer
set search_path = control, public
as $$
declare
  app record;
begin
  if not control.is_owner() then
    raise exception 'The estate dashboard is an owner''s screen.';
  end if;

  for app in
    select * from control.applications where is_active order by sort_order
  loop
    app_key := app.key;
    name := app.name;
    kind := app.kind;
    base_url := app.base_url;
    enquiries := null;
    messages := null;
    variants := null;

    reachable := app.db_schema is null or exists (
      select 1 from information_schema.schemata s where s.schema_name = app.db_schema
    );

    if reachable and app.db_schema is not null then
      if app.enquiry_table is not null and exists (
        select 1 from information_schema.tables t
        where t.table_schema = app.db_schema and t.table_name = app.enquiry_table
      ) then
        execute format('select count(*) from %I.%I', app.db_schema, app.enquiry_table)
          into enquiries;
      end if;

      if app.message_table is not null and exists (
        select 1 from information_schema.tables t
        where t.table_schema = app.db_schema and t.table_name = app.message_table
      ) then
        execute format('select count(*) from %I.%I', app.db_schema, app.message_table)
          into messages;
      end if;

      if exists (
        select 1 from information_schema.tables t
        where t.table_schema = app.db_schema and t.table_name = 'variants'
      ) then
        execute format('select count(*) from %I.variants where is_active', app.db_schema)
          into variants;
      end if;
    end if;

    return next;
  end loop;
end;
$$;

grant execute on function control.estate_counts() to authenticated;

/**
 * One inbox for the whole estate.
 *
 * Everything anybody has written to any of the eight applications, newest
 * first, in one list. Before this, answering "has anybody written in today"
 * meant signing into six demo panels in turn — which meant it was not answered.
 *
 * **Only what is needed to decide whether to open it.** A name, a line of what
 * they said, and where it came from. No phone numbers and no addresses: this is
 * a screen for triage, and the details live in the application that owns them.
 */
create or replace function control.estate_inbox(p_limit integer default 50)
returns table (
  app_key text,
  app_name text,
  kind    text,
  who     text,
  summary text,
  at      timestamptz
)
language plpgsql stable security definer
set search_path = control, public
as $$
declare
  app record;
  sql text;
  parts text[] := '{}';
begin
  if not control.is_owner() then
    raise exception 'The estate inbox is an owner''s screen.';
  end if;

  for app in
    select * from control.applications
     where is_active and db_schema is not null
     order by sort_order
  loop
    /* Messages: the same three columns in every demo schema. */
    if app.message_table is not null and exists (
      select 1 from information_schema.columns c
      where c.table_schema = app.db_schema and c.table_name = app.message_table
        and c.column_name = 'body'
    ) then
      parts := parts || format(
        'select %L::text, %L::text, %L::text, m.name::text, left(m.body, 140)::text, m.created_at
           from %I.%I m',
        app.key, app.name, 'message', app.db_schema, app.message_table
      );
    end if;

    /* Enquiries: the column holding the person's name differs per demo, so it
       is found rather than assumed. A demo whose enquiry table has no
       recognisable name column is skipped instead of breaking the whole list. */
    if app.enquiry_table is not null then
      declare
        name_column text;
      begin
        select c.column_name into name_column
        from information_schema.columns c
        where c.table_schema = app.db_schema
          and c.table_name = app.enquiry_table
          and c.column_name in
            ('contact_name', 'customer_name', 'patient_name', 'guest_name',
             'student_name', 'visitor_name', 'person_name', 'full_name', 'name')
        order by array_position(
          array['contact_name','customer_name','patient_name','guest_name',
                'student_name','visitor_name','person_name','full_name','name'],
          c.column_name)
        limit 1;

        if name_column is not null then
          parts := parts || format(
            'select %L::text, %L::text, %L::text, e.%I::text, %L::text, e.created_at
               from %I.%I e',
            app.key, app.name, 'enquiry', name_column,
            app.enquiry_table, app.db_schema, app.enquiry_table
          );
        end if;
      exception when others then
        /* One application's odd table must not take the whole inbox down. */
        null;
      end;
    end if;
  end loop;

  if array_length(parts, 1) is null then
    return;
  end if;

  sql := array_to_string(parts, ' union all ')
    || format(' order by 6 desc limit %s', greatest(1, least(p_limit, 200)));

  return query execute sql;
end;
$$;

grant execute on function control.estate_inbox(integer) to authenticated;

-- ---------------------------------------------------------------------------
-- Put the screen on the owner’s menu.
-- ---------------------------------------------------------------------------

/*
  The menu is master data: `company.roles.default_menu` decides what a role
  reaches, and a screen that exists in the code and not in that array is a
  screen nobody can open.

  This is the step that gets forgotten, and the unit test that compares an
  owner's resolved menu against the declared navigation is what catches it —
  which it did, immediately, when `estate` was added to the nav and to nothing
  else.

  Only roles that already carry `is_owner`. Adding it to `admin` would hand the
  whole estate's enquiries to somebody whose job is this website's content.
*/
update company.roles
   set default_menu = default_menu || array['estate']
 where is_owner
   and not ('estate' = any (default_menu));
