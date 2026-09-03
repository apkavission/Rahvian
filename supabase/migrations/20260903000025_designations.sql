-- ===========================================================================
-- Designation, which is not the same thing as role.
--
-- ---------------------------------------------------------------------------
-- **The owner's distinction, and it is a real one.**
--
--   * A **role** decides what somebody may do. "Admin", "Developer" — it is
--     read by `is_owner`, by every menu, by every policy. Changing it changes
--     what they can see.
--
--   * A **designation** is what they are called. "Senior Software Engineer",
--     "UI/UX Designer", "Project Manager". It goes on an offer letter, beside a
--     name on a project team, in a signature. It decides nothing.
--
-- They were one field, so giving somebody the title "Senior Developer" meant
-- inventing a role — and a role is a permission. Two people doing identical
-- work at different seniorities had to either share a title or be given
-- different access to get one.
--
-- ---------------------------------------------------------------------------
-- **Master data, like everything else the owner might want to add next month.**
-- Adding "Tech Lead" is a row, not a migration. The rule that produced
-- `company.roles`, `leave_types_master`, `services_master` and
-- `document_types` produces this too.
-- ===========================================================================

create table company.designations (
  /* The stable name the data is filed under. Renaming one would detach every
     person carrying it, so the label is what changes when wording changes. */
  key text primary key,
  label text not null,

  /* What kind of work it describes. Not a permission — it is for grouping a
     long list on a form, so "Designer" and "Developer" do not interleave. */
  family text not null default 'other',

  sort_order integer not null default 0,
  is_active boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table company.designations is
  'What somebody is called. Separate from company.roles, which decides what they may do: a title is not a permission, and needing a new role to give somebody a new title is how permissions drift.';

insert into company.designations (key, label, family, sort_order) values
  ('intern',              'Intern',                     'general',  10),
  ('trainee',             'Trainee',                    'general',  20),
  ('junior_developer',    'Junior Software Developer',  'build',    30),
  ('developer',           'Software Developer',         'build',    40),
  ('senior_developer',    'Senior Software Developer',  'build',    50),
  ('tech_lead',           'Technical Lead',             'build',    60),
  ('ui_ux_designer',      'UI/UX Designer',             'design',   70),
  ('graphic_designer',    'Graphic Designer',           'design',   80),
  ('qa_engineer',         'QA Engineer',                'build',    90),
  ('project_manager',     'Project Manager',            'manage',  100),
  ('account_manager',     'Account Manager',            'manage',  110),
  ('digital_marketer',    'Digital Marketing Executive','growth',  120),
  ('seo_specialist',      'SEO Specialist',             'growth',  130),
  ('content_writer',      'Content Writer',             'growth',  140),
  ('business_analyst',    'Business Analyst',           'manage',  150),
  ('director',            'Director',                   'manage',  160);

alter table company.designations enable row level security;

/*
  Readable by anybody signed in, because a designation is a label that appears
  beside a name all over the estate — on a project team, in an offer letter.
  Hiding the list would mean every screen hard-coding the words, which is what
  this table exists to prevent.
*/
create policy designations_read on company.designations
  for select using (auth.uid() is not null);

create policy designations_write on company.designations
  for all
  using (company.is_owner())
  with check (company.is_owner());

grant select on company.designations to authenticated;
grant insert, update, delete on company.designations to authenticated;

-- ---------------------------------------------------------------------------
-- The portal reads it the same way it reads roles.
--
-- A view with `security_invoker = false`, so the portal's own users can read
-- the list without a grant on `company` — exactly the shape `roles_master` and
-- `services_master` already use. The alternative is a policy over there naming
-- this schema, which is the coupling this estate was built without.
-- ---------------------------------------------------------------------------

create or replace view portal.designations_master
with (security_invoker = false) as
  select key, label, family, sort_order, is_active
  from company.designations
  where is_active;

comment on view portal.designations_master is
  'The designation list, read-only, for the portal and the tracker. Definer on purpose: the same shape as roles_master, so neither application needs a grant on company.';

grant select on portal.designations_master to authenticated;

-- ---------------------------------------------------------------------------
-- And on the person.
-- ---------------------------------------------------------------------------

alter table portal.staff
  add column designation_key text;

comment on column portal.staff.designation_key is
  'What this person is called — a key in company.designations, read through portal.designations_master. Nullable: somebody can work here before anybody decides on a title, and a blank is better than a wrong one.';

/*
  Not a foreign key, deliberately.

  `portal.staff` cannot reference `company.designations` without the portal
  depending on the website's schema, which is the coupling `control` exists to
  avoid. `role_key` beside it is unconstrained for the same reason. A key that
  no longer exists shows as itself rather than as a crash — see how every
  screen in this estate falls back to the key when a label is missing.
*/
create index staff_designation_idx on portal.staff (designation_key)
  where designation_key is not null;
