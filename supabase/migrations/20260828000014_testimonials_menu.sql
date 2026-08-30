-- ---------------------------------------------------------------------------
-- The testimonials screen reaches the menus that already carry content.
--
-- The screen was built on 2026-08-28 to close a gap: `company.testimonials`
-- existed from the first catalogue migration, the public case study page
-- rendered a quote from it, and the case study editor offered a dropdown to
-- pick one — but nothing anywhere inserted a row. The table could only ever be
-- empty, so the dropdown was always empty and the quote block on a case study
-- could never appear.
--
-- Declaring the screen in `ADMIN_NAV` is not enough to make it reachable. A
-- menu is a permission (spec §15.2): `resolveMenu()` starts from the role’s
-- `default_menu`, and a key that is in the code but in nobody’s default menu is
-- a screen that 404s for every account, including the owner’s.
--
-- Added next to ’case-studies’ rather than appended, so the stored array reads
-- in the order the sidebar does. Roles that reach no admin screen at all —
-- client, developer, demo_viewer — are left alone: their empty menu is the
-- point of them, not an omission.
--
-- Written to be safe to run twice, and to leave alone any menu an owner has
-- since edited by hand: a role that already names the key is not touched, and a
-- role whose menu no longer carries ’case-studies’ has been deliberately
-- narrowed and does not silently get a new screen back.
-- ---------------------------------------------------------------------------

-- AFTER RUNNING THIS, CLEAR THE ROLES CACHE.
--
-- The roles list is read through a tagged cache, and this statement changes it
-- from underneath that cache rather than through the admin screen that would
-- have cleared it. Until the `roles` tag is cleared, every account resolves the
-- menu it had before — so the new screen 404s for everyone, including the
-- owner, while the code and this table are both already correct.
--
-- That is not hypothetical: it happened on 2026-08-28 and cost a restart and
-- two wrong guesses before the cache was the thing looked at. Restarting the
-- server is not enough on its own in development, because the cache is on disk.
-- Either save any role from the Users screen, or clear `.next/cache`.
-- ---------------------------------------------------------------------------

update company.roles
set default_menu = (
  select array_agg(key order by ordinality)
  from (
    select key, ordinality
    from unnest(default_menu) with ordinality as menu(key, ordinality)

    union all

    -- Slotted immediately after ’case-studies’ by borrowing its position and
    -- nudging it, which keeps one ordering rule rather than two.
    select 'testimonials', ordinality + 0.5
    from unnest(default_menu) with ordinality as menu(key, ordinality)
    where key = 'case-studies'
  ) as combined
)
where 'case-studies' = any(default_menu)
  and not ('testimonials' = any(default_menu));
