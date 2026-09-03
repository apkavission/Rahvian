-- ===========================================================================
-- Every demo link in the estate, on one screen, for whoever owns the estate.
--
-- ---------------------------------------------------------------------------
-- **The owner's instruction.**
--
--   > ye admin panel me hoga … us demos project ke … and isko superadmin bhi
--   > manage kar sakta h … and jo expire ho gaya to show hona chiaye and open
--   > hua to kitni baar ye bhi … sab kuch detail chaiye ek ek
--
-- Each demo already has this screen for itself: `demo_clinic.share_links` and
-- `/admin/links` inside the clinic project. What did not exist is the second
-- half of the sentence — one place where the person accountable for the whole
-- estate sees all six without signing into six panels.
--
-- ---------------------------------------------------------------------------
-- **These functions read the demos' own tables. They do not keep their own.**
--
-- The obvious build is a `control.demo_links` table that the estate manages and
-- the demos consult. It was written and thrown away, because it puts one link
-- in two places: the demo's proxy checks `demo_clinic.share_links` on every
-- request, so a link revoked in the estate screen would still open the demo
-- until somebody noticed the two tables disagreed. Revocation that does not
-- revoke is worse than no revocation, because it is believed.
--
-- So there is exactly one row for a link, in the demo that owns it, and two
-- screens onto it.
--
-- ---------------------------------------------------------------------------
-- **Why dynamic SQL, which is normally a thing to avoid.**
--
-- Six schemas, identical shape, and a seventh demo arrives as a row in
-- `control.applications` rather than as an edit here. The alternative is a
-- hand-written union of six branches that somebody must remember to extend —
-- and the failure mode of forgetting is a demo whose links are invisible to the
-- estate, which is silent.
--
-- **The schema name never comes from the caller.** It is looked up from
-- `control.applications` by key and passed through `format(%I)`. A caller who
-- invents an app key gets "not a demo"; there is nothing to inject into.
-- ===========================================================================

/**
 * The schema behind a demo, or an error.
 *
 * One place to check three things — that the key exists, that it is a demo, and
 * that it has a schema — so no function below repeats them and none forgets.
 */
create or replace function control.demo_schema(p_app_key text)
returns text
language sql
stable
security definer
set search_path = control, public
as $fn$
  select a.db_schema
  from control.applications a
  where a.key = p_app_key and a.kind = 'demo' and a.db_schema is not null;
$fn$;

grant execute on function control.demo_schema(text) to authenticated;

-- ---------------------------------------------------------------------------
-- What exists.
-- ---------------------------------------------------------------------------

/**
 * Every variant of every demo: what could be shared, and what is open to the
 * world right now.
 *
 * The visibility column is here because it is the first question on this
 * screen. Every one of the eighteen was `public` until 2026-09-03 — meaning the
 * links were decoration, since the address alone worked. Showing it beside the
 * links is what stops that being true again quietly.
 */
create or replace function control.demo_variants()
returns table (
  app_key text,
  app_name text,
  base_url text,
  variant_id uuid,
  slug text,
  name text,
  business_name text,
  visibility text,
  is_active boolean,
  live_links integer
)
language plpgsql
stable
security definer
set search_path = control, public
as $fn$
declare
  app record;
begin
  if not control.is_owner() then
    return;
  end if;

  for app in
    select a.key, a.name, a.base_url, a.db_schema
    from control.applications a
    where a.kind = 'demo' and a.db_schema is not null and a.is_active
    order by a.sort_order
  loop
    return query execute format(
      $q$
        select
          %L::text, %L::text, %L::text,
          v.id, v.slug, v.name, v.business_name, v.visibility, v.is_active,
          (select count(*)::integer
             from %I.share_links l
            where l.variant_id = v.id
              and l.revoked_at is null
              and l.expires_at > now()
              and (l.max_views is null or l.view_count < l.max_views))
        from %I.variants v
        order by v.sort_order, v.slug
      $q$,
      app.key, app.name, app.base_url, app.db_schema, app.db_schema
    );
  end loop;
end;
$fn$;

grant execute on function control.demo_variants() to authenticated;

