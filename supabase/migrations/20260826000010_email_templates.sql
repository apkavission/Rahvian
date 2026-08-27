-- ===========================================================================
-- Transactional email content, editable from the admin panel.
--
-- The wording of an email people receive is content, not code. Keeping the
-- subject line and the "what happens next" copy in a TypeScript file means
-- every correction is a deploy, and the person who actually knows how the
-- business talks to its clients cannot make one.
--
-- What stays in code is the rendering: the table layout, the inline styles and
-- the escaping. Those are constraints of the medium, not editorial decisions,
-- and putting raw HTML in a database column would hand an admin the ability to
-- break every client's inbox rendering with one paste.
--
-- The application keeps a hardcoded fallback for every key here. A missing or
-- deactivated row degrades to that fallback rather than sending an email with
-- empty fields.
-- ===========================================================================

create table company.email_templates (
  -- Stable identifier the code looks up. Never renamed once shipped.
  key           text primary key check (key ~ '^[a-z][a-z0-9_]*$'),

  -- Admin-facing: what this email is and when it goes out.
  name          text not null check (length(btrim(name)) > 0),
  description   text,

  -- Subject and the inbox preview line. Both accept {{placeholders}}.
  subject       text not null check (length(btrim(subject)) > 0),
  preheader     text,

  -- Body copy.
  heading       text not null check (length(btrim(heading)) > 0),
  intro         text,

  -- Ordered [{ "title": "...", "body": "..." }]. Rendered as numbered steps.
  steps         jsonb not null default '[]'::jsonb,

  -- { "label": "...", "href": "..." } or null for no call to action.
  button        jsonb,

  -- Small print above the footer rule.
  note          text,

  -- Turning this off falls back to the version compiled into the application,
  -- which is the safe state — never "send nothing".
  is_active     boolean not null default true,

  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),

  constraint email_templates_steps_is_array check (jsonb_typeof(steps) = 'array'),
  constraint email_templates_button_is_object
    check (button is null or jsonb_typeof(button) = 'object')
);

comment on table company.email_templates is
  'Editable copy for transactional emails. Rendering stays in code; wording does not.';
comment on column company.email_templates.key is
  'Looked up by the application. Renaming one silently disables that email.';
comment on column company.email_templates.steps is
  'Ordered array of {title, body}, rendered as the numbered "what happens next" list.';

create trigger email_templates_set_updated_at
  before update on company.email_templates
  for each row execute function company.set_updated_at();

-- ---------------------------------------------------------------------------
-- Row level security
--
-- No anon grant. These never render on a public page, and the subject lines
-- describe internal process — there is no reason for the browser to hold them.
-- ---------------------------------------------------------------------------

alter table company.email_templates enable row level security;

create policy email_templates_staff_read on company.email_templates
  for select to authenticated using (company.is_staff());

create policy email_templates_staff_write on company.email_templates
  for all to authenticated
  using (company.is_staff()) with check (company.is_staff());

-- ---------------------------------------------------------------------------
-- Seed the two templates the quote form sends.
--
-- The wording matches what the application falls back to, so switching a row
-- from inactive to active changes nothing until someone edits it deliberately.
-- ---------------------------------------------------------------------------

insert into company.email_templates
  (key, name, description, subject, preheader, heading, intro, steps, button, note)
values
  (
    'lead_acknowledgement',
    'Quote request — client confirmation',
    'Sent to the person who submitted the quote form, immediately after it is saved.',
    'We have your enquiry, {{first_name}} — {{company_name}}',
    'Thanks {{first_name}} — we have your enquiry and will reply within one working day.',
    'Thank you, {{first_name}}',
    'Your enquiry has reached {{company_name}}. Here is what happens next.',
    '[
      {
        "title": "We read it properly",
        "body": "A person goes through your enquiry — not an auto-responder deciding whether you are worth a reply."
      },
      {
        "title": "You get a real answer within one working day",
        "body": "Scope, timeline and price. If something in your brief changes the price, we say which part and why."
      },
      {
        "title": "We talk only if it is useful",
        "body": "If the written answer is enough, take it and decide in your own time. No call is required to get a number out of us."
      }
    ]'::jsonb,
    '{"label": "See what we do", "href": "{{site_url}}/services"}'::jsonb,
    'If anything above is wrong, reply to this email and we will correct it.'
  ),
  (
    'lead_notification',
    'Quote request — internal notification',
    'Sent to EMAIL_TO_ADMIN when a quote request arrives. Reply-to is the client.',
    'New enquiry — {{name}}{{service_suffix}}',
    '{{name}}{{service_suffix}} — {{description_excerpt}}',
    'New enquiry',
    '{{name}} sent this through the website. Replying to this email goes straight to them.',
    '[]'::jsonb,
    null,
    'Lead ID {{lead_id}}'
  )
on conflict (key) do nothing;
