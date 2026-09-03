-- ===========================================================================
-- What each role sees in the portal becomes master data too.
--
-- ---------------------------------------------------------------------------
-- The gap this closes.
--
-- `company.roles.default_menu` has always held what a role reaches **in the
-- company website**. What a role reaches in the portal was a `Record` in
-- `clientPortal/src/lib/auth/menu.ts` — six roles and their screens, written
-- in TypeScript.
--
-- That was fine while the portal managed its own team. It stopped being fine
-- the moment the company admin took that job over, because per-person grants
-- are stored as a *difference from the role's default*, and a screen cannot
-- compute a difference against a default it cannot see. The choice was to copy
-- that map into the website — a second list of what each role sees, kept in
-- step by remembering to — or to put it where the other one already lives.
--
-- ---------------------------------------------------------------------------
-- The tracker deliberately gets no column.
--
-- Its default menu turns on one question — is this person an admin — and its
-- own `menu.ts` says why: everything finer than that is a per-person grant,
-- which is what was actually wanted. A `tracker_menu` column would be a second
-- way to express something that already has a working one.
--
-- ---------------------------------------------------------------------------
-- `team` is not seeded, because it is going away.
--
-- The portal's Team screen is the thing being replaced: staff are managed in
-- the company admin now. Seeding a key for a screen that is being deleted in
-- the same change would leave every role carrying a default pointing at
-- nothing.
-- ===========================================================================

alter table company.roles
  add column if not exists portal_menu text[] not null default '{}'::text[];

comment on column company.roles.portal_menu is
  'Screens this role reaches in the client portal, before any per-person grant. The portal''s equivalent of default_menu. Keys are declared in clientPortal/src/lib/nav.ts.';

-- ---------------------------------------------------------------------------
-- The seed, which is the map that was in TypeScript, unchanged.
--
-- Written as an update per role rather than a table of values, so a role that
-- has been renamed or deleted since simply matches nothing instead of being
-- recreated by a merge.
-- ---------------------------------------------------------------------------

-- Everyone who runs the business: every portal screen there is.
update company.roles
set portal_menu = array['dashboard', 'board', 'clients', 'projects', 'requests']
where key in ('super_admin', 'admin', 'manager');

-- The work, and the queue it comes from. Not clients.
update company.roles
set portal_menu = array['dashboard', 'board', 'projects', 'requests']
where key = 'developer';

-- The work only.
update company.roles
set portal_menu = array['dashboard', 'board', 'projects']
where key in ('designer', 'qa');

-- Everybody else reaches nothing here, which is already the default.

do $say$
declare
  r record;
begin
  for r in
    select key, portal_menu from company.roles
     where cardinality(portal_menu) > 0 order by rank desc, key
  loop
    raise notice 'portal_menu  %  ->  %', rpad(r.key, 12), array_to_string(r.portal_menu, ', ');
  end loop;
end
$say$;