/**
 * Every link ever issued, across every demo, newest first.
 *
 * **Dead links are returned too.** The row is the record of who was sent what
 * and how often they opened it, and that is worth more after the link dies than
 * before — "they never opened it" and "they opened it nine times" are different
 * conversations with the same prospect.
 *
 * `state` is worked out here rather than in each screen, so the estate and the
 * demo's own panel cannot end up calling the same link by two different names.
 */
create or replace function control.demo_links(p_app_key text default null)
returns table (
  app_key text,
  app_name text,
  base_url text,
  link_id uuid,
  token text,
  label text,
  note text,
  variant_name text,
  variant_slug text,
  created_at timestamptz,
  expires_at timestamptz,
  revoked_at timestamptz,
  view_count integer,
  max_views integer,
  last_seen_at timestamptz,
  state text
)
language plpgsql
stable
security definer
set search_path = control, public
as $fn$
declare
  app record;
begin
  if not control.is_owner() then
    return;
  end if;

  for app in
    select a.key, a.name, a.base_url, a.db_schema
    from control.applications a
    where a.kind = 'demo'
      and a.db_schema is not null
      and a.is_active
      and (p_app_key is null or a.key = p_app_key)
    order by a.sort_order
  loop
    return query execute format(
      $q$
        select
          %L::text, %L::text, %L::text,
          l.id, l.token, l.label, l.note, v.name, v.slug,
          l.created_at, l.expires_at, l.revoked_at,
          l.view_count, l.max_views, l.last_seen_at,
          case
            when l.revoked_at is not null then 'revoked'
            when l.expires_at <= now() then 'expired'
            when l.max_views is not null and l.view_count >= l.max_views then 'used_up'
            else 'live'
          end
        from %I.share_links l
        join %I.variants v on v.id = l.variant_id
      $q$,
      app.key, app.name, app.base_url, app.db_schema, app.db_schema
    );
  end loop;
end;
$fn$;

grant execute on function control.demo_links(text) to authenticated;

/**
 * Every opening of one link — the "ek ek" of the instruction.
 *
 * The count on the link answers "how many". This answers when, and from what,
 * which is the question somebody actually asks when a client says they never
 * received it.
 */
create or replace function control.demo_link_opens(p_app_key text, p_link_id uuid)
returns table (opened_at timestamptz, user_agent text, referrer text)
language plpgsql
stable
security definer
set search_path = control, public
as $fn$
declare
  schema_name text;
begin
  if not control.is_owner() then
    return;
  end if;

  schema_name := control.demo_schema(p_app_key);
  if schema_name is null then
    return;
  end if;

  return query execute format(
    $q$
      select o.opened_at, o.user_agent, o.referrer
      from %I.share_link_opens o
      where o.link_id = %L
      order by o.opened_at desc
    $q$,
    schema_name, p_link_id
  );
end;
$fn$;

