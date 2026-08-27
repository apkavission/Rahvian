-- ===========================================================================
-- Row Level Security.
--
-- Deny by default, everywhere. Access is then granted in exactly two shapes:
--
--   1. Anonymous and authenticated visitors may SELECT published content.
--   2. Staff may do everything, subject to their role.
--
-- Leads and profiles are never readable by the anonymous role under any
-- circumstance. Lead inserts do not arrive from the browser at all — they go
-- through a Server Action holding the service role, which bypasses RLS — so
-- no insert grant is issued to anon anywhere in this file.
--
-- The service_role key bypasses RLS by design. It exists only in server
-- environment variables and must never be imported into a client component.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- Enable RLS on every table
-- ---------------------------------------------------------------------------

alter table company.profiles          enable row level security;
alter table company.media             enable row level security;
alter table company.site_settings     enable row level security;
alter table company.nav_items         enable row level security;
alter table company.pages             enable row level security;
alter table company.page_sections     enable row level security;
alter table company.technologies      enable row level security;
alter table company.services          enable row level security;
alter table company.projects          enable row level security;
alter table company.testimonials      enable row level security;
alter table company.case_studies      enable row level security;
alter table company.blog_categories   enable row level security;
alter table company.blog_posts        enable row level security;
alter table company.faqs              enable row level security;
alter table company.team_members      enable row level security;
alter table company.process_steps     enable row level security;
alter table company.pricing_plans     enable row level security;
alter table company.leads             enable row level security;
alter table company.lead_notes        enable row level security;
alter table company.lead_activity     enable row level security;
alter table company.form_submissions  enable row level security;
alter table company.redirects         enable row level security;
alter table company.seo_defaults      enable row level security;

-- ---------------------------------------------------------------------------
-- Grants
--
-- A grant is a ceiling, not a permission: RLS still has to allow the row.
-- anon receives SELECT only, and only on tables that render public pages.
-- ---------------------------------------------------------------------------

grant select on
  company.media,
  company.site_settings,
  company.nav_items,
  company.pages,
  company.page_sections,
  company.technologies,
  company.services,
  company.projects,
  company.testimonials,
  company.case_studies,
  company.blog_categories,
  company.blog_posts,
  company.faqs,
  company.team_members,
  company.process_steps,
  company.pricing_plans,
  company.redirects,
  company.seo_defaults
to anon, authenticated;

-- Staff act as `authenticated`; RLS decides what they may touch.
grant insert, update, delete on all tables in schema company to authenticated;

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------

create policy profiles_select_self on company.profiles
  for select to authenticated
  using (id = auth.uid() or company.is_staff());

create policy profiles_update_self on company.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

create policy profiles_owner_all on company.profiles
  for all to authenticated
  using (company.is_owner())
  with check (company.is_owner());

-- ---------------------------------------------------------------------------
-- Public content: readable when published, writable by staff.
--
-- The same two policies repeat per table. Written out rather than generated,
-- so the rule for any given table is visible in one place when auditing.
-- ---------------------------------------------------------------------------

-- media: metadata for assets already served from a public CDN.
create policy media_public_read on company.media
  for select to anon, authenticated using (true);
create policy media_staff_write on company.media
  for all to authenticated
  using (company.is_staff()) with check (company.is_staff());

-- site_settings: the single row is needed to render any page at all.
create policy site_settings_public_read on company.site_settings
  for select to anon, authenticated using (true);
create policy site_settings_staff_write on company.site_settings
  for all to authenticated
  using (company.is_staff()) with check (company.is_staff());

create policy nav_items_public_read on company.nav_items
  for select to anon, authenticated using (is_active);
create policy nav_items_staff_write on company.nav_items
  for all to authenticated
  using (company.is_staff()) with check (company.is_staff());

create policy pages_public_read on company.pages
  for select to anon, authenticated using (status = 'published');
create policy pages_staff_write on company.pages
  for all to authenticated
  using (company.is_staff()) with check (company.is_staff());

-- A section is public only if its page is. Without the EXISTS clause, draft
-- page bodies would be readable through the sections table.
create policy page_sections_public_read on company.page_sections
  for select to anon, authenticated
  using (
    is_active
    and exists (
      select 1 from company.pages p
      where p.id = page_sections.page_id
        and p.status = 'published'
    )
  );
