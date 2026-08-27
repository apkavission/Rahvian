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
