-- ===========================================================================
-- service_role grants.
--
-- Supabase issues default privileges to service_role in the `public` schema
-- automatically. A custom schema gets none of that, so every table has to be
-- granted explicitly or the Server Actions that legitimately need to bypass
-- RLS fail with "permission denied".
--
-- Two distinct things, easily confused:
--
--   GRANT  decides whether the role may touch the table at all.
--   RLS    decides which rows it sees once it may.
--
-- service_role bypasses RLS. It does not bypass GRANT. Both are required.
--
-- This is safe: the service_role key exists only in server environment
-- variables, is never bundled into the browser, and `lib/supabase/admin.ts`
-- carries `import "server-only"` so importing it from a Client Component is a
-- build error rather than a leak.
-- ===========================================================================

grant all privileges on all tables    in schema company to service_role;
grant all privileges on all sequences in schema company to service_role;
grant execute        on all functions in schema company to service_role;

-- Cover tables added by future migrations, so this gap cannot reappear.
alter default privileges in schema company grant all     on tables    to service_role;
alter default privileges in schema company grant all     on sequences to service_role;
alter default privileges in schema company grant execute on functions to service_role;

-- The lead_activity audit trail stays append-only even for service_role.
-- Nothing in the application has a reason to rewrite history, and the whole
-- value of an audit table is that it cannot be edited after the fact.
revoke update, delete on company.lead_activity from service_role;
