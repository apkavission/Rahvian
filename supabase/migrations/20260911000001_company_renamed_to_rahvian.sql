-- ===========================================================================
-- The company's registered name, in the column defaults.
--
-- The owner's instruction, 2026-09-11: the company is registered as RAHVIAN
-- TECHNOLOGIES PRIVATE LIMITED, that is the name to use, and the "Apka Saathi"
-- product is to be removed.
--
-- ---------------------------------------------------------------------------
-- THIS MIGRATION CHANGES NOTHING A VISITOR SEES, and that is not a mistake.
--
-- `site_settings` and `seo_defaults` are single-row tables. Their rows exist
-- already, so a default is only ever read if somebody truncates the table and
-- inserts again — which is to say, on a fresh install. The live rows were
-- changed by `scripts/rename-to-rahvian.mjs`, which is content and belongs in
-- a script rather than in schema.
--
-- This exists so the two agree. Without it a fresh project would come up
-- branded with a name the company no longer has, and the next person to read
-- the schema would find the old one written into it as though it were current.
--
-- ---------------------------------------------------------------------------
-- The two migrations that carry the old name — 20260826000003_site_content and
-- 20260826000007_seo — are deliberately left alone. They are a record of what
-- ran, they ran with those defaults, and editing an applied migration makes the
-- record a lie. This is the later fact, recorded later.
-- ===========================================================================

alter table company.site_settings
  alter column company_name set default 'Rahvian',
  alter column legal_name set default 'Rahvian Technologies Private Limited';

alter table company.seo_defaults
  alter column title_template set default '%s | Rahvian',
  alter column default_title set default
    'Rahvian — Website, App & Custom Software Development',
  alter column default_description set default
    'Rahvian builds modern websites, mobile apps, custom software and AI-powered digital solutions for businesses and startups.';

-- ---------------------------------------------------------------------------
-- The product's page row was `is_system`, and a trigger protects those from
-- deletion so that nobody deletes the front page by accident. The row is gone
-- — the script lifted the flag first — and nothing here needs to change for
-- it. This comment is the only place that says why a system page could be
-- removed at all, which is the question somebody will have.
-- ---------------------------------------------------------------------------
