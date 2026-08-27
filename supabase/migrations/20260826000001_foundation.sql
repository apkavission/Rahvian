-- ===========================================================================
-- Foundation: schema, enumerated types, shared functions, base grants.
--
-- Everything for the company website lives in the `company` schema, never in
-- `public`. One Supabase project hosts seven schemas — `company`, `control`
-- and five demo schemas — and schema boundaries are what keep a compromised
-- demo application from reading company leads.
--
-- IMPORTANT: `company` must be added to the exposed schemas list before
-- PostgREST will serve it. Locally that is `[api] schemas` in config.toml.
-- On a hosted project it is Dashboard -> Project Settings -> API -> Exposed
-- schemas. The application also sets `db: { schema: 'company' }` on its
-- Supabase clients.
-- ===========================================================================

create schema if not exists company;

-- Trigram index support, used by lead and content search later on.
create extension if not exists pg_trgm with schema extensions;

-- ---------------------------------------------------------------------------
-- Enumerated types
-- ---------------------------------------------------------------------------

-- Portfolio categories. The business rule that these never blur into one
-- another is enforced by a check constraint on company.projects, not by
-- convention — see 20260826000004_catalogue.sql.
create type company.project_type as enum (
  'inhouse',   -- built by us, for us. Apka Saathi.
  'demo',      -- self-developed concept. Never a real client.
  'client',    -- real work for a real, named client.
  'previous'   -- founder/team work predating the company.
);

create type company.lead_status as enum (
  'new',
  'contacted',
  'qualified',
  'proposal_sent',
  'negotiation',
  'won',
  'lost'
);

create type company.content_status as enum (
  'draft',
  'published',
  'archived'
);

create type company.user_role as enum (
  'super_admin',  -- the whole estate, plus the control plane
  'owner',        -- everything within one application, including its users
  'admin',        -- content and leads; cannot manage users
  'editor',       -- content only; no leads, no settings
  'client',       -- client portal only
  'developer',    -- work board only
  'demo_viewer'   -- read-only, demo applications only
);

create type company.nav_location as enum (
  'header',
  'footer_primary',
  'footer_secondary',
  'footer_legal',
  'mobile'
);

create type company.theme_mode as enum (
  'light',
  'dark',
  'system'
);

-- ---------------------------------------------------------------------------
-- Shared functions
-- ---------------------------------------------------------------------------

-- Attached as a BEFORE UPDATE trigger to every table carrying updated_at, so
-- the column can never drift from reality by being forgotten in an UPDATE.
create or replace function company.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

comment on function company.set_updated_at() is
  'BEFORE UPDATE trigger. Maintains updated_at automatically.';

-- NOTE: the authorisation helpers — auth_role(), is_staff(), can_manage_leads()
-- and is_owner() — read company.profiles, so they are defined at the end of
-- 20260826000002_identity_media.sql, after that table exists. A `language sql`
-- function body is parsed and validated at creation time, so defining them
-- here would fail.

-- ---------------------------------------------------------------------------
-- Base grants
--
-- USAGE on the schema only. Table access is granted per table and then
-- narrowed by RLS. Nothing is readable by default.
-- ---------------------------------------------------------------------------

grant usage on schema company to anon, authenticated, service_role;

-- Deny by default for anything created later without an explicit grant.
alter default privileges in schema company
  revoke all on tables from anon, authenticated;
