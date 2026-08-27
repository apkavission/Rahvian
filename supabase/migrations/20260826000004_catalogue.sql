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
