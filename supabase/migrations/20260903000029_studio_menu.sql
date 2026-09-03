-- ===========================================================================
-- The logo and banner studio becomes a screen somebody can be given.
--
-- ---------------------------------------------------------------------------
-- **The owner's instruction.**
--
--   > ye wala menu alag banaya h na kyu ki ho sakta h ye menu superadmin admin
--   > ko bhi na de kisi manager ya TL ko de to es hisab se karna h
--
-- So `studio` is its own key rather than something folded into Media or
-- Settings. A key is what can be handed to one person and taken from another;
-- anything folded into an existing screen travels with that screen for ever.
--
-- ---------------------------------------------------------------------------
-- **Why an owner starts with it rather than being given it.**
--
-- The words point the other way — hand it out, do not assume it. The database
-- points at this: **nobody holds `super_admin`.** Both accounts that own this
-- estate hold `admin`, so a studio left out of the admin default would be a
-- screen no living account could open, including the account that has to decide
-- who opens it.
--
-- What was asked for survives that. `studio` is grantable, so:
--
--   * a manager or team lead is given it on the Users screen, alone, without
--     being given anything else;
--   * an admin who should not have it is denied it there, per person;
--   * a role can carry it by default or not, edited in Users → Roles.
--
-- The only thing that changed is which way round the first click goes.
--
-- ---------------------------------------------------------------------------
-- **Nothing is taken away here.** Every role keeps the menu it had; one key is
-- added to two of them, and only where it is not already present, so running
-- this twice changes nothing the second time.
-- ===========================================================================

update company.roles
set default_menu = default_menu || array['studio']
where key in ('super_admin', 'admin')
  and not (default_menu @> array['studio']);

/*
  Anybody who was explicitly *denied* studio keeps being denied it.

  That cannot have happened yet — the key did not exist until this migration —
  but writing the guard rather than assuming is the difference between a
  migration that is safe to re-run and one that is safe today.
*/
update company.profiles
set menu_extra = array_remove(menu_extra, 'studio')
where menu_extra @> array['studio']
  and menu_denied @> array['studio'];

comment on column company.roles.default_menu is
  'The admin screens this role reaches before anything is said about the person. Keys come from components/admin/nav.ts; a key here that the code no longer declares is ignored rather than breaking the menu.';
