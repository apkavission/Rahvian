-- ---------------------------------------------------------------------------
-- The opening line of a WhatsApp click-to-chat message.
--
-- The site has carried `wa.me` buttons since phase 1, and every one of them
-- opened an empty chat. That leaves the visitor to write the first sentence,
-- which is the sentence they are least willing to write — so the button is
-- tapped and the conversation still does not start.
--
-- Stage 1 of the messaging centre (spec §25.5) is pre-filling that sentence
-- from the page the visitor was on. The wording belongs to the owner rather
-- than to a developer’s guess, so it lives here rather than in the code, like
-- every other word on this site.
--
-- `{context}` is replaced at render time with what the visitor was looking at —
-- a service name, a plan, a case study. A template with the placeholder deleted
-- is used exactly as written, because deleting it is a decision somebody made.
--
-- Nothing about this column costs money or needs an account. Click-to-chat is a
-- link; the paid, verified path is Meta’s Cloud API in phase 15 and nothing
-- here depends on it.
-- ---------------------------------------------------------------------------

alter table company.site_settings
  add column if not exists whatsapp_template text not null
    default 'Hi, I''d like to talk about {context}.';

comment on column company.site_settings.whatsapp_template is
  'Pre-filled WhatsApp message. {context} becomes the page subject at render time.';
