-- ===========================================================================
-- Where somebody works, so the tracker can check they are there.
--
-- The owner's instruction, 2026-08-30:
--
--   > jo clock in aur clock out hai wo radius ke hisaab se hoga. Employee ne jo
--   > address diya hai wo maine services me daala tha — tracker me login karke
--   > clock in karta hai to radius check hoga ki usi address ke aas-paas ya usi
--   > address pe hona chahiye. Ye free wala hona chahiye aur proper current
--   > location fetch kare.
--
-- ---------------------------------------------------------------------------
-- Why it lives here.
--
-- Employees are created in this admin panel — that is already the owner's rule
-- for roles, and the address is the same kind of fact about a person: it belongs
-- with the employee record, not with whatever application happens to read it.
-- The tracker reads it through a view, the same thin one-way window that
-- `portal.roles_master` uses for roles.
--
-- ---------------------------------------------------------------------------
-- What is stored, and what is deliberately not.
--
-- **Coordinates, not a geocoded address.** The address is written down for
-- people to read; the fence is a point and a radius. Turning an address into a
-- point automatically means sending every employee's home address to somebody
-- else's geocoding service, and the owner's standing rule is that this estate
-- keeps its data to itself. So the point is set by hand — stand at the place and
-- press the button, or paste the coordinates from a map — which is also more
-- accurate than a geocoder, because a geocoder returns the middle of a street.
--
-- **No location history here.** Where somebody was at 3pm is not recorded
-- anywhere. The tracker keeps one distance per clock-in, in its own schema,
-- and that is the whole of it.
--
-- ---------------------------------------------------------------------------
-- The honest limitation, written down so nobody is surprised by it later.
--
-- A browser's location can be faked — developer tools will do it in a few
-- clicks, and there are phone apps for it. **This is a check, not proof.** It
-- stops the ordinary case (clocking in from bed) and it does not stop somebody
-- determined. Anything that would be proof needs hardware nobody here has.
-- ===========================================================================

alter table company.profiles
  add column if not exists address              text,
  add column if not exists work_latitude        numeric(9,6),
  add column if not exists work_longitude       numeric(9,6),
  add column if not exists work_radius_metres   integer not null default 200;

comment on column company.profiles.address is
  'Where this person works from, in words. For people to read. The fence is the coordinates below.';
comment on column company.profiles.work_latitude is
  'The point clock-in is measured from. Set by standing there, or from a map — never geocoded elsewhere.';
comment on column company.profiles.work_radius_metres is
  'How far from that point counts as being there. Consumer GPS is good to roughly 10-30 metres in the open and much worse indoors, so a small radius refuses honest people.';

-- Latitude and longitude have real ranges, and a transposed pair is the
-- commonest mistake when coordinates are pasted. 22.5 and 88.3 are both valid
-- latitudes, so this cannot catch every swap — but it catches every longitude
-- pasted into the latitude box for anywhere past 90 degrees.
alter table company.profiles drop constraint if exists profiles_latitude_is_a_latitude;
alter table company.profiles
  add constraint profiles_latitude_is_a_latitude
  check (work_latitude is null or work_latitude between -90 and 90);

alter table company.profiles drop constraint if exists profiles_longitude_is_a_longitude;
alter table company.profiles
  add constraint profiles_longitude_is_a_longitude
  check (work_longitude is null or work_longitude between -180 and 180);

-- Half a point is not a point. One coordinate without the other would silently
-- become a fence around the equator.
alter table company.profiles drop constraint if exists profiles_point_is_whole;
alter table company.profiles
  add constraint profiles_point_is_whole
  check ((work_latitude is null) = (work_longitude is null));

/*
  The radius has a floor and a ceiling, and both are there for a reason.

  **Twenty-five metres at the bottom.** A phone that says it is at the door is
  routinely thirty metres out; a tighter fence than this rejects people who are
  standing exactly where they should be, and the first thing that happens then is
  that somebody turns the whole feature off.

  **Fifty kilometres at the top**, which is not a real fence and is not meant to
  be — it is the value for "this person moves around", set deliberately rather
  than by leaving the column null and having the check quietly not apply.
*/
alter table company.profiles drop constraint if exists profiles_radius_is_sane;
alter table company.profiles
  add constraint profiles_radius_is_sane
  check (work_radius_metres between 25 and 50000);
