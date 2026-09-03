-- ===========================================================================
-- Owner and Admin become one role, called Admin.
--
-- The owner's instruction, 2026-08-31:
--
--   > owner koi role hoga hi nhi bss admin hoga ... ye owner wala chej kahi hi
--   > aayega ye role delete karo bahut confuse hota hu
--
-- ---------------------------------------------------------------------------
-- Why it was confusing, which is worth writing down because it was not the
-- owner misreading anything.
--
-- The word appeared in three different senses at once:
--
--   **`company.roles.owner`** — a role key here, ranked 20.
--   **`company.roles.is_owner`** — a *capability* flag, carried by both the
--   owner role and super_admin. Every policy in this database reads the flag,
--   never the key.
--   **`portal.staff_role`** — a separate enum in the portal, with its own
--   'owner' value, superseded by `role_key` in 20260830000014 and still read
--   by the portal's own code.
--
-- So "delete the owner role" is three different questions. This migration
-- answers the first. The second keeps its name — it is the flag that means
-- "may administer accounts", and it now travels with Admin. The third is the
-- portal's to answer, in its own migration, in its own schema.
--
-- ---------------------------------------------------------------------------
-- Why this is safe to run, counted rather than assumed.
--
-- Asked before writing it, on 2026-08-31:
--
--     role          rank  is_owner  accounts
--     super_admin   30    true      0
--     owner         20    true      2
--     admin         10    false     0
--     editor        0     false     1
--
-- **Nobody holds Admin.** That is the whole reason this can be a merge rather
-- than a careful migration with a rollback plan: there is no account to
-- accidentally promote. Admin today means "content and enquiries, no accounts
-- and no settings", and if a single person held it, giving that row `is_owner`
-- would hand them the users screen without anybody deciding to. Nobody does.
--
-- If this is ever re-run against a database where that is no longer true, the
-- guard below stops it rather than escalating somebody quietly.
-- ===========================================================================

do $mig$
declare
  existing_admins integer;
begin
  select count(*) into existing_admins
  from company.profiles
  where role = 'admin';

  if existing_admins > 0 then
    raise exception
      'This merges Admin with Owner and would give % existing admin account(s) the accounts and settings screens. Move them off admin first, or decide deliberately that they should have it.',
      existing_admins;
  end if;
end
$mig$;

-- ---------------------------------------------------------------------------
-- 1. Admin becomes what Owner was.
--
-- Rank, capability and menu all move across, so the accounts arriving in the
-- next statement land on a role that reaches exactly what they reached this
-- morning. Doing this first also means the deferred constraint below — at
-- least one active role must carry is_owner — is satisfied at every point,
-- including the instant Owner is deleted.
-- ---------------------------------------------------------------------------

update company.roles
set
  label       = 'Admin',
  description = 'The business. Every screen, including accounts and site settings.',
  rank        = 20,
  is_owner    = true,
  is_staff    = true,
  can_manage_leads = true,
  default_menu = array[
    'dashboard','leads','pages','navigation','services','portfolio',
    'case-studies','blog','pricing','faqs','team','media','settings','seo','users'
  ],
  sort_order  = 20
where key = 'admin';

-- ---------------------------------------------------------------------------
-- 2. Everybody on Owner becomes an Admin.
--
-- Before the delete, because `profiles.role` references `roles.key` with no
-- delete rule — the foreign key would refuse, correctly, rather than orphan
-- somebody's account.
-- ---------------------------------------------------------------------------

update company.profiles
set role = 'admin'
where role = 'owner';

-- ---------------------------------------------------------------------------
-- 3. Owner is deleted.
--
-- `protect_system_roles` refuses to delete a role marked `is_system`, which is
-- the right rule and the reason the flag is cleared first rather than the
-- trigger being dropped. Everything that guard protects still protects every
-- other built-in role, and it protects this one right up until the statement
-- that deliberately retires it.
-- ---------------------------------------------------------------------------

update company.roles set is_system = false where key = 'owner';
delete from company.roles where key = 'owner';

-- ---------------------------------------------------------------------------
-- 4. Say so, out loud.
--
-- A migration that silently did the right thing is indistinguishable from one
-- that silently did nothing, and this one is pasted into an editor by hand.
-- ---------------------------------------------------------------------------

do $say$
declare
  moved integer;
begin
  select count(*) into moved from company.profiles where role = 'admin';
  raise notice 'Owner is gone. % account(s) now on Admin, which carries is_owner.', moved;
end
$say$;
