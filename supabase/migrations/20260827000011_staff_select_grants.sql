-- ===========================================================================
-- SELECT grants for signed-in staff.
--
-- Found by signing in to the admin panel for the first time: authentication
-- succeeded, and the very next query failed with
--
--     permission denied for table profiles
--
-- The RLS migration granted SELECT on the tables that render public pages, to
-- anon and authenticated together, and then granted INSERT, UPDATE and DELETE
-- on *all* tables to authenticated. Nothing granted authenticated the right to
-- READ the tables that are not public — so staff could write a lead note they
-- could never read back, and could not read their own profile at all.
--
-- Two distinct things, easily confused, and worth restating because this is
-- exactly the gap that produced the bug:
--
--   GRANT  decides whether the role may touch the table at all.
--   RLS    decides which rows it sees once it may.
--
-- These tables all carry policies already. The policies were simply never
-- reachable.
-- ===========================================================================

grant select on
  -- Every signed-in user reads their own row; `profiles_select_self` is what
  -- restricts that to their own row, or to any row for staff.
  company.profiles,

  -- Leads and everything hanging off them. `can_manage_leads()` excludes
  -- editors at the policy level, deliberately: access to content must not
  -- imply access to commercial data.
  company.leads,
  company.lead_notes,
  company.lead_activity,

  -- Editable copy for the transactional emails. Read with the service role
  -- when sending, but the admin screen that edits it reads as the signed-in
  -- user like every other screen.
  company.email_templates
to authenticated;

-- `company.form_submissions` is deliberately absent. It holds the salted
-- hashes behind the public forms’ rate limiting, is written and read only by
-- the service role, and no screen has a reason to show it.

-- No `alter default privileges` for authenticated, on purpose. A future table
-- becoming readable by every signed-in account the moment it is created is the
-- kind of default that is discovered later, by someone else. Each new table
-- gets its grant written down next to the policy that governs it.
