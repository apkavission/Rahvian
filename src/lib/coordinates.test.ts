import { describe, expect, it } from "vitest";
import { formatCoordinates, parseCoordinates } from "./coordinates";

/**
 * These decide where an employee's clock-in fence sits. A pair read wrongly puts
 * somebody's office in the sea, and the first they hear of it is being refused
 * at nine in the morning — so every shape a pasted coordinate arrives in has a
 * test, and so does every way of getting it wrong.
 */

describe("parseCoordinates", () => {
  it("reads the form a map gives you", () => {
    expect(parseCoordinates("25.594095, 85.137566")).toEqual({
      ok: true,
      point: { latitude: 25.594095, longitude: 85.137566 },
    });
  });

  it("takes a space instead of a comma", () => {
    expect(parseCoordinates("25.594095 85.137566")).toEqual({
      ok: true,
      point: { latitude: 25.594095, longitude: 85.137566 },
    });
  });

  it("takes the brackets some apps add", () => {
    expect(parseCoordinates("(25.594095, 85.137566)")).toEqual({
      ok: true,
      point: { latitude: 25.594095, longitude: 85.137566 },
    });
  });

  it("takes negatives, because half the world has them", () => {
    expect(parseCoordinates("-33.8688, 151.2093")).toEqual({
      ok: true,
      point: { latitude: -33.8688, longitude: 151.2093 },
    });
  });

  it("treats empty as no point rather than as a mistake", () => {
    expect(parseCoordinates("")).toEqual({ ok: true, point: null });
    expect(parseCoordinates("   ")).toEqual({ ok: true, point: null });
    expect(parseCoordinates(null)).toEqual({ ok: true, point: null });
  });

  it("refuses one number instead of guessing the other", () => {
    const result = parseCoordinates("25.594095");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toContain("both numbers");
  });

  it("refuses words", () => {
    expect(parseCoordinates("near the office").ok).toBe(false);
  });

  it("names the swap rather than saying out of range", () => {
    // Sydney, pasted backwards. 151 is not a latitude, so this one is catchable.
    const result = parseCoordinates("151.2093, -33.8688");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toContain("wrong way round");
  });

  it("cannot catch a swap where both numbers are valid latitudes, and does not pretend to", () => {
    /*
      Patna, pasted backwards: 85.13 is a real latitude (in the Arctic Ocean) and
      25.59 is a real longitude. Nothing in the numbers says which order they
      were meant in.

      Accepted deliberately rather than guessed at. The check that catches this
      is a human one — the admin setting it can press "use my current location"
      while standing at the place — and a parser that silently reordered pairs it
      thought looked wrong would be worse: it would sometimes move a point that
      was right.
    */
    expect(parseCoordinates("85.137566, 25.594095")).toEqual({
      ok: true,
      point: { latitude: 85.137566, longitude: 25.594095 },
    });
  });

  it("refuses an impossible longitude", () => {
    expect(parseCoordinates("25.5, 200").ok).toBe(false);
  });
});

describe("formatCoordinates", () => {
  it("gives back the form people paste", () => {
    expect(formatCoordinates(25.594095, 85.137566)).toBe("25.594095, 85.137566");
  });

  it("is empty when there is no point", () => {
    expect(formatCoordinates(null, null)).toBe("");
    expect(formatCoordinates(25.5, null)).toBe("");
  });
});
