-- ===========================================================================
-- Per-person menus.
--
-- A menu is a permission, not a decoration (spec §15.2). Each role has a
-- default set of screens; these two arrays are how one individual differs from
-- that default — a senior employee who also handles enquiries, a new one who
-- should not touch settings yet.
--
-- Two arrays rather than one stored list, deliberately. A stored list is a
-- snapshot: add a screen to the panel next month and everyone whose menu was
-- saved before it existed silently never sees it, and nobody finds out until
-- someone asks why a colleague has a link they do not. Storing only the
-- *difference* from the role default means a new screen reaches everyone whose
-- role should have it, without touching a single row.
--
-- The keys are the ones declared in `src/components/admin/nav.ts`. They are
-- code, not content: the menu is this panel's own structure, and a key that no
-- longer exists resolves to nothing rather than to a broken link.
--
-- Note what this does NOT do. It grants no data. RLS decides which rows an
-- account may touch and it is unchanged by anything here — an editor handed
-- the enquiries screen still meets `can_manage_leads()` at the table and still
-- gets nothing. The resolved menu is the routing layer of the three; the
-- policies underneath it are the one that actually holds.
-- ===========================================================================

alter table company.profiles
  add column if not exists menu_extra  text[] not null default '{}'::text[],
  add column if not exists menu_denied text[] not null default '{}'::text[];

comment on column company.profiles.menu_extra is
  'Admin menu keys this person may reach beyond their role default.';
comment on column company.profiles.menu_denied is
  'Admin menu keys taken away from this person''s role default.';

-- Granted and taken away at once is not a state with an answer, so it is not a
-- state the table will hold. The screen writes one or the other; this is what
-- makes that a guarantee rather than a habit.
alter table company.profiles
  drop constraint if exists profiles_menu_disjoint;

alter table company.profiles
  add constraint profiles_menu_disjoint
  check (not (menu_extra && menu_denied));

