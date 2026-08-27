import "server-only";

import { randomInt } from "node:crypto";

/**
 * The alphabet a generated password is drawn from.
 *
 * Missing on purpose: 0 and O, 1 and l and I. This password is going to be
 * read out of an email and typed into a login form, sometimes read aloud down
 * a phone line, and a character set that cannot be transcribed produces a
 * "wrong password" that is nobody's fault and takes an afternoon to find.
 *
 * 31 characters over 20 positions is a little under 100 bits. Losing the
 * ambiguous glyphs costs about four bits against the full alphanumeric set,
 * which is not a trade worth having an argument about.
 */
const ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";

const LENGTH = 20;
const GROUP = 5;

/**
 * A password nobody chose.
 *
 * Generated rather than typed by whoever is creating the account, because an
 * owner who types a colleague's password knows their colleague's password —
 * and because one chosen on the spot is chosen badly. Supabase stores only its
 * hash, so from the moment this is emailed there is no way to read it back.
 * That is the property being bought, and it is worth the inconvenience.
 *
 * `randomInt` rather than `Math.random()` or a modulo of a random byte: the
 * first is not a cryptographic source at all, and the second is biased towards
 * the start of the alphabet unless the range divides 256 evenly, which 31 does
 * not.
 *
 * Grouped with hyphens — `abcde-fghjk-…` — because a twenty-character run is
 * transcribed wrongly and a grouped one is not. The hyphens are part of the
 * password; they are not decoration to be stripped before typing.
 */
export function generatePassword(): string {
  let out = "";

  for (let i = 0; i < LENGTH; i += 1) {
    if (i > 0 && i % GROUP === 0) out += "-";
    out += ALPHABET[randomInt(ALPHABET.length)];
  }

  return out;
}
