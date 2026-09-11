-- ===========================================================================
-- The letterhead, and the letters written on it.
--
-- The owner's instruction, 2026-09-11:
--
--   > letter head banne wala menu add karna h … ye service ke admin panel me
--   > hoga and ye dynamic hoga sab kuch … beech ka bhi content bhi copy kar ya
--   > paste karenge and change karenge rich editor ka use karna
--
-- ---------------------------------------------------------------------------
-- WHY THIS NEEDS TABLES AT ALL.
--
-- The frame of a letterhead needs none: the name, the registered address, the
-- CIN, the phone, the email and the logo all live in `company.site_settings`
-- already, which is what makes a generated letterhead worth having — it cannot
-- say a different address from the website's footer, and a letterhead typed
-- into Word says whatever it said the day somebody typed it.
--
-- What needs storing is the two things settings has no column for: **how the
-- frame is arranged**, which is one decision the company makes once, and **the
-- letters themselves**, which is a document per letter.
--
-- ---------------------------------------------------------------------------
-- A LETTER IS NOT SITE CONTENT, AND THIS IS THE LINE THAT MATTERS.
--
-- Every other table in this schema is a website: readable by `anon` when it is
-- published, because publishing is the point. A letter is addressed to one
-- person, may quote a price, and may be a notice to an employee. So `letters`
-- follows the shape used for `leads` instead — no grant to `anon`, no policy
-- naming `anon`, and both layers would have to fail before one leaked.
--
-- `letterhead_settings` is the opposite: it is the company's own stationery
-- design, and the public site never reads it either. Staff only, both ways.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- The stationery
--
-- One row, like `site_settings` and `seo_defaults`, and for the same reason:
-- a company has one letterhead. The `id = 1` check is what makes that true in
-- the database rather than true by convention.
-- ---------------------------------------------------------------------------

create table if not exists company.letterhead_settings (
  id                integer primary key default 1 check (id = 1),

  /* Which arrangement. The four are in `src/lib/letterhead.ts`, and the check
     constraint is here so a hand-edited row cannot name a fifth that the page
     would then fail to render. */
  layout            text not null default 'classic'
                      check (layout in ('classic', 'centred', 'band', 'minimal')),

  /* The rule, the band and the small accents. Defaults to the site's own
     accent; a company whose logo is a different colour changes it here rather
     than living with a letterhead that fights its own logo. */
  accent            text not null default '#0E7C7B'
                      check (accent ~ '^#[0-9a-fA-F]{6}$'),

  /* The mark, printed at a size somebody chose. A logo is drawn at whatever
     size its file happens to be, and on paper that is almost never right. */
  logo_scale        integer not null default 100 check (logo_scale between 40 and 220),

  show_tagline      boolean not null default true,
  show_gst          boolean not null default true,
  show_website      boolean not null default true,

  /* A line the company wants on every letter that the law does not ask for —
     an ISO number, a bank detail, "This is a computer-generated letter". */
  footer_note       text not null default '',

  updated_at        timestamptz not null default now()
);

insert into company.letterhead_settings (id) values (1) on conflict (id) do nothing;

create trigger letterhead_settings_set_updated_at
  before update on company.letterhead_settings
  for each row execute function company.set_updated_at();

-- ---------------------------------------------------------------------------
-- The letters
--
-- `body_html` is HTML because the body is written and pasted in a rich editor,
-- and because the thing this produces is a printed page: the bold, the lists
-- and the paragraph breaks *are* the content. Storing it as markdown would mean
-- converting on the way in and on the way out, and a letter that came back from
-- that round trip subtly different is worse than useless — it is a document
-- somebody has already signed.
--
-- It is written by staff and rendered only to staff, in the panel. Nothing
-- public ever reads this column.
-- ---------------------------------------------------------------------------

create table if not exists company.letters (
  id                uuid primary key default gen_random_uuid(),

  /* What it is called in the list. Not printed on the page. */
  title             text not null check (length(trim(title)) > 0),

  /* Printed. The block above the salutation. */
  recipient         text not null default '',
  /* "Ref: RT/2026/014" — the number a reply quotes back. */
  reference         text not null default '',
  letter_date       date,
  subject           text not null default '',
  salutation        text not null default '',

  body_html         text not null default '',

  /* Who signs it, printed under the space left for a signature. */
  signatory_name    text not null default '',
  signatory_role    text not null default '',

  /* Null means "use the company's letterhead". A letter may override it — a
     notice on the minimal layout, a covering letter on the classic one. */
  layout            text check (layout in ('classic', 'centred', 'band', 'minimal')),

  status            text not null default 'draft' check (status in ('draft', 'final')),

  created_by        uuid references company.profiles(id) on delete set null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

/* The list is newest first, and it is the only way this table is read in bulk. */
create index if not exists letters_recent_idx on company.letters (updated_at desc);

create trigger letters_set_updated_at
  before update on company.letters
  for each row execute function company.set_updated_at();

-- ---------------------------------------------------------------------------
-- Access
--
-- `grant insert, update, delete on all tables in schema company to
-- authenticated` in 20260826000008_rls.sql applied to the tables that existed
-- when it ran. A table created afterwards holds no grant at all, which fails as
-- a silent empty result rather than as an error — so both grants are named
-- here, explicitly, and neither mentions `anon`.
-- ---------------------------------------------------------------------------

grant select, insert, update, delete on company.letterhead_settings to authenticated;
grant select, insert, update, delete on company.letters to authenticated;

alter table company.letterhead_settings enable row level security;
alter table company.letters enable row level security;

create policy letterhead_settings_staff_all on company.letterhead_settings
  for all to authenticated
  using (company.is_staff()) with check (company.is_staff());

create policy letters_staff_all on company.letters
  for all to authenticated
  using (company.is_staff()) with check (company.is_staff());