grant execute on function control.demo_link_opens(text, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Letting somebody in, and taking it back.
-- ---------------------------------------------------------------------------

/**
 * Issue a link, and return the token — the one and only time it is handed back.
 *
 * **The token is made here, not passed in**, so nothing a caller controls ends
 * up in it.
 *
 * Two random uuids with the dashes taken out — 244 bits, and long enough that
 * guessing is not a strategy against a table whose whole security is the secret
 * in it. `gen_random_uuid()` rather than pgcrypto's `gen_random_bytes`, which
 * is installed in the `extensions` schema on Supabase and so is not on the
 * search path a `security definer` function is pinned to. Reaching across to it
 * would work today and break the first time that changes; this needs nothing
 * beyond core Postgres.
 *
 * **A day to a year.** No "never expires", because a link that never expires is
 * the open website this replaces, and offering it means somebody makes one by
 * accident on a Friday afternoon.
 */
create or replace function control.create_demo_link(
  p_app_key text,
  p_variant_id uuid,
  p_label text,
  p_days integer,
  p_max_views integer default null,
  p_note text default null
)
returns text
language plpgsql
security definer
set search_path = control, company, public
as $fn$
declare
  schema_name text;
  new_token text;
  ok boolean;
begin
  if not control.is_owner() then
    raise exception 'Only an estate owner may share a demo.' using errcode = '42501';
  end if;

  schema_name := control.demo_schema(p_app_key);
  if schema_name is null then
    raise exception 'There is no demo called %.', p_app_key using errcode = 'no_data_found';
  end if;

  if coalesce(btrim(p_label), '') = '' then
    raise exception 'Say who the link is for — it is the only way to tell two of them apart later.'
      using errcode = 'check_violation';
  end if;

  if p_days is null or p_days < 1 or p_days > 365 then
    raise exception 'A demo link lasts between a day and a year.'
      using errcode = 'check_violation';
  end if;

  if p_max_views is not null and p_max_views < 1 then
    raise exception 'A limit of zero openings is a link that was never sent.'
      using errcode = 'check_violation';
  end if;

  /* The variant must belong to the demo named. Without this a caller could pair
     the clinic's key with the shop's variant id and make a row the shop's own
     proxy would honour but the clinic's screen would list. */
  execute format(
    'select exists (select 1 from %I.variants v where v.id = %L)',
    schema_name, p_variant_id
  ) into ok;

  if not ok then
    raise exception 'That business is not part of the % demo.', p_app_key
      using errcode = 'foreign_key_violation';
  end if;

  new_token := replace(gen_random_uuid()::text, '-', '')
            || replace(gen_random_uuid()::text, '-', '');

  execute format(
    $q$
      insert into %I.share_links
        (variant_id, token, label, note, expires_at, max_views, created_by)
      values (%L, %L, %L, %L, now() + make_interval(days => %s), %s, %L)
    $q$,
    schema_name,
    p_variant_id,
    new_token,
    btrim(p_label),
    nullif(btrim(coalesce(p_note, '')), ''),
    p_days,
    coalesce(p_max_views::text, 'null'),
    auth.uid()
  );

  perform control.note(
    'demo.link.issued',
    p_app_key,
    btrim(p_label),
    jsonb_strip_nulls(jsonb_build_object('days', p_days, 'max_views', p_max_views))
  );

  return new_token;
end;
$fn$;

grant execute on function control.create_demo_link(text, uuid, text, integer, integer, text) to authenticated;

/**
 * Close a link now.
 *
 * Kept, not deleted. The row is the record of what was sent to whom, and the
 * reason somebody wants it closed is usually the reason they will want to look
 * it up again afterwards.
 */
create or replace function control.revoke_demo_link(p_app_key text, p_link_id uuid)
returns void
language plpgsql
security definer
set search_path = control, public
as $fn$
declare
  schema_name text;
  label text;
begin
  if not control.is_owner() then
    raise exception 'Only an estate owner may close a demo link.' using errcode = '42501';
  end if;

  schema_name := control.demo_schema(p_app_key);
  if schema_name is null then
    raise exception 'There is no demo called %.', p_app_key using errcode = 'no_data_found';
  end if;

  execute format(
    $q$
      update %I.share_links
      set revoked_at = now()
      where id = %L and revoked_at is null
      returning label
    $q$,
    schema_name, p_link_id
  ) into label;

  if label is not null then
    perform control.note('demo.link.closed', p_app_key, label);
  end if;
end;
$fn$;

grant execute on function control.revoke_demo_link(text, uuid) to authenticated;

/**
 * Open one business to the world, or close it again.
 *
 * This is the switch that made every link decoration until now, so it is on the
 * estate screen where somebody will see it rather than buried in a variant
 * editor — and every flip is written to the audit log, because "who made the
 * clinic public" is a question that will be asked one day.
 */
create or replace function control.set_demo_visibility(
  p_app_key text,
  p_variant_id uuid,
  p_public boolean
)
returns void
language plpgsql
security definer
set search_path = control, public
as $fn$
declare
  schema_name text;
  slug text;
begin
  if not control.is_owner() then
    raise exception 'Only an estate owner may open a demo to the public.' using errcode = '42501';
  end if;

  schema_name := control.demo_schema(p_app_key);
  if schema_name is null then
    raise exception 'There is no demo called %.', p_app_key using errcode = 'no_data_found';
  end if;

  execute format(
    $q$
      update %I.variants
      set visibility = %L
      where id = %L
      returning slug
    $q$,
    schema_name,
    case when p_public then 'public' else 'link_only' end,
    p_variant_id
  ) into slug;

  if slug is not null then
    perform control.note(
      case when p_public then 'demo.opened_to_public' else 'demo.closed_to_links' end,
      p_app_key,
      slug
    );
  end if;
end;
$fn$;

grant execute on function control.set_demo_visibility(text, uuid, boolean) to authenticated;
