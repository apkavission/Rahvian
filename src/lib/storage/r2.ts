import "server-only";

import {
  DeleteObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getServerEnv } from "@/lib/env";

/**
 * Cloudflare R2, over the S3 API.
 *
 * Every call here runs on the server and nowhere else. The access key is a
 * server secret, and the decision recorded on 2026-08-27 was deliberate and is
 * worth restating, because it is the opposite of what most tutorials do:
 *
 *   **The bucket is private and stays private.** There is no r2.dev domain and
 *   no custom domain in front of it. Nothing in it is reachable from the
 *   internet directly.
 *
 *   **Files are read back through this application**, by the route at
 *   `/media/[...]`, which looks the row up and decides whether the person
 *   asking may have it before handing anything over.
 *
 *   **Files are uploaded through this application too.** Not by a presigned URL
 *   handed to the browser: a presigned PUT is a window during which anyone
 *   holding that string can write into the bucket, and there is no size or
 *   type check on the far side of it. The upload arrives at a Server Action,
 *   is checked, and is written from here.
 *
 * The cost is one hop through the app instead of straight off a CDN. The
 * benefit is that an asset uploaded for a client's private project is not a
 * public URL the moment it exists — which, for a company that will host client
 * work in the same bucket, is the correct trade.
 */

let client: S3Client | null = null;

/**
 * Whether R2 is configured at all.
 *
 * The four variables are optional in `env.ts` so the project builds without
 * them. Everything that needs storage checks this first and says so plainly,
 * rather than failing at the SDK with a message about a missing region.
 */
export function storageConfigured(): boolean {
  const env = getServerEnv();
  return Boolean(
    env.R2_ACCOUNT_ID &&
      env.R2_ACCESS_KEY_ID &&
      env.R2_SECRET_ACCESS_KEY &&
      env.R2_BUCKET_NAME,
  );
}

function bucket(): string {
  const name = getServerEnv().R2_BUCKET_NAME;
  if (!name) throw new Error("R2 is not configured: R2_BUCKET_NAME is missing.");
  return name;
}

/**
 * The client, built once.
 *
 * `region: "auto"` is what R2 expects — it has no regions in the S3 sense, and
 * the SDK refuses to sign a request without something in that field.
 */
function s3(): S3Client {
  if (client) return client;

  const env = getServerEnv();
  if (!storageConfigured()) {
    throw new Error(
      "R2 is not configured. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, " +
        "R2_SECRET_ACCESS_KEY and R2_BUCKET_NAME in .env.local.",
    );
  }

  client = new S3Client({
    region: "auto",
    endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: env.R2_ACCESS_KEY_ID as string,
      secretAccessKey: env.R2_SECRET_ACCESS_KEY as string,
    },
  });

  return client;
}

/** Write an object. Overwrites silently, as S3 does — keys are never reused. */
export async function putObject(
  key: string,
  body: Uint8Array,
  contentType: string,
): Promise<void> {
  await s3().send(
    new PutObjectCommand({
      Bucket: bucket(),
      Key: key,
      Body: body,
      ContentType: contentType,
      // A year, immutable. Safe because a key is never reused: replacing an
      // image uploads a new object under a new key and repoints the row.
      CacheControl: "public, max-age=31536000, immutable",
    }),
  );
}

export interface StoredObject {
  body: ReadableStream<Uint8Array>;
  contentType: string | undefined;
  contentLength: number | undefined;
  etag: string | undefined;
}

/**
 * Read an object back, as a stream.
 *
 * Streamed rather than buffered: the route that serves these hands the stream
 * straight to the response, so a 4MB image never sits in the server's memory
 * in one piece on its way to a browser.
 */
export async function getObject(key: string): Promise<StoredObject | null> {
  try {
    const result = await s3().send(
      new GetObjectCommand({ Bucket: bucket(), Key: key }),
    );

    if (!result.Body) return null;

    return {
      body: result.Body.transformToWebStream(),
      contentType: result.ContentType,
      contentLength: result.ContentLength,
      etag: result.ETag,
    };
  } catch (error) {
    // A missing object is a 404 on the way out, not a server error. Anything
    // else is worth a log line, because it means the bucket, the credentials
    // or the network is wrong rather than the key.
    const name = (error as { name?: string }).name;
    if (name === "NoSuchKey" || name === "NotFound") return null;

    console.error(`[r2] read failed for ${key}:`, (error as Error).message);
    throw error;
  }
}

/**
 * Delete an object.
 *
 * Never throws. A row whose file is already gone should still be deletable —
 * refusing to remove the row because the file it points at has vanished leaves
 * the library holding an entry nobody can get rid of.
 */
export async function deleteObject(key: string): Promise<void> {
  try {
    await s3().send(new DeleteObjectCommand({ Bucket: bucket(), Key: key }));
  } catch (error) {
    console.error(`[r2] delete failed for ${key}:`, (error as Error).message);
  }
}

/**
 * Every object under a prefix.
 *
 * Added for the nightly backup, which is the only thing in this estate that
 * needs to see what is already in the bucket — a media file is always reached
 * by the key stored on its row, never by looking around.
 *
 * Paged, because a listing returns at most a thousand keys and a bucket that
 * has been running for a while has more than that. A backup pruner that
 * silently stopped at the first page would leave everything past it forever,
 * which is the failure this exists to prevent.
 */
export async function listObjects(
  prefix: string,
): Promise<{ key: string; size: number; modified: Date | undefined }[]> {
  const found: { key: string; size: number; modified: Date | undefined }[] = [];
  let token: string | undefined;

  do {
    const page = await s3().send(
      new ListObjectsV2Command({
        Bucket: bucket(),
        Prefix: prefix,
        ContinuationToken: token,
      }),
    );

    for (const object of page.Contents ?? []) {
      if (object.Key) {
        found.push({
          key: object.Key,
          size: object.Size ?? 0,
          modified: object.LastModified,
        });
      }
    }

    token = page.IsTruncated ? page.NextContinuationToken : undefined;
  } while (token);

  return found;
}
