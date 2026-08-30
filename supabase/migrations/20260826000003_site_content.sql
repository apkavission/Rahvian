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

  -- ’full’ | ’reduced’ | ’off’. Lets motion be dialled back site-wide without
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

  -- Matches a key in the application’s section registry. Kept as text rather
  -- than an enum on purpose: adding a section type must not require a
  -- migration, only a new component and its Zod schema.
  type               text not null check (length(btrim(type)) > 0),

  sort_order         integer not null default 0,
  is_active          boolean not null default true,

  -- Payload, validated by the section type’s Zod schema before it is written.
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
