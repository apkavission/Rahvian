-- ===========================================================================
-- Apka Saathi Private Limited — company schema, complete bootstrap
-- All migrations concatenated in order. Run ONCE on a fresh project.
-- ===========================================================================

-- === FILE: 20260826000001_foundation.sql ===

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


-- === FILE: 20260826000002_identity_media.sql ===

-- ===========================================================================
-- Identity and media.
--
-- profiles extends auth.users with role and per-application access.
-- media is the single record of every file in R2; nothing references a raw
-- URL anywhere else in the schema.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------

create table company.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  full_name    text not null default '',
  avatar_url   text,
  role         company.user_role not null default 'editor',
  -- Which applications this account may reach: 'company', 'clinic', 'resto',
  -- 'school', 'estate', 'crm'. One login serves the whole estate; this array
  -- is what scopes it.
  app_access   text[] not null default array['company']::text[],
  is_active    boolean not null default true,
  preferred_mode company.theme_mode not null default 'system',
  last_login_at  timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

comment on table company.profiles is
  'Application-level user record. Extends auth.users one-to-one.';
comment on column company.profiles.app_access is
  'Applications this account may access. Scopes a shared login across the estate.';

create index profiles_role_idx on company.profiles (role) where is_active;

create trigger profiles_set_updated_at
  before update on company.profiles
  for each row execute function company.set_updated_at();

