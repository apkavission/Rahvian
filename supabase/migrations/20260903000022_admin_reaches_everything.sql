-- ===========================================================================
-- Admin reaches the two screens it was quietly missing.
--
-- ---------------------------------------------------------------------------
-- How they went missing, which is worth writing down because nobody did
-- anything wrong.
--
-- `20260903000019_one_admin_role.sql` merged Owner into Admin and copied the
-- menu across faithfully — including the two screens that were never in it.
-- Owner had fifteen; the panel has seventeen. So this is not a regression from
-- that migration, it is a gap that migration inherited and made visible.
--
-- Found on 2026-09-01 by the owner reporting that testimonials had *"koi
-- option nahi"*. The screen was built, the records were being managed, the
-- route existed and `requireMenu("testimonials")` answered 404 to the only
-- account in the business — because a menu is a permission here, and nobody
-- had granted it. The sidebar had no Testimonials entry, which is exactly what
-- "there is no option" looks like from the outside.
--
-- ---------------------------------------------------------------------------
-- **testimonials** — a content screen, and the business's own words about
-- itself. `editor` and `super_admin` both had it; the role the business
-- actually signs in as did not.
--
-- **estate** — every application in the estate on one screen. The owner asked
-- for the company panel to reach the others:
--
--   > service ke panel me jo hai baki saare panel ka bhi access de dena
--
-- The screens behind it check `control.is_owner()` in the database for
-- themselves, and Admin carries that flag since the merge, so this grants a
-- menu entry to somebody the database already trusts rather than granting
-- authority from a menu.
--
-- Written as an idempotent array append, so re-running it changes nothing and
-- an owner who has deliberately removed one of these does not have it forced
-- back on the next run of the file.
-- ===========================================================================

update company.roles
set default_menu = default_menu || array['testimonials']
where key = 'admin'
  and not (default_menu @> array['testimonials']);

update company.roles
set default_menu = default_menu || array['estate']
where key = 'admin'
  and not (default_menu @> array['estate']);

do $say$
declare
  missing text[];
begin
  select array_agg(screen order by screen) into missing
  from (
    select unnest(default_menu) as screen from company.roles where key = 'super_admin'
    except
    select unnest(default_menu) from company.roles where key = 'admin'
  ) gap;

  if missing is null then
    raise notice 'Admin now reaches every screen super_admin does.';
  else
    raise notice 'Admin still cannot reach: %', array_to_string(missing, ', ');
  end if;
end
$say$;
