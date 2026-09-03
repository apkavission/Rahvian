/**
 * Randomness you can go back to.
 *
 * ---------------------------------------------------------------------------
 * **Why not `Math.random()`.**
 *
 * The studio has to do three things that plain randomness cannot: show five
 * designs, let somebody keep one, and then produce more *like that one*. All
 * three need a design to have a name — something you can write down, hand back,
 * and get the identical drawing from.
 *
 * A seed is that name. Every choice in a logo comes from this generator, so a
 * seed is the design: the same number always draws the same mark, in the same
 * colour, at the same size. "Keep this one" stores a number. "More like this"
 * starts from that number and moves a little way from it.
 *
 * ---------------------------------------------------------------------------
 * **mulberry32**, because it is nine lines and good enough.
 *
 * A cryptographic generator would be slower and no better here — nothing is
 * being protected. What matters is that it is *deterministic*, has no visible
 * pattern across the small number of draws one design makes, and needs no
 * dependency.
 */

export interface Rng {
  /** The seed this was built from. Written into the design so it can return. */
  readonly seed: number;
  /** A number in [0, 1). */
  next(): number;
  /** A whole number in [min, max], both ends included. */
  int(min: number, max: number): number;
  /** A number in [min, max). */
  float(min: number, max: number): number;
  /** One of these, uniformly. */
  pick<T>(items: readonly T[]): T;
  /** One of these, by weight — `[thing, weight]` pairs. */
  weighted<T>(items: readonly (readonly [T, number])[]): T;
  /** True with this probability. */
  chance(probability: number): boolean;
}

export function rng(seed: number): Rng {
  /* Kept whole and positive: mulberry32 is defined over a 32-bit integer, and a
     fractional seed silently collapses several "different" designs into one. */
  let state = Math.abs(Math.trunc(seed)) || 1;

  const next = () => {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;

    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;

    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  const api: Rng = {
    seed,
    next,
    int: (min, max) => Math.floor(next() * (max - min + 1)) + min,
    float: (min, max) => next() * (max - min) + min,
    pick: (items) => items[Math.floor(next() * items.length)],

    weighted: (items) => {
      const total = items.reduce((sum, [, weight]) => sum + weight, 0);
      let at = next() * total;

      for (const [item, weight] of items) {
        at -= weight;
        if (at <= 0) return item;
      }

      /* Floating-point arithmetic can leave `at` a hair above zero after the
         last subtraction. The last item is the right answer, not an error. */
      return items[items.length - 1][0];
    },

    chance: (probability) => next() < probability,
  };

  return api;
}

/** A fresh seed, for the button that says "show me different ones". */
export function newSeed(): number {
  return Math.floor(Math.random() * 2_147_483_647) + 1;
}

/**
 * A seed near another one.
 *
 * ---------------------------------------------------------------------------
 * **This is what "more like this, but better" actually is.**
 *
 * A neighbouring *seed* is not a neighbouring *design* — the whole point of a
 * hash is that one bit in gives an unrecognisably different result out. So
 * nearness cannot live here; it lives in the generator, which is told which
 * decisions to keep and which to re-roll.
 *
 * What this provides is a fresh number to re-roll the free decisions with,
 * derived from the parent so the same parent and the same step always give the
 * same child. Somebody who liked variation three and comes back tomorrow finds
 * variation three.
 */
export function nearbySeed(parent: number, step: number): number {
  const generator = rng(parent + step * 7919);
  return Math.floor(generator.next() * 2_147_483_647) + 1;
}