-- Create a profile automatically whenever an auth user is created, so no code
-- path can produce a user without one.
--
-- Deliberately conservative defaults: 'editor', company-only access. Elevation
-- is always an explicit act by an owner, never an accident of signup.
create or replace function company.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = company, auth, pg_temp
as $$
begin
  insert into company.profiles (id, full_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function company.handle_new_auth_user();

-- ---------------------------------------------------------------------------
-- media
-- ---------------------------------------------------------------------------

create table company.media (
  id            uuid primary key default gen_random_uuid(),
  r2_key        text not null unique,
  public_url    text not null,
  filename      text not null,
  mime_type     text not null,
  size_bytes    bigint not null check (size_bytes >= 0),
  width         integer,
  height        integer,

  -- Required at the database level. Missing alt text is an accessibility and
  -- SEO failure that is trivially avoided at the point of upload and
  -- expensive to retrofit across fifteen variants later.
  alt_text      text not null check (length(btrim(alt_text)) > 0),

  caption       text,
  folder        text not null default 'general',
  blurhash      text,

  -- Dark-mode counterpart, where a single asset cannot serve both themes
  -- (logos above all). Self-referencing and nullable.
  dark_variant_id uuid references company.media(id) on delete set null,

  -- Licence attribution for demo photography. Company-site imagery is
  -- original, so this stays null there.
  attribution   text,

  uploaded_by   uuid references company.profiles(id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),

  -- An asset cannot be its own dark counterpart.
  constraint media_dark_variant_not_self check (dark_variant_id is distinct from id)
);

comment on table company.media is
  'Every file stored in R2. Nothing else in the schema stores a raw file URL.';
comment on column company.media.alt_text is
  'Mandatory. Enforced here so the rule cannot be skipped by any client.';

create index media_folder_idx on company.media (folder, created_at desc);
create index media_filename_trgm_idx on company.media using gin (filename extensions.gin_trgm_ops);

create trigger media_set_updated_at
  before update on company.media
  for each row execute function company.set_updated_at();

-- ---------------------------------------------------------------------------
-- Authorisation helpers
--
-- Defined here rather than in the foundation migration because a `language
-- sql` body is parsed at creation time, and these read company.profiles.
--
-- SECURITY DEFINER is required: an RLS policy on company.profiles cannot query
-- company.profiles to decide access without recursing infinitely.
--
-- STABLE lets the planner evaluate each once per statement rather than once
-- per row, which matters when a policy is applied to a large result set.
--
-- search_path is pinned explicitly on every one of them. A SECURITY DEFINER
-- function with a mutable search_path is a privilege-escalation vector.
-- ---------------------------------------------------------------------------

create or replace function company.auth_role()
returns company.user_role
language sql
stable
security definer
set search_path = company, auth, pg_temp
as $$
  select p.role
  from company.profiles p
  where p.id = auth.uid()
    and p.is_active
  limit 1;
$$;

comment on function company.auth_role() is
  'Role of the current user, or NULL when unauthenticated or deactivated.';

-- Anyone permitted to reach the company admin panel at all.
create or replace function company.is_staff()
returns boolean
language sql
stable
security definer
set search_path = company, auth, pg_temp
as $$
  select exists (
    select 1
    from company.profiles p
    where p.id = auth.uid()
      and p.is_active
      and p.role in ('super_admin', 'owner', 'admin', 'editor')
      and 'company' = any(p.app_access)
  );
$$;

comment on function company.is_staff() is
  'True when the caller may access the company admin panel.';

-- Roles permitted to see and act on leads. Editors are excluded deliberately:
-- access to content must not imply access to commercial data.
create or replace function company.can_manage_leads()
returns boolean
language sql
stable
security definer
set search_path = company, auth, pg_temp
as $$
  select exists (
    select 1
    from company.profiles p
    where p.id = auth.uid()
      and p.is_active
      and p.role in ('super_admin', 'owner', 'admin')
      and 'company' = any(p.app_access)
  );
$$;

comment on function company.can_manage_leads() is
  'True when the caller may read and modify leads.';

-- Roles allowed to manage users and hard-delete records.
create or replace function company.is_owner()
returns boolean
language sql
stable
security definer
set search_path = company, auth, pg_temp
as $$
  select exists (
    select 1
    from company.profiles p
    where p.id = auth.uid()
      and p.is_active
      and p.role in ('super_admin', 'owner')
  );
$$;

comment on function company.is_owner() is
  'True when the caller may manage users and hard-delete records.';

-- These are called from RLS policies, so both roles must be able to execute
-- them. They are SECURITY DEFINER and read nothing the caller could not
-- already infer about their own session.
grant execute on function company.auth_role() to anon, authenticated;
grant execute on function company.is_staff() to anon, authenticated;
grant execute on function company.can_manage_leads() to anon, authenticated;
grant execute on function company.is_owner() to anon, authenticated;


-- === FILE: 20260826000003_site_content.sql ===

-- ===========================================================================
-- Site-wide content: settings, navigation, pages and their sections.
--
-- This is the machinery behind "everything is dynamic". The header, logo,
-- menu, footer and the entire body of every page are rows here. No component
-- may contain marketing copy, an image path or a menu item.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- site_settings — exactly one row, forever
-- ---------------------------------------------------------------------------

create table company.site_settings (
  -- Singleton. The check constraint makes a second row impossible, which is
  -- simpler and safer than a partial unique index plus application discipline.
  id                integer primary key default 1 check (id = 1),

  company_name      text not null default 'Apka Saathi',
  legal_name        text not null default 'Apka Saathi Private Limited',
  tagline           text not null default '',

  logo_light_id     uuid references company.media(id) on delete set null,
  logo_dark_id      uuid references company.media(id) on delete set null,
  favicon_id        uuid references company.media(id) on delete set null,
  og_default_id     uuid references company.media(id) on delete set null,

  phone             text,
  whatsapp          text,
  email             text,
  address_line1     text,
  address_line2     text,
  city              text,
  state             text,
  postal_code       text,
  country           text not null default 'India',
  map_embed_url     text,

  -- [{ "day": "monday", "open": "10:00", "close": "19:00", "closed": false }, ...]
  working_hours     jsonb not null default '[]'::jsonb,

  cin               text,
  gst               text,

  -- { "linkedin": "...", "github": "...", "x": "...", "instagram": "..." }
  social            jsonb not null default '{}'::jsonb,

  -- Runtime theme overrides, inlined onto <html> by the server. Shape matches
  -- the variant theme payload documented in spec section 5.2, so the same
  -- editor component serves both. Empty means "use the built-in tokens".
  theme             jsonb not null default '{}'::jsonb,
  default_mode      company.theme_mode not null default 'system',
  allow_mode_toggle boolean not null default true,

  -- Global kill switch for WebGL. Turning this off falls back to the poster
  -- path that already exists for mobile, with no deploy required.
  three_d_enabled   boolean not null default true,

  -- 'full' | 'reduced' | 'off'. Lets motion be dialled back site-wide without
  -- a code change if it ever causes a problem.
  motion_level      text not null default 'full'
                      check (motion_level in ('full', 'reduced', 'off')),

  maintenance_mode  boolean not null default false,

  -- { "enabled": true, "text": "...", "href": "...", "variant": "info" }
  announcement_bar  jsonb not null default '{}'::jsonb,

  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

comment on table company.site_settings is
  'Singleton. Logo, contact details, theme defaults and global feature toggles.';

create trigger site_settings_set_updated_at
  before update on company.site_settings
  for each row execute function company.set_updated_at();

-- Seed the single row so the application never has to handle its absence.
insert into company.site_settings (id) values (1) on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- nav_items — header, footer and mobile menus
-- ---------------------------------------------------------------------------

create table company.nav_items (
  id            uuid primary key default gen_random_uuid(),
  location      company.nav_location not null,
  label         text not null check (length(btrim(label)) > 0),
  href          text not null,
  parent_id     uuid references company.nav_items(id) on delete cascade,
  sort_order    integer not null default 0,
  is_external   boolean not null default false,
  open_new_tab  boolean not null default false,
  icon          text,
  badge_text    text,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),

  constraint nav_items_not_own_parent check (parent_id is distinct from id)
);

comment on table company.nav_items is
  'Navigation. Two levels of nesting, which covers a services dropdown.';

create index nav_items_location_idx
  on company.nav_items (location, sort_order)
  where is_active;

create index nav_items_parent_idx on company.nav_items (parent_id);

create trigger nav_items_set_updated_at
  before update on company.nav_items
  for each row execute function company.set_updated_at();

-- Enforce a maximum nesting depth of two. Deeper menus are a usability
-- problem, and an unbounded self-reference is a rendering hazard.
create or replace function company.check_nav_depth()
returns trigger
language plpgsql
as $$
declare
  parent_has_parent uuid;
begin
  if new.parent_id is null then
    return new;
  end if;

  select parent_id into parent_has_parent
  from company.nav_items
  where id = new.parent_id;

  if parent_has_parent is not null then
    raise exception 'Navigation supports two levels only; % would be a third',
      new.label;
  end if;

  return new;
end;
$$;

create trigger nav_items_check_depth
  before insert or update of parent_id on company.nav_items
  for each row execute function company.check_nav_depth();

-- ---------------------------------------------------------------------------
-- pages
-- ---------------------------------------------------------------------------

create table company.pages (
  id              uuid primary key default gen_random_uuid(),
  slug            text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  title           text not null,
  status          company.content_status not null default 'draft',

  -- Marks pages whose route exists in code (home, contact, ...). They can be
  -- edited freely but never deleted, because deleting one would leave a live
  -- route with no content behind it.
  is_system       boolean not null default false,

  seo_title       text,
  seo_description text,
  seo_keywords    text[] not null default '{}',
  og_image_id     uuid references company.media(id) on delete set null,
  canonical_url   text,
  noindex         boolean not null default false,

  -- schema.org type emitted as JSON-LD for this page.
  schema_type     text,

  published_at    timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

comment on table company.pages is
  'One row per routable page. Body content lives in company.page_sections.';
comment on column company.pages.is_system is
  'True when a code route depends on this row. Blocks deletion.';

create index pages_status_idx on company.pages (status);

create trigger pages_set_updated_at
  before update on company.pages
  for each row execute function company.set_updated_at();

-- Keep published_at truthful without relying on the client to set it.
create or replace function company.sync_published_at()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'published' and new.published_at is null then
    new.published_at := now();
  elsif new.status <> 'published' then
    new.published_at := null;
  end if;
  return new;
end;
$$;

create trigger pages_sync_published_at
  before insert or update of status on company.pages
  for each row execute function company.sync_published_at();

-- System pages are permanent.
create or replace function company.block_system_page_delete()
returns trigger
language plpgsql
as $$
begin
  if old.is_system then
    raise exception 'Page "%" backs a code route and cannot be deleted', old.slug;
  end if;
  return old;
end;
$$;

create trigger pages_block_system_delete
  before delete on company.pages
  for each row execute function company.block_system_page_delete();

-- ---------------------------------------------------------------------------
-- page_sections
-- ---------------------------------------------------------------------------

create table company.page_sections (
  id                 uuid primary key default gen_random_uuid(),
  page_id            uuid not null references company.pages(id) on delete cascade,

  -- Matches a key in the application's section registry. Kept as text rather
  -- than an enum on purpose: adding a section type must not require a
  -- migration, only a new component and its Zod schema.
  type               text not null check (length(btrim(type)) > 0),

  sort_order         integer not null default 0,
  is_active          boolean not null default true,

  -- Payload, validated by the section type's Zod schema before it is written.
  content            jsonb not null default '{}'::jsonb,

  custom_class       text,
  background_variant text not null default 'default',
  motion_preset      text not null default 'default',

  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

comment on table company.page_sections is
  'Ordered body of a page. type maps to a component in the section registry.';
comment on column company.page_sections.type is
  'Text, not an enum: new section types must not require a migration.';

create index page_sections_page_idx
  on company.page_sections (page_id, sort_order)
  where is_active;

create trigger page_sections_set_updated_at
  before update on company.page_sections
  for each row execute function company.set_updated_at();


-- === FILE: 20260826000004_catalogue.sql ===

-- ===========================================================================
-- Catalogue: technologies, services, portfolio, testimonials, case studies.
--
-- This migration is where the honesty rules stop being policy and become
-- constraints. Product, Demo, Previous Experience and Client Project cannot
-- be blurred by any client, admin screen or careless import, because the
-- database refuses the row.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- technologies
-- ---------------------------------------------------------------------------

create table company.technologies (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique,
  slug        text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  category    text not null default 'other'
                check (category in ('frontend','backend','database','mobile',
                                    'ai','infrastructure','tooling','other')),
  logo_id     uuid references company.media(id) on delete set null,
  description text,
  sort_order  integer not null default 0,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on table company.technologies is
  'Technology chips and logo grids. Only genuinely relevant capabilities.';

create index technologies_category_idx
  on company.technologies (category, sort_order)
  where is_active;

create trigger technologies_set_updated_at
  before update on company.technologies
  for each row execute function company.set_updated_at();

-- ---------------------------------------------------------------------------
-- services
-- ---------------------------------------------------------------------------

create table company.services (
  id              uuid primary key default gen_random_uuid(),
  slug            text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  name            text not null,
  short_name      text,
  icon            text,
  summary         text not null default '',

  hero_heading    text,
  hero_subheading text,

  -- Long-form body as structured blocks, so the page can be composed rather
  -- than dumped as one wall of markdown.
  body            jsonb not null default '[]'::jsonb,

  -- ["Business websites", "E-commerce", ...]
  included_items  jsonb not null default '[]'::jsonb,
  -- Who this service suits.
  audience        jsonb not null default '[]'::jsonb,
  -- How we deliver this specific service.
  approach        jsonb not null default '[]'::jsonb,

  technology_ids  uuid[] not null default '{}',

  price_from      numeric(12,2),
  price_note      text,
  is_custom_quote boolean not null default false,

  sort_order      integer not null default 0,
  status          company.content_status not null default 'draft',

  seo_title       text,
  seo_description text,
  seo_keywords    text[] not null default '{}',
  og_image_id     uuid references company.media(id) on delete set null,
  canonical_url   text,
  noindex         boolean not null default false,

  published_at    timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  -- A service either quotes from a floor or is explicitly custom. Publishing
  -- one with neither leaves the pricing block on the page empty.
  constraint services_pricing_present check (
    status <> 'published'
    or is_custom_quote
    or price_from is not null
  )
);

comment on table company.services is
  'The seven service offerings. Each detail page is driven entirely from here.';

create index services_status_idx on company.services (status, sort_order);

create trigger services_set_updated_at
  before update on company.services
  for each row execute function company.set_updated_at();

create trigger services_sync_published_at
  before insert or update of status on company.services
  for each row execute function company.sync_published_at();

-- ---------------------------------------------------------------------------
-- projects — the portfolio
-- ---------------------------------------------------------------------------

create table company.projects (
  id                uuid primary key default gen_random_uuid(),
  slug              text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  title             text not null,
  type              company.project_type not null,
  category          text,

  -- Only ever populated for real client work. See the constraint below.
  client_name       text,

  summary           text not null default '',
  problem           text,
  solution          text,
  features          jsonb not null default '[]'::jsonb,
  capabilities      jsonb not null default '[]'::jsonb,

  technology_ids    uuid[] not null default '{}',
  service_ids       uuid[] not null default '{}',

  thumbnail_id      uuid references company.media(id) on delete set null,
  -- [{ "media_id": "...", "caption": "..." }, ...]
  gallery           jsonb not null default '[]'::jsonb,

  live_url          text,
  admin_demo_url    text,
  -- { "email": "demo@...", "password": "..." } — read-only accounts only.
  demo_credentials  jsonb,

  -- Live industry variants of a demo, denormalised so the company site can
  -- render them without reaching into another schema:
  -- [{ "label": "Dental Clinic", "slug": "dental", "url": "...", "thumbnail_id": "..." }]
  variants          jsonb not null default '[]'::jsonb,

  year              integer check (year is null or year between 2000 and 2100),
  is_featured       boolean not null default false,
  sort_order        integer not null default 0,
  status            company.content_status not null default 'draft',

  seo_title         text,
  seo_description   text,
  seo_keywords      text[] not null default '{}',
  og_image_id       uuid references company.media(id) on delete set null,
  canonical_url     text,
  noindex           boolean not null default false,

  published_at      timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),

  -- ---- Honesty rules, enforced ----

  -- Real client work must name the client. An unnamed "client project" is
  -- indistinguishable from an invented one.
  constraint projects_client_named check (
    type <> 'client' or (client_name is not null and length(btrim(client_name)) > 0)
  ),

  -- A demo has no client, by definition. This is the constraint that makes
  -- "never present a demo as client work" impossible to violate.
  constraint projects_demo_has_no_client check (
    type <> 'demo' or client_name is null
  ),

  -- In-house products are ours; naming a client on one would misrepresent it.
  constraint projects_inhouse_has_no_client check (
    type <> 'inhouse' or client_name is null
  ),

  -- Demo credentials only ever belong to a demo.
  constraint projects_credentials_only_for_demos check (
    demo_credentials is null or type = 'demo'
  ),

  constraint projects_variants_only_for_demos check (
    variants = '[]'::jsonb or type = 'demo'
  )
);

comment on table company.projects is
  'Portfolio. The type column and its constraints keep Product, Demo, Client and Previous Experience permanently distinct.';
comment on constraint projects_demo_has_no_client on company.projects is
  'Business rule: a demo project can never carry a client name.';

create index projects_type_status_idx on company.projects (type, status, sort_order);
create index projects_featured_idx on company.projects (is_featured) where status = 'published';

create trigger projects_set_updated_at
  before update on company.projects
  for each row execute function company.set_updated_at();

create trigger projects_sync_published_at
  before insert or update of status on company.projects
  for each row execute function company.sync_published_at();

-- ---------------------------------------------------------------------------
-- testimonials
-- ---------------------------------------------------------------------------

create table company.testimonials (
  id                uuid primary key default gen_random_uuid(),
  author_name       text not null,
  author_role       text,
  company_name      text,
  avatar_id         uuid references company.media(id) on delete set null,
  quote             text not null check (length(btrim(quote)) > 0),
  rating            smallint check (rating is null or rating between 1 and 5),
  project_id        uuid references company.projects(id) on delete set null,

  -- A testimonial may not be published until someone has confirmed the person
  -- actually said it and agreed to its use. Structural, not procedural.
  consent_confirmed boolean not null default false,
  consent_note      text,

  status            company.content_status not null default 'draft',
  sort_order        integer not null default 0,
  published_at      timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),

  constraint testimonials_require_consent check (
    status <> 'published' or consent_confirmed
  )
);

comment on table company.testimonials is
  'Real testimonials only. Publication is blocked until consent is confirmed.';
comment on constraint testimonials_require_consent on company.testimonials is
  'Business rule: no testimonial goes live without recorded consent.';

create index testimonials_status_idx on company.testimonials (status, sort_order);

create trigger testimonials_set_updated_at
  before update on company.testimonials
  for each row execute function company.set_updated_at();

create trigger testimonials_sync_published_at
  before insert or update of status on company.testimonials
  for each row execute function company.sync_published_at();

-- ---------------------------------------------------------------------------
-- case_studies
-- ---------------------------------------------------------------------------

create table company.case_studies (
  id              uuid primary key default gen_random_uuid(),
  slug            text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  project_id      uuid references company.projects(id) on delete set null,
  title           text not null,
  client_name     text,
  industry        text,

  problem         text,
  solution        text,
  features        jsonb not null default '[]'::jsonb,
  technology_ids  uuid[] not null default '{}',
  screenshots     jsonb not null default '[]'::jsonb,

  -- Nullable on purpose. We do not manufacture outcomes to fill a field, and
  -- a case study with no measured result is still worth publishing.
  results         jsonb,
  testimonial_id  uuid references company.testimonials(id) on delete set null,

  duration        text,
  status          company.content_status not null default 'draft',

  seo_title       text,
  seo_description text,
  seo_keywords    text[] not null default '{}',
  og_image_id     uuid references company.media(id) on delete set null,
  canonical_url   text,
  noindex         boolean not null default false,

  published_at    timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

comment on table company.case_studies is
  'Detailed write-ups. results and testimonial_id are nullable by design.';
comment on column company.case_studies.results is
  'Optional. Never populate with invented or estimated figures.';

create index case_studies_status_idx on company.case_studies (status, published_at desc);

create trigger case_studies_set_updated_at
  before update on company.case_studies
  for each row execute function company.set_updated_at();

create trigger case_studies_sync_published_at
  before insert or update of status on company.case_studies
  for each row execute function company.sync_published_at();


-- === FILE: 20260826000005_blog_supporting.sql ===

-- ===========================================================================
-- Blog and supporting content: FAQs, team, process, pricing.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- blog_categories
-- ---------------------------------------------------------------------------

create table company.blog_categories (
  id              uuid primary key default gen_random_uuid(),
  slug            text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  name            text not null,
  description     text,
  sort_order      integer not null default 0,
  seo_title       text,
  seo_description text,
  og_image_id     uuid references company.media(id) on delete set null,
  noindex         boolean not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create trigger blog_categories_set_updated_at
  before update on company.blog_categories
  for each row execute function company.set_updated_at();

-- ---------------------------------------------------------------------------
-- blog_posts
-- ---------------------------------------------------------------------------

create table company.blog_posts (
  id                uuid primary key default gen_random_uuid(),
  slug              text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  title             text not null,
  excerpt           text,
  content           text not null default '',
  featured_image_id uuid references company.media(id) on delete set null,
  category_id       uuid references company.blog_categories(id) on delete set null,
  tags              text[] not null default '{}',
  author_id         uuid references company.profiles(id) on delete set null,

  status            company.content_status not null default 'draft',
  published_at      timestamptz,
  reading_minutes   integer,
  is_featured       boolean not null default false,
  view_count        integer not null default 0,

  seo_title         text,
  seo_description   text,
  seo_keywords      text[] not null default '{}',
  og_image_id       uuid references company.media(id) on delete set null,
  canonical_url     text,
  noindex           boolean not null default false,

  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

comment on table company.blog_posts is
  'Markdown body in `content`. Rendered server-side so posts are crawlable.';

create index blog_posts_status_idx on company.blog_posts (status, published_at desc);
create index blog_posts_category_idx on company.blog_posts (category_id) where status = 'published';
create index blog_posts_tags_idx on company.blog_posts using gin (tags);
create index blog_posts_title_trgm_idx on company.blog_posts using gin (title extensions.gin_trgm_ops);

create trigger blog_posts_set_updated_at
  before update on company.blog_posts
  for each row execute function company.set_updated_at();

create trigger blog_posts_sync_published_at
  before insert or update of status on company.blog_posts
  for each row execute function company.sync_published_at();

-- Reading time is derived, not typed. 200 words per minute, floor of one.
create or replace function company.set_reading_minutes()
returns trigger
language plpgsql
as $$
begin
  new.reading_minutes := greatest(
    1,
    ceil(array_length(regexp_split_to_array(btrim(coalesce(new.content, '')), '\s+'), 1) / 200.0)::integer
  );
  return new;
end;
$$;

create trigger blog_posts_set_reading_minutes
  before insert or update of content on company.blog_posts
  for each row execute function company.set_reading_minutes();

-- ---------------------------------------------------------------------------
-- faqs
-- ---------------------------------------------------------------------------

create table company.faqs (
  id         uuid primary key default gen_random_uuid(),
  question   text not null check (length(btrim(question)) > 0),
  answer     text not null check (length(btrim(answer)) > 0),

  -- Which pages this FAQ belongs to: 'home', 'pricing', 'contact', or a
  -- service slug. One FAQ can serve several pages.
  scope      text[] not null default '{}',

  sort_order integer not null default 0,
  is_active  boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index faqs_scope_idx on company.faqs using gin (scope);

create trigger faqs_set_updated_at
  before update on company.faqs
  for each row execute function company.set_updated_at();

-- ---------------------------------------------------------------------------
-- team_members
-- ---------------------------------------------------------------------------

create table company.team_members (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  role         text not null,
  bio          text,
  photo_id     uuid references company.media(id) on delete set null,
  linkedin_url text,
  github_url   text,
  skills       text[] not null default '{}',
  sort_order   integer not null default 0,
  status       company.content_status not null default 'draft',
  published_at timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create trigger team_members_set_updated_at
  before update on company.team_members
  for each row execute function company.set_updated_at();

create trigger team_members_sync_published_at
  before insert or update of status on company.team_members
  for each row execute function company.sync_published_at();

-- ---------------------------------------------------------------------------
-- process_steps
-- ---------------------------------------------------------------------------

create table company.process_steps (
  id            uuid primary key default gen_random_uuid(),
  step_number   integer not null check (step_number > 0),
  title         text not null,
  description   text not null default '',
  icon          text,
  duration_note text,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),

  constraint process_steps_number_unique unique (step_number)
);

create trigger process_steps_set_updated_at
  before update on company.process_steps
  for each row execute function company.set_updated_at();

-- ---------------------------------------------------------------------------
-- pricing_plans
-- ---------------------------------------------------------------------------

create table company.pricing_plans (
  id              uuid primary key default gen_random_uuid(),
  slug            text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  name            text not null,
  tagline         text,
  price_from      numeric(12,2),
  currency        text not null default 'INR',
  price_note      text,
  is_custom_quote boolean not null default false,
  features        jsonb not null default '[]'::jsonb,
  is_highlighted  boolean not null default false,
  cta_label       text not null default 'Request a Quote',
  cta_href        text not null default '/request-a-quote',
  sort_order      integer not null default 0,
  status          company.content_status not null default 'draft',
  published_at    timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  -- Same rule as services: a published plan must show a floor or say custom.
  constraint pricing_plans_price_present check (
    status <> 'published'
    or is_custom_quote
    or price_from is not null
  )
);

create trigger pricing_plans_set_updated_at
  before update on company.pricing_plans
  for each row execute function company.set_updated_at();

create trigger pricing_plans_sync_published_at
  before insert or update of status on company.pricing_plans
  for each row execute function company.sync_published_at();


-- === FILE: 20260826000006_leads.sql ===

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


-- === FILE: 20260826000007_seo.sql ===

-- ===========================================================================
-- SEO infrastructure: redirects and global defaults.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- redirects
--
-- Slugs are immutable once published. When one has to change anyway, the old
-- path lands here so no inbound link or indexed URL is ever lost.
-- ---------------------------------------------------------------------------

create table company.redirects (
  id          uuid primary key default gen_random_uuid(),
  from_path   text not null unique check (from_path ~ '^/'),
  to_path     text not null check (to_path ~ '^(/|https?://)'),
  status_code integer not null default 301 check (status_code in (301, 302, 307, 308)),
  hit_count   integer not null default 0,
  note        text,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),

  constraint redirects_no_self_loop check (from_path <> to_path)
);

comment on table company.redirects is
  'Path redirects, resolved in middleware. Preserves link equity across slug changes.';

create index redirects_from_idx on company.redirects (from_path) where is_active;

create trigger redirects_set_updated_at
  before update on company.redirects
  for each row execute function company.set_updated_at();

-- ---------------------------------------------------------------------------
-- seo_defaults — singleton
-- ---------------------------------------------------------------------------

create table company.seo_defaults (
  id                     integer primary key default 1 check (id = 1),

  -- "%s | Apka Saathi Private Limited"
  title_template         text not null default '%s | Apka Saathi Private Limited',
  default_title          text not null default
    'Apka Saathi Private Limited — Technology, Software & Digital Solutions',
  default_description    text not null default
    'Apka Saathi Private Limited builds modern websites, mobile apps, custom software and AI-powered digital solutions for businesses and startups.',
  default_og_image_id    uuid references company.media(id) on delete set null,

  google_verification    text,
  bing_verification      text,
  ga_measurement_id      text,
  gsc_property           text,

  -- Emitted as Organization JSON-LD in the root layout. Held as a document so
  -- the shape can evolve without a migration.
  organization_schema    jsonb not null default '{}'::jsonb,

  -- Global crawl switch. Useful for the pre-launch period.
  site_noindex           boolean not null default false,

  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

comment on table company.seo_defaults is
  'Singleton. Fallbacks for every page''s metadata, plus verification codes.';

create trigger seo_defaults_set_updated_at
  before update on company.seo_defaults
  for each row execute function company.set_updated_at();

insert into company.seo_defaults (id) values (1) on conflict (id) do nothing;


-- === FILE: 20260826000008_rls.sql ===

-- ===========================================================================
-- Row Level Security.
--
-- Deny by default, everywhere. Access is then granted in exactly two shapes:
--
--   1. Anonymous and authenticated visitors may SELECT published content.
--   2. Staff may do everything, subject to their role.
--
-- Leads and profiles are never readable by the anonymous role under any
-- circumstance. Lead inserts do not arrive from the browser at all — they go
-- through a Server Action holding the service role, which bypasses RLS — so
-- no insert grant is issued to anon anywhere in this file.
--
-- The service_role key bypasses RLS by design. It exists only in server
-- environment variables and must never be imported into a client component.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- Enable RLS on every table
-- ---------------------------------------------------------------------------

alter table company.profiles          enable row level security;
alter table company.media             enable row level security;
alter table company.site_settings     enable row level security;
alter table company.nav_items         enable row level security;
alter table company.pages             enable row level security;
alter table company.page_sections     enable row level security;
alter table company.technologies      enable row level security;
alter table company.services          enable row level security;
alter table company.projects          enable row level security;
alter table company.testimonials      enable row level security;
alter table company.case_studies      enable row level security;
alter table company.blog_categories   enable row level security;
alter table company.blog_posts        enable row level security;
alter table company.faqs              enable row level security;
alter table company.team_members      enable row level security;
alter table company.process_steps     enable row level security;
alter table company.pricing_plans     enable row level security;
alter table company.leads             enable row level security;
alter table company.lead_notes        enable row level security;
alter table company.lead_activity     enable row level security;
alter table company.form_submissions  enable row level security;
alter table company.redirects         enable row level security;
alter table company.seo_defaults      enable row level security;

-- ---------------------------------------------------------------------------
-- Grants
--
-- A grant is a ceiling, not a permission: RLS still has to allow the row.
-- anon receives SELECT only, and only on tables that render public pages.
-- ---------------------------------------------------------------------------

grant select on
  company.media,
  company.site_settings,
  company.nav_items,
  company.pages,
  company.page_sections,
  company.technologies,
  company.services,
  company.projects,
  company.testimonials,
  company.case_studies,
  company.blog_categories,
  company.blog_posts,
  company.faqs,
  company.team_members,
  company.process_steps,
  company.pricing_plans,
  company.redirects,
  company.seo_defaults
to anon, authenticated;

-- Staff act as `authenticated`; RLS decides what they may touch.
grant insert, update, delete on all tables in schema company to authenticated;

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------

create policy profiles_select_self on company.profiles
  for select to authenticated
  using (id = auth.uid() or company.is_staff());

create policy profiles_update_self on company.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

create policy profiles_owner_all on company.profiles
  for all to authenticated
  using (company.is_owner())
  with check (company.is_owner());

-- ---------------------------------------------------------------------------
-- Public content: readable when published, writable by staff.
--
-- The same two policies repeat per table. Written out rather than generated,
-- so the rule for any given table is visible in one place when auditing.
-- ---------------------------------------------------------------------------

-- media: metadata for assets already served from a public CDN.
create policy media_public_read on company.media
  for select to anon, authenticated using (true);
create policy media_staff_write on company.media
  for all to authenticated
  using (company.is_staff()) with check (company.is_staff());

-- site_settings: the single row is needed to render any page at all.
create policy site_settings_public_read on company.site_settings
  for select to anon, authenticated using (true);
create policy site_settings_staff_write on company.site_settings
  for all to authenticated
  using (company.is_staff()) with check (company.is_staff());

create policy nav_items_public_read on company.nav_items
  for select to anon, authenticated using (is_active);
create policy nav_items_staff_write on company.nav_items
  for all to authenticated
  using (company.is_staff()) with check (company.is_staff());

create policy pages_public_read on company.pages
  for select to anon, authenticated using (status = 'published');
create policy pages_staff_write on company.pages
  for all to authenticated
  using (company.is_staff()) with check (company.is_staff());

-- A section is public only if its page is. Without the EXISTS clause, draft
-- page bodies would be readable through the sections table.
create policy page_sections_public_read on company.page_sections
  for select to anon, authenticated
  using (
    is_active
    and exists (
      select 1 from company.pages p
      where p.id = page_sections.page_id
        and p.status = 'published'
    )
  );
create policy page_sections_staff_write on company.page_sections
  for all to authenticated
  using (company.is_staff()) with check (company.is_staff());

create policy technologies_public_read on company.technologies
  for select to anon, authenticated using (is_active);
create policy technologies_staff_write on company.technologies
  for all to authenticated
  using (company.is_staff()) with check (company.is_staff());

create policy services_public_read on company.services
  for select to anon, authenticated using (status = 'published');
create policy services_staff_write on company.services
  for all to authenticated
  using (company.is_staff()) with check (company.is_staff());

create policy projects_public_read on company.projects
  for select to anon, authenticated using (status = 'published');
create policy projects_staff_write on company.projects
  for all to authenticated
  using (company.is_staff()) with check (company.is_staff());

-- Consent is already required for publication by a check constraint; the
-- status filter here is what keeps unpublished drafts private.
create policy testimonials_public_read on company.testimonials
  for select to anon, authenticated using (status = 'published');
create policy testimonials_staff_write on company.testimonials
  for all to authenticated
  using (company.is_staff()) with check (company.is_staff());

create policy case_studies_public_read on company.case_studies
  for select to anon, authenticated using (status = 'published');
create policy case_studies_staff_write on company.case_studies
  for all to authenticated
  using (company.is_staff()) with check (company.is_staff());

create policy blog_categories_public_read on company.blog_categories
  for select to anon, authenticated using (true);
create policy blog_categories_staff_write on company.blog_categories
  for all to authenticated
  using (company.is_staff()) with check (company.is_staff());

create policy blog_posts_public_read on company.blog_posts
  for select to anon, authenticated using (status = 'published');
create policy blog_posts_staff_write on company.blog_posts
  for all to authenticated
  using (company.is_staff()) with check (company.is_staff());

create policy faqs_public_read on company.faqs
  for select to anon, authenticated using (is_active);
create policy faqs_staff_write on company.faqs
  for all to authenticated
  using (company.is_staff()) with check (company.is_staff());

create policy team_members_public_read on company.team_members
  for select to anon, authenticated using (status = 'published');
create policy team_members_staff_write on company.team_members
  for all to authenticated
  using (company.is_staff()) with check (company.is_staff());

create policy process_steps_public_read on company.process_steps
  for select to anon, authenticated using (is_active);
create policy process_steps_staff_write on company.process_steps
  for all to authenticated
  using (company.is_staff()) with check (company.is_staff());

create policy pricing_plans_public_read on company.pricing_plans
  for select to anon, authenticated using (status = 'published');
create policy pricing_plans_staff_write on company.pricing_plans
  for all to authenticated
  using (company.is_staff()) with check (company.is_staff());

create policy redirects_public_read on company.redirects
  for select to anon, authenticated using (is_active);
create policy redirects_staff_write on company.redirects
  for all to authenticated
  using (company.is_staff()) with check (company.is_staff());

create policy seo_defaults_public_read on company.seo_defaults
  for select to anon, authenticated using (true);
create policy seo_defaults_staff_write on company.seo_defaults
  for all to authenticated
  using (company.is_staff()) with check (company.is_staff());

-- ---------------------------------------------------------------------------
-- Commercial data — no anonymous access of any kind
--
-- No policy names anon, and anon holds no grant on these tables. Both layers
-- have to fail before a lead could leak.
-- ---------------------------------------------------------------------------

create policy leads_staff_read on company.leads
  for select to authenticated using (company.can_manage_leads());

create policy leads_staff_write on company.leads
  for all to authenticated
  using (company.can_manage_leads()) with check (company.can_manage_leads());

create policy lead_notes_staff_all on company.lead_notes
  for all to authenticated
  using (company.can_manage_leads()) with check (company.can_manage_leads());

-- Append-only: readable and insertable, never updated or deleted. An audit
-- trail that can be rewritten is not an audit trail.
create policy lead_activity_staff_read on company.lead_activity
  for select to authenticated using (company.can_manage_leads());

create policy lead_activity_staff_insert on company.lead_activity
  for insert to authenticated with check (company.can_manage_leads());

revoke update, delete on company.lead_activity from authenticated;

-- Rate-limit records are written by the service role only and read by nobody
-- else. No policy is created, so RLS denies every authenticated access.
revoke all on company.form_submissions from anon, authenticated;


-- === FILE: 20260826000009_service_role_grants.sql ===

-- ===========================================================================
-- service_role grants.
--
-- Supabase issues default privileges to service_role in the `public` schema
-- automatically. A custom schema gets none of that, so every table has to be
-- granted explicitly or the Server Actions that legitimately need to bypass
-- RLS fail with "permission denied".
--
-- Two distinct things, easily confused:
--
--   GRANT  decides whether the role may touch the table at all.
--   RLS    decides which rows it sees once it may.
--
-- service_role bypasses RLS. It does not bypass GRANT. Both are required.
--
-- This is safe: the service_role key exists only in server environment
-- variables, is never bundled into the browser, and `lib/supabase/admin.ts`
-- carries `import "server-only"` so importing it from a Client Component is a
-- build error rather than a leak.
-- ===========================================================================

grant all privileges on all tables    in schema company to service_role;
grant all privileges on all sequences in schema company to service_role;
grant execute        on all functions in schema company to service_role;

-- Cover tables added by future migrations, so this gap cannot reappear.
alter default privileges in schema company grant all     on tables    to service_role;
alter default privileges in schema company grant all     on sequences to service_role;
alter default privileges in schema company grant execute on functions to service_role;

-- The lead_activity audit trail stays append-only even for service_role.
-- Nothing in the application has a reason to rewrite history, and the whole
-- value of an audit table is that it cannot be edited after the fact.
revoke update, delete on company.lead_activity from service_role;

