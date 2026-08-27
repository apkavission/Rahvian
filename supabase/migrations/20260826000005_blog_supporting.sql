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
