-- ===========================================================================
-- Somewhere for a demo's pictures to live.
--
-- ---------------------------------------------------------------------------
-- **The owner's instruction.**
--
--   > logo bhi lagane ke bhi dena jo admin me bhi laga sake … with text ya
--   > without text … jitna bhi demo project h wo bhi sab kuch dynamic h mtlb ki
--   > admin panel se hi sab kuch hoga jaise services wale me ho raha h
--
-- Every demo schema has carried a `media` table and `logo_light_id`,
-- `logo_dark_id` and `og_image_id` columns on `variants` since it was written.
-- All of them are empty, and they always will be, because there is nowhere to
-- put a file: this project has two storage buckets and both are private ones
-- belonging to the client portal.
--
-- ---------------------------------------------------------------------------
-- **One bucket for all six demos, not six buckets.**
--
-- A bucket is a policy surface. Six of them is six sets of rules that have to
-- agree, and the one that drifts is the one nobody re-reads — which in a public
-- bucket means either a demo whose pictures 404 or a bucket anybody can write
-- to. Paths carry the separation instead: `demo_clinic/…`, `demo_shop/…`, which
-- is a convention the application controls rather than a permission it has to
-- maintain.
--
-- ---------------------------------------------------------------------------
-- **Public to read, deliberately.**
--
-- These are logos and photographs on websites. A signed URL for a logo would
-- expire in the middle of somebody reading the page, and every image would cost
-- a round trip to mint. The private buckets beside this one hold salary slips
-- and chat attachments; this one holds things whose whole purpose is to be
-- served to anybody who opens the site.
--
-- **Written only by an estate owner.** Not by "anybody signed in": a demo's
-- panel is reachable by any staff account with access to that demo, and an
-- upload is the one action there that leaves a file on our infrastructure.
-- ===========================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'demo-media',
  'demo-media',
  true,
  /* Eight megabytes. Larger than any logo or web photograph needs, and small
     enough that a mistake — somebody uploading a print-resolution TIFF — is
     refused rather than served to every visitor. */
  8388608,
  array['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml', 'image/avif']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

/* ---------------------------------------------------------------- reading */

drop policy if exists "demo media is public" on storage.objects;

create policy "demo media is public"
  on storage.objects for select
  using (bucket_id = 'demo-media');

/* ---------------------------------------------------------------- writing */

drop policy if exists "owners add demo media" on storage.objects;

create policy "owners add demo media"
  on storage.objects for insert
  with check (bucket_id = 'demo-media' and control.is_owner());

drop policy if exists "owners replace demo media" on storage.objects;

create policy "owners replace demo media"
  on storage.objects for update
  using (bucket_id = 'demo-media' and control.is_owner())
  with check (bucket_id = 'demo-media' and control.is_owner());

drop policy if exists "owners remove demo media" on storage.objects;

create policy "owners remove demo media"
  on storage.objects for delete
  using (bucket_id = 'demo-media' and control.is_owner());
