import { describe, expect, it } from "vitest";
import { expiredKeys } from "@/lib/backup/retention";

/**
 * Which backups get deleted.
 *
 * The one piece of the backup system whose failure mode is **deleting
 * something that should have been kept**, which makes it the piece most worth
 * testing and the one that cannot be tested against a real bucket without
 * risking the thing it protects.
 *
 * The rule reads the date out of the object's own name rather than trusting its
 * `LastModified`, and that is the behaviour these pin: a re-uploaded object
 * gets a fresh timestamp, and a pruner that believed it would restart the
 * thirty days — which is how a retention window quietly becomes "forever".
 */

const NOW = new Date("2026-08-28T03:00:00Z");
const RETENTION = 30;

const key = (date: string) => `backups/${date}.json.gz`;

describe("expiredKeys", () => {
  it("keeps today's", () => {
    expect(expiredKeys([key("2026-08-28")], NOW, RETENTION)).toEqual([]);
  });

  it("keeps one exactly at the edge of the window", () => {
    // Thirty days before 2026-08-28 is 2026-07-29. It is not *past* thirty
    // days, so it stays. Off-by-one here costs a backup.
    expect(expiredKeys([key("2026-07-29")], NOW, RETENTION)).toEqual([]);
  });

  it("drops the one a day older than that", () => {
    expect(expiredKeys([key("2026-07-28")], NOW, RETENTION)).toEqual([
      key("2026-07-28"),
    ]);
  });

  it("drops everything well past the window and keeps everything inside it", () => {
    const keys = [
      key("2026-08-28"),
      key("2026-08-01"),
      key("2026-07-29"),
      key("2026-07-01"),
      key("2025-12-25"),
    ];

    expect(expiredKeys(keys, NOW, RETENTION)).toEqual([
      key("2026-07-01"),
      key("2025-12-25"),
    ]);
  });

  it("leaves alone anything whose name it does not recognise", () => {
    /*
      The important one.

      Only the backup job writes under this prefix, so a key in an unexpected
      shape means somebody put it there deliberately. Deleting it because the
      pruner could not parse the name would be the worst possible reading of
      "prune", and it is the kind of thing that is only noticed afterwards.
    */
    const strangers = [
      "backups/manual-before-migration.json.gz",
      "backups/README.txt",
      "backups/2026-07-01-copy.json.gz",
      "backups/",
    ];

    expect(expiredKeys(strangers, NOW, RETENTION)).toEqual([]);
  });

  it("does not touch anything outside the backups prefix", () => {
    // The listing is already filtered by prefix, so this is a second lock on
    // the same door — the one that matters, since everything else in the
    // bucket is the media library.
    expect(
      expiredKeys(["media/2020-01-01/logo.png", "2020-01-01.json.gz"], NOW, RETENTION),
    ).toEqual([]);
  });

  it("honours a different retention window", () => {
    const keys = [key("2026-08-20"), key("2026-08-27")];

    expect(expiredKeys(keys, NOW, 7)).toEqual([key("2026-08-20")]);
    expect(expiredKeys(keys, NOW, 30)).toEqual([]);
  });
});
