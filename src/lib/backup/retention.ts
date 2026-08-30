/** Where backups live in the bucket. One place, so the pruner cannot miss one. */
export const BACKUP_PREFIX = "backups/";

/** The date a backup filed itself under, from its own key. */
const DATED = /^backups\/(\d{4}-\d{2}-\d{2})\./;

/**
 * Which of these keys are past the retention window.
 *
 * Pure, and in its own file rather than beside the code that does the deleting,
 * because the module that talks to R2 is `server-only` and a test cannot import
 * one — the same split this codebase already uses between `records/*` and
 * `actions/*`. It is worth the extra file: this is the one piece of the backup
 * system whose failure mode is **deleting something that should have been
 * kept**, and it cannot be tested against a real bucket without risking the
 * thing it protects.
 *
 * **Keyed on the date in the object's own name, not on its `LastModified`.**
 * A re-uploaded object gets a fresh timestamp and would start its thirty days
 * again — which is how a "30-day retention" quietly becomes "forever", and how
 * a bucket meant to hold thirty small files ends up holding a thousand.
 *
 * A key that does not carry a date is left alone rather than guessed at. Only
 * the backup job writes under this prefix, so an unrecognised name means
 * somebody put it there deliberately, and deleting it because this function
 * could not parse it would be the worst possible reading of "prune".
 */
export function expiredKeys(keys: string[], now: Date, retentionDays: number): string[] {
  /*
    The cutoff is normalised to midnight, and that is not a detail.

    A key carries a date and no time, so it parses to 00:00 UTC. A cutoff built
    from `now` carries the time the job ran — 03:00, say — and a backup dated
    exactly `retentionDays` ago would then compare as *before* it and be
    deleted on the morning of day thirty rather than day thirty-one. One backup
    short, every night, silently.

    Caught by `retention.test.ts` on the day this was written, which is the
    whole argument for having pulled this rule out into a testable function.
  */
  const cutoff = new Date(now);
  cutoff.setUTCDate(cutoff.getUTCDate() - retentionDays);
  cutoff.setUTCHours(0, 0, 0, 0);

  return keys.filter((key) => {
    const match = DATED.exec(key);
    if (!match) return false;
    return new Date(`${match[1]}T00:00:00Z`) < cutoff;
  });
}
