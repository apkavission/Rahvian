/**
 * Reading a point off a map, the way people actually copy one.
 *
 * Nobody types latitude and longitude into two boxes. They open a map, long-press
 * the spot, and copy what it gives them — `25.594095, 85.137566` — and any form
 * that will not take that has already lost, because the alternative is somebody
 * splitting it by hand at the comma and pasting the halves into two fields.
 *
 * So there is one box, and this reads what lands in it.
 *
 * **Why this is typed in rather than looked up from the address.** Turning an
 * address into a point means sending an employee's home address to a geocoding
 * service, which this estate does not do. It is also the less accurate answer: a
 * geocoder returns the middle of a street, and the point that matters is the
 * building. Standing at the place and pressing "use my location" beats both.
 */

export interface Point {
  latitude: number;
  longitude: number;
}

export type CoordinateResult =
  | { ok: true; point: Point | null }
  | { ok: false; message: string };

/**
 * Read a pasted pair.
 *
 * Empty is a valid answer meaning "no point set", and it is reported as success
 * with nothing rather than as an error — clearing the field is how somebody
 * removes a fence, and refusing that would leave no way to undo one.
 *
 * Accepts a comma or whitespace between the two, which covers every form these
 * arrive in. Anything else is refused with a sentence showing what was expected;
 * silently taking the first number it can find is how a fence ends up in the
 * Gulf of Guinea.
 */
export function parseCoordinates(input: string | null | undefined): CoordinateResult {
  const text = (input ?? "").trim();

  if (!text) return { ok: true, point: null };

  const parts = text
    .replace(/[()]/g, "")
    .split(/[,\s]+/)
    .filter(Boolean);

  if (parts.length !== 2) {
    return {
      ok: false,
      message: "Paste both numbers, like 25.594095, 85.137566.",
    };
  }

  const latitude = Number(parts[0]);
  const longitude = Number(parts[1]);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return { ok: false, message: "That does not read as a pair of coordinates." };
  }

  if (Math.abs(latitude) > 90) {
    /*
      Almost always the pair the wrong way round.

      Longitude runs to 180 and latitude only to 90, so anything past 90 in the
      first position is a longitude that has been pasted first. Saying that is
      far more useful than "out of range", because it names the fix.
    */
    return {
      ok: false,
      message:
        "The first number has to be the latitude, which never goes past 90. These look the wrong way round.",
    };
  }

  if (Math.abs(longitude) > 180) {
    return { ok: false, message: "The second number is not a longitude." };
  }

  return { ok: true, point: { latitude, longitude } };
}

/** A point back in the form people paste. Six decimals is about ten centimetres. */
export function formatCoordinates(
  latitude: number | null | undefined,
  longitude: number | null | undefined,
): string {
  if (latitude == null || longitude == null) return "";
  return `${Number(latitude).toFixed(6)}, ${Number(longitude).toFixed(6)}`;
}
