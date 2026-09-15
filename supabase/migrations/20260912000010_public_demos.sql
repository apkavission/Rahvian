-- ===========================================================================
-- The demos, readable by a visitor.
--
-- ---------------------------------------------------------------------------
-- **Why this exists.** Every demo in this estate opens by invitation: a link is
-- minted on `/admin/estate/demos`, it names who it was for, it expires, and the
-- address alone shows the expired screen. That is the right shape for work
-- built for one named prospect.
--
-- It is the wrong shape for the company's own website. The owner put it
-- plainly: *"ye project ko apne service wale me show karna tabhi to client
-- dekh sakta h to direct kar do"* — somebody reading rahvian.com should be able
-- to click a demo and look at it, without anybody minting anything. A portfolio
-- nobody can open is not a portfolio.
--
-- ---------------------------------------------------------------------------
-- **What it does not do.** This returns the businesses that have deliberately
-- been switched to `public` on the estate screen, and nothing else. A demo left
-- `link_only` — work built for one client, which is most of them — is absent
-- from this function entirely, and the switch that decides is the same one that
-- has always decided, in the same place. This is not "all demos are open
-- again"; it is "the shop window is readable, and the owner chooses what is in
-- it".
--
-- Three columns are deliberately not returned: the variant's id, its share
-- links, and anything about who opened what. A public function has no business
-- carrying any of them, and a caller that cannot see an id cannot ask a
-- follow-up question about a row it should not know exists.
--
-- ---------------------------------------------------------------------------
-- **`security definer`, like every other function in this schema**, because it
-- reads across six demo schemas that `anon` has no rights in. What makes that
-- safe is the filter, not the caller: `is_active` and `visibility = 'public'`
-- are applied inside the function, so there is no argument a caller can pass to
-- widen it.
-- ===========================================================================

create or replace function control.public_demos()
returns table (
  app_key text,
  app_name text,
  base_url text,
  slug text,
  name text,
  business_name text,
  industry_label text,
  tagline text,
  description text
)
language plpgsql
stable
security definer
set search_path = control, public
as $fn$
declare
  app record;
begin
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
          v.slug, v.name, v.business_name, v.industry_label, v.tagline, v.description
        from %I.variants v
        where v.is_active and v.visibility = 'public'
        order by v.sort_order, v.slug
      $q$,
      app.key, app.name, app.base_url, app.db_schema
    );
  end loop;
end;
$fn$;

/*
  Granted to `anon` as well as `authenticated`, which is the whole point: the
  page that calls it is the company's own home page, read by somebody who has
  never signed in to anything.

  **And usage on the schema, which is the half that is easy to forget.** Execute
  on a function is not enough on its own: without `usage` on the schema that
  holds it, PostgREST answers `permission denied for schema control` and the
  grid on the website renders its empty state — which looks exactly like "no
  demo has been opened yet" and is nothing of the kind. That is how this was
  found.

  Usage opens nothing else. It carries no privilege on any table or function by
  itself, and in this schema `anon` is granted exactly one function and no
  tables at all — asked of `information_schema` before the grant was written,
  not assumed. Every other function here also refuses an anonymous caller in its
  own first line.
*/
grant usage on schema control to anon;
grant execute on function control.public_demos() to anon, authenticated;

comment on function control.public_demos() is
  'Demo businesses switched to public on the estate screen, for the company website. No ids, no links, no openings.';
