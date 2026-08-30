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
  -- Which applications this account may reach: ’company’, ’clinic’, ’resto’,
  -- ’school’, ’estate’, ’crm’. One login serves the whole estate; this array
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
-- Deliberately conservative defaults: ’editor’, company-only access. Elevation
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
