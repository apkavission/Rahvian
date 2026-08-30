"use client";

import { useRef, useState } from "react";
import { Crosshair, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, FIELD } from "@/components/ui/field";
import { cn } from "@/lib/utils";

/**
 * Where somebody works, and how close counts.
 *
 * Only the task tracker reads this, and only at two moments: when an employee
 * starts their day and when they finish it. Their location is checked against
 * this point and the distance is recorded; nothing else about where they are is
 * ever collected.
 *
 * ---------------------------------------------------------------------------
 * **One box for the pair, because that is how a coordinate travels.** Nobody
 * types a latitude. They open a map, long-press the spot, and copy
 * `25.594095, 85.137566` in one piece — and a form with two number boxes makes
 * them split it by hand at the comma.
 *
 * **The address is not turned into a point automatically.** Doing so means
 * sending an employee's home address to a geocoding service, which this estate
 * does not do — and it is the less accurate answer anyway, because a geocoder
 * returns the middle of a street. The two reliable ways are both here: stand at
 * the place and press the button, or paste it off a map.
 *
 * **The radius is generous by default.** A phone reporting from a doorway is
 * routinely thirty metres out; a tight fence refuses people who are exactly
 * where they should be, and the first thing that happens then is that somebody
 * turns the whole feature off.
 */
export function WorkplaceFields({
  address,
  coordinates,
  radiusMetres,
  error,
}: {
  address: string | null;
  /** Already formatted as "lat, lng", or empty when no point is set. */
  coordinates: string;
  radiusMetres: number;
  error?: string;
}) {
  const box = useRef<HTMLInputElement>(null);
  const [locating, setLocating] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  function useMyLocation() {
    setNote(null);

    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setNote("This browser cannot report a location. Paste the pair from a map instead.");
      return;
    }

    setLocating(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocating(false);

        if (box.current) {
          box.current.value = `${position.coords.latitude.toFixed(6)}, ${position.coords.longitude.toFixed(6)}`;
        }

        /*
          The accuracy is said out loud, because it decides whether this point is
          any good. A fix taken indoors can be four hundred metres out, and a
          fence built on it will refuse the person it was made for.
        */
        setNote(
          `Filled in from where you are now, accurate to about ${Math.round(position.coords.accuracy)} m. ` +
            (position.coords.accuracy > 60
              ? "That is quite loose — if you are not standing at the place, paste it from a map instead."
              : "Save to keep it."),
        );
      },
      () => {
        setLocating(false);
        setNote(
          "Could not read your location. Allow it for this site, or paste the pair from a map.",
        );
      },
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 0 },
    );
  }

  return (
    <fieldset className="border-t border-border pt-6">
      <legend className="text-sm font-medium">Where they work</legend>
      <p className="measure mt-1 text-xs leading-relaxed text-text-subtle">
        Used by the task tracker when this person starts and finishes their day.
        Leave the coordinates empty and their clock-ins are recorded without being
        checked — which is what happens today for everybody.
      </p>

      <div className="mt-5 space-y-5">
        <Field
          label="Address"
          hint="In words, for people to read. It is not turned into a point automatically."
        >
          {(id, describedBy) => (
            <input
              id={id}
              name="address"
              defaultValue={address ?? ""}
              maxLength={300}
              aria-describedby={describedBy}
              className={FIELD}
            />
          )}
        </Field>

        <Field
          label="Coordinates"
          hint="Paste from a map — long-press the spot and copy — or press the button while standing there."
          error={error}
        >
          {(id, describedBy) => (
            <div className="flex flex-wrap items-center gap-2">
              <input
                ref={box}
                id={id}
                name="coordinates"
                defaultValue={coordinates}
                placeholder="25.594095, 85.137566"
                maxLength={120}
                inputMode="decimal"
                aria-describedby={describedBy}
                aria-invalid={error ? true : undefined}
                className={cn(FIELD, "min-w-0 flex-1")}
              />

              <Button
                type="button"
                variant="secondary"
                onClick={useMyLocation}
                disabled={locating}
              >
                <Crosshair className="size-4" aria-hidden />
                {locating ? "Finding" : "Use my location"}
              </Button>
            </div>
          )}
        </Field>

        {note && (
          <p role="status" className="measure flex items-start gap-2 text-xs text-text-muted">
            <MapPin className="mt-0.5 size-3.5 shrink-0" aria-hidden />
            {note}
          </p>
        )}

        <Field
          label="How close counts"
          hint="Metres from that point. 200 suits an office; a few kilometres suits somebody who moves around. Below 25 m honest people get refused."
        >
          {(id, describedBy) => (
            <div className="flex items-center gap-2">
              <input
                id={id}
                name="work_radius_metres"
                type="number"
                min={25}
                max={50000}
                step={25}
                defaultValue={radiusMetres}
                inputMode="numeric"
                aria-describedby={describedBy}
                className={cn(FIELD, "w-32")}
              />
              <span className="text-sm text-text-muted">metres</span>
            </div>
          )}
        </Field>
      </div>
    </fieldset>
  );
}
