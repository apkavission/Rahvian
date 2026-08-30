import "server-only";

import { BACKUP_PREFIX, expiredKeys } from "@/lib/backup/retention";
import { deleteObject, listObjects } from "@/lib/storage/r2";

export { BACKUP_PREFIX };

/**
 * Delete backups past the retention window.
 *
 * The rule itself is `expiredKeys`, which is pure and tested. This is the half
 * that touches the bucket, and it is deliberately thin: everything that could
 * be got wrong about *which* keys go is decided next door, where a test can
 * reach it.
 */
export async function pruneBackups(now: Date, retentionDays: number): Promise<number> {
  const listed = await listObjects(BACKUP_PREFIX);
  const expired = expiredKeys(
    listed.map((object) => object.key),
    now,
    retentionDays,
  );

  for (const key of expired) {
    await deleteObject(key);
  }

  return expired.length;
}
