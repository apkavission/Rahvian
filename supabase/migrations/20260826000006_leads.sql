-- ===========================================================================
-- Leads: the commercial heart of the site.
--
-- Nothing here is ever readable by the anonymous role. Inserts arrive only
-- through a Server Action running with the service role, so the browser needs
-- no write grant at all.
-- ===========================================================================

create table company.leads (
  id                uuid primary key default gen_random_uuid(),

  name              text not null check (length(btrim(name)) > 0),
  company_name      text,
  email             text not null check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  phone             text,
  whatsapp          text,

  service_id        uuid references company.services(id) on delete set null,
  budget_range      text,
  timeline          text,
  description       text not null default '',
  existing_website  text,
  preferred_contact text check (
                      preferred_contact is null
                      or preferred_contact in ('email','phone','whatsapp')
                    ),

  -- Attribution.
  source_page       text,
  referrer          text,
  utm               jsonb not null default '{}'::jsonb,

  status            company.lead_status not null default 'new',
  assigned_to       uuid references company.profiles(id) on delete set null,
  value_estimate    numeric(12,2),

  -- Salted hash, never a raw address. Enough for rate limiting and abuse
  -- investigation; not personal data we have no business retaining.
  ip_hash           text,
  user_agent        text,

  is_spam           boolean not null default false,

  -- Soft delete. Leads are the business asset; nothing here is ever removed
  -- by an admin action.
  archived_at       timestamptz,

  -- DPDP Act 2023: recorded at the moment of submission, from the form.
  consent_given     boolean not null default false,
  consent_text      text,

  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

comment on table company.leads is
  'Enquiries from every public form. Never exposed to the anonymous role.';
comment on column company.leads.ip_hash is
  'Salted hash of the submitting IP. Raw addresses are never stored.';
comment on column company.leads.consent_given is
  'DPDP Act 2023. Captured at submission, alongside the exact notice shown.';

create index leads_status_idx on company.leads (status, created_at desc)
  where archived_at is null and not is_spam;
create index leads_assigned_idx on company.leads (assigned_to)
  where archived_at is null;
create index leads_created_idx on company.leads (created_at desc);
create index leads_email_idx on company.leads (lower(email));
create index leads_search_idx on company.leads
  using gin ((coalesce(name,'') || ' ' || coalesce(company_name,'') || ' ' ||
              coalesce(email,'') || ' ' || coalesce(phone,''))
             extensions.gin_trgm_ops);

create trigger leads_set_updated_at
  before update on company.leads
  for each row execute function company.set_updated_at();

-- ---------------------------------------------------------------------------
-- lead_notes
-- ---------------------------------------------------------------------------

create table company.lead_notes (
  id         uuid primary key default gen_random_uuid(),
  lead_id    uuid not null references company.leads(id) on delete cascade,
  author_id  uuid references company.profiles(id) on delete set null,
  body       text not null check (length(btrim(body)) > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index lead_notes_lead_idx on company.lead_notes (lead_id, created_at desc);

create trigger lead_notes_set_updated_at
  before update on company.lead_notes
  for each row execute function company.set_updated_at();

-- ---------------------------------------------------------------------------
-- lead_activity — append-only audit of everything that happened to a lead
-- ---------------------------------------------------------------------------

create table company.lead_activity (
  id         uuid primary key default gen_random_uuid(),
  lead_id    uuid not null references company.leads(id) on delete cascade,
  actor_id   uuid references company.profiles(id) on delete set null,
  action     text not null,
  from_value text,
  to_value   text,
  created_at timestamptz not null default now()
);

create index lead_activity_lead_idx on company.lead_activity (lead_id, created_at desc);

-- Record status changes automatically. A trigger cannot be forgotten the way
-- an application call can, so the audit trail is complete by construction.
create or replace function company.log_lead_status_change()
returns trigger
language plpgsql
security definer
set search_path = company, auth, pg_temp
as $$
begin
  if new.status is distinct from old.status then
    insert into company.lead_activity (lead_id, actor_id, action, from_value, to_value)
    values (new.id, auth.uid(), 'status_changed', old.status::text, new.status::text);
  end if;

  if new.assigned_to is distinct from old.assigned_to then
    insert into company.lead_activity (lead_id, actor_id, action, from_value, to_value)
    values (new.id, auth.uid(), 'assigned',
            old.assigned_to::text, new.assigned_to::text);
  end if;

  return new;
end;
$$;

create trigger leads_log_status_change
  after update on company.leads
  for each row execute function company.log_lead_status_change();

-- ---------------------------------------------------------------------------
-- form_submissions — rate limiting substrate
--
-- Postgres is sufficient at launch volume. If it ever is not, this table is
-- replaced by Upstash Redis with no change to the calling code.
-- ---------------------------------------------------------------------------

create table company.form_submissions (
  id            uuid primary key default gen_random_uuid(),
  form_key      text not null,
  ip_hash       text not null,
  email_hash    text,
  succeeded     boolean not null default true,
  created_at    timestamptz not null default now()
);

create index form_submissions_ip_idx
  on company.form_submissions (form_key, ip_hash, created_at desc);
create index form_submissions_email_idx
  on company.form_submissions (form_key, email_hash, created_at desc);

comment on table company.form_submissions is
  'Sliding-window rate limiting for public forms. Pruned by a scheduled job.';
