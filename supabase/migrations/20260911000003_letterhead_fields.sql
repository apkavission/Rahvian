-- ===========================================================================
-- The letterhead's blocks, as a list that can be added to and reordered.
--
-- The owner's instruction, an hour after the table above was created:
--
--   > company me jitna bhi chej hota h wo sab hona chiaye and jo h add field ka
--   > bhi de dena ho sakta h ki jada ya kam ho and jo h conetnt ko drap and
--   > drop kar sake wo bhi dekhna and jo h bano mene koi field khali chod h to
--   > wo letter me khali nhi hona chiaye wo gayab hi ho jayega
--
-- ---------------------------------------------------------------------------
-- WHY THE THREE BOOLEANS HAD TO GO.
--
-- `show_tagline`, `show_website` and `show_gst` each answered one question:
-- does this one thing appear? That cannot express any of what was asked for.
-- It cannot add a field nobody thought of when the column was written — a PAN,
-- a Udyam number, a branch address, a bank account — it cannot say what order
-- the blocks are in, and adding a column per field would mean a migration
-- every time the company gains a registration.
--
-- So the arrangement is **a list**: one entry per block, each naming where it
-- comes from, what it is labelled, which part of the page it sits in, and —
-- by its position in the array — the order it is drawn in. Adding a field is
-- appending to it. Reordering is moving within it. Both are edits a person
-- makes on a screen rather than changes a developer makes to a schema.
--
-- ---------------------------------------------------------------------------
-- AND THE RULE THAT MADE THE LIST NECESSARY: an empty field vanishes.
--
-- Not "prints blank" and not "prints its label with nothing after it". A
-- letterhead reading "GSTIN:" with a space after the colon looks like a
-- mistake by the company that sent it. So a block whose value is empty is not
-- rendered at all, and the block above it closes the gap — which is only
-- possible because the blocks are a list rather than fixed slots.
--
-- `jsonb` rather than a table of rows, deliberately. This is one short ordered
-- list belonging to one row, always read and written whole, and never queried
-- across. A `letterhead_fields` table would need a sort column, a foreign key
-- and a policy to say the same thing.
-- ===========================================================================

alter table company.letterhead_settings
  add column if not exists fields jsonb not null default '[]'::jsonb;

comment on column company.letterhead_settings.fields is
  'Ordered blocks. Each: {id, source, label, value, slot, showLabel}. '
  'source names a site_settings field or "custom"; an empty value is not drawn. '
  'Shape is validated by readFields() in src/lib/letterhead.ts, because jsonb '
  'cannot be, and a half-edited row must still print a letterhead.';

-- The three questions the list now answers, dropped rather than left to
-- disagree with it. The table is a day old and nothing outside this repository
-- has read it.
alter table company.letterhead_settings drop column if exists show_tagline;
alter table company.letterhead_settings drop column if exists show_website;
alter table company.letterhead_settings drop column if exists show_gst;