create policy page_sections_staff_write on company.page_sections
  for all to authenticated
  using (company.is_staff()) with check (company.is_staff());

create policy technologies_public_read on company.technologies
  for select to anon, authenticated using (is_active);
create policy technologies_staff_write on company.technologies
  for all to authenticated
  using (company.is_staff()) with check (company.is_staff());

create policy services_public_read on company.services
  for select to anon, authenticated using (status = 'published');
create policy services_staff_write on company.services
  for all to authenticated
  using (company.is_staff()) with check (company.is_staff());

create policy projects_public_read on company.projects
  for select to anon, authenticated using (status = 'published');
create policy projects_staff_write on company.projects
  for all to authenticated
  using (company.is_staff()) with check (company.is_staff());

-- Consent is already required for publication by a check constraint; the
-- status filter here is what keeps unpublished drafts private.
create policy testimonials_public_read on company.testimonials
  for select to anon, authenticated using (status = 'published');
create policy testimonials_staff_write on company.testimonials
  for all to authenticated
  using (company.is_staff()) with check (company.is_staff());

create policy case_studies_public_read on company.case_studies
  for select to anon, authenticated using (status = 'published');
create policy case_studies_staff_write on company.case_studies
  for all to authenticated
  using (company.is_staff()) with check (company.is_staff());

create policy blog_categories_public_read on company.blog_categories
  for select to anon, authenticated using (true);
create policy blog_categories_staff_write on company.blog_categories
  for all to authenticated
  using (company.is_staff()) with check (company.is_staff());

create policy blog_posts_public_read on company.blog_posts
  for select to anon, authenticated using (status = 'published');
create policy blog_posts_staff_write on company.blog_posts
  for all to authenticated
  using (company.is_staff()) with check (company.is_staff());

create policy faqs_public_read on company.faqs
  for select to anon, authenticated using (is_active);
create policy faqs_staff_write on company.faqs
  for all to authenticated
  using (company.is_staff()) with check (company.is_staff());

create policy team_members_public_read on company.team_members
  for select to anon, authenticated using (status = 'published');
create policy team_members_staff_write on company.team_members
  for all to authenticated
  using (company.is_staff()) with check (company.is_staff());

create policy process_steps_public_read on company.process_steps
  for select to anon, authenticated using (is_active);
create policy process_steps_staff_write on company.process_steps
  for all to authenticated
  using (company.is_staff()) with check (company.is_staff());

create policy pricing_plans_public_read on company.pricing_plans
  for select to anon, authenticated using (status = 'published');
create policy pricing_plans_staff_write on company.pricing_plans
  for all to authenticated
  using (company.is_staff()) with check (company.is_staff());

create policy redirects_public_read on company.redirects
  for select to anon, authenticated using (is_active);
create policy redirects_staff_write on company.redirects
  for all to authenticated
  using (company.is_staff()) with check (company.is_staff());

create policy seo_defaults_public_read on company.seo_defaults
  for select to anon, authenticated using (true);
create policy seo_defaults_staff_write on company.seo_defaults
  for all to authenticated
  using (company.is_staff()) with check (company.is_staff());

-- ---------------------------------------------------------------------------
-- Commercial data — no anonymous access of any kind
--
-- No policy names anon, and anon holds no grant on these tables. Both layers
-- have to fail before a lead could leak.
-- ---------------------------------------------------------------------------

create policy leads_staff_read on company.leads
  for select to authenticated using (company.can_manage_leads());

create policy leads_staff_write on company.leads
  for all to authenticated
  using (company.can_manage_leads()) with check (company.can_manage_leads());

create policy lead_notes_staff_all on company.lead_notes
  for all to authenticated
  using (company.can_manage_leads()) with check (company.can_manage_leads());

-- Append-only: readable and insertable, never updated or deleted. An audit
-- trail that can be rewritten is not an audit trail.
create policy lead_activity_staff_read on company.lead_activity
  for select to authenticated using (company.can_manage_leads());

create policy lead_activity_staff_insert on company.lead_activity
  for insert to authenticated with check (company.can_manage_leads());

revoke update, delete on company.lead_activity from authenticated;

-- Rate-limit records are written by the service role only and read by nobody
-- else. No policy is created, so RLS denies every authenticated access.
revoke all on company.form_submissions from anon, authenticated;
