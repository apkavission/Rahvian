"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { INVALIDATION_MAP } from "@/lib/cache/tags";
import { getStaffSession } from "@/lib/auth/session";
import { readImageFacts } from "@/lib/media/image-file";
import { darkVariantOptions } from "@/lib/queries/media-admin";
import { mediaPath, mediaSchema, valuesToRow } from "@/lib/records/media";
import { deleteObject, putObject, storageConfigured } from "@/lib/storage/r2";
import { extensionFor, safeFilename } from "@/lib/media/filename";
import { createClient } from "@/lib/supabase/server";
import {
  fieldErrors,
  recordIdSchema,
  saveRecordSchema,
  type RecordActionState,
} from "@/lib/validation/records";

/**
 * Media mutations.
 *
 * Every one clears `INVALIDATION_MAP.media()`, which is the widest
 * invalidation in the registry — the media tag plus site settings, pages,
 * services, projects and the blog. That is not laziness. An asset is
 * referenced from everywhere, the reference is an id rather than a URL, and a
 * replaced or renamed file changes the address every one of those pages
 * renders. Clearing narrowly here would leave a page serving a URL that no
 * longer resolves, and nothing would fail loudly enough to notice.
 *
 * **The upload goes through the server.** Not through a presigned URL handed to
 * the browser: a presigned PUT is a window during which anyone holding the
 * string can write into the bucket, with no size or type check on the far side
 * of it. Here the bytes arrive, are checked against their own header, and are
 * written with a key this code chose.
 */

/** 8MB. Larger than any web image should be, small enough to refuse a video. */
const MAX_BYTES = 8 * 1024 * 1024;

async function guard(): Promise<RecordActionState | null> {
  const session = await getStaffSession();
  if (!session) {
    return { status: "error", message: "Your session has expired. Sign in again." };
  }
  return null;
}

function refresh() {
  for (const tag of INVALIDATION_MAP.media()) updateTag(tag);
  revalidatePath("/admin/media");
}

const uploadSchema = z.object({
  alt_text: z
    .string()
    .trim()
    .min(1, "Describe the image. It cannot be stored without alt text.")
    .max(300, "That description is too long."),
  folder: z
    .string()
    .trim()
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "Lowercase letters, numbers and single hyphens — one word, no slashes.",
    )
    .max(60, "That folder name is too long."),
});

/**
 * Upload a file.
 *
 * Alt text is asked for here rather than afterwards, because the table refuses
 * a row without it and because the only moment anyone reliably knows what an
 * image shows is the moment they choose it. A library that lets files in
 * undescribed is a library that never gets described.
 *
 * The format and the dimensions are read from the file's own header, never from
 * what the browser reported: `File.type` is a guess from the extension, and
 * renaming a text file to `.png` is enough to make it claim to be an image.
 * Those dimensions are what every image field's size check is measured against,
 * so they have to be facts.
 */
export async function uploadMedia(
  _previous: RecordActionState,
  formData: FormData,
): Promise<RecordActionState> {
  const refused = await guard();
  if (refused) return refused;

  if (!storageConfigured()) {
    return {
      status: "error",
      message:
        "File storage is not configured. Set the four R2 variables in .env.local and restart.",
    };
  }

  const parsed = uploadSchema.safeParse({
    alt_text: formData.get("alt_text"),
    folder: formData.get("folder") || "general",
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Check the highlighted fields.",
      fieldErrors: fieldErrors(parsed.error.issues),
    };
  }

  const file = formData.get("file");

  if (!(file instanceof File) || file.size === 0) {
    return {
      status: "error",
      message: "Choose a file to upload.",
      fieldErrors: { file: "No file was chosen." },
    };
  }

  if (file.size > MAX_BYTES) {
    return {
      status: "error",
      message: "That file is too large.",
      fieldErrors: {
        file: `${formatSize(file.size)} — the limit is ${formatSize(MAX_BYTES)}. Export it smaller rather than uploading it as it came off the camera.`,
      },
    };
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const facts = readImageFacts(bytes);

  if (!facts) {
    return {
      status: "error",
      message: "That is not an image this library accepts.",
      fieldErrors: {
        file: "PNG, JPEG, GIF, WebP or SVG. The file's own contents are checked, not its extension.",
      },
    };
  }

  // The id is generated here rather than by the database, because the address
  // the file is served at contains it — and the row cannot be written until
  // that address is known.
  const id = randomUUID();
  const filename = safeFilename(file.name, facts.format);
  const key = `media/${id}.${extensionFor(facts.format)}`;

  try {
    await putObject(key, bytes, facts.mimeType);
  } catch (error) {
    console.error("[media] upload to storage failed:", (error as Error).message);
    return {
      status: "error",
      message: "The file could not be stored. Nothing was saved.",
    };
  }

  const session = await getStaffSession();
  const supabase = await createClient();

  const { error } = await supabase.from("media").insert({
    id,
    r2_key: key,
    public_url: mediaPath(id, filename),
    filename,
    mime_type: facts.mimeType,
    size_bytes: file.size,
    width: facts.width,
    height: facts.height,
    alt_text: parsed.data.alt_text,
    folder: parsed.data.folder,
    uploaded_by: session?.userId ?? null,
  });

  if (error) {
    // The row is what makes the object reachable, so an object without one is
    // unreachable and unfindable. Removing it here keeps the bucket from
    // filling with files nothing points at.
    await deleteObject(key);

    console.error("[media] upload row insert failed:", error.message);
    return { status: "error", message: "The file could not be saved. Nothing was stored." };
  }

  refresh();

  redirect(`/admin/media?asset=${id}&folder=${encodeURIComponent(parsed.data.folder)}`);
}

export async function saveMedia(
  _previous: RecordActionState,
  formData: FormData,
): Promise<RecordActionState> {
  const refused = await guard();
  if (refused) return refused;

  const parsed = saveRecordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { status: "error", message: "That request did not make sense." };
  }

  let raw: unknown;
  try {
    raw = JSON.parse(parsed.data.values);
  } catch {
    return {
      status: "error",
      message: "The editor sent something unreadable. Reload the page and try again.",
    };
  }

  // Rebuilt from the same function the form was built from, so an id that is
  // not another asset — or is this one, which the table's own constraint
  // refuses — cannot be written as a dark counterpart.
  const options = await darkVariantOptions(parsed.data.id);
  const values = mediaSchema(options).safeParse(raw);

  if (!values.success) {
    return {
      status: "error",
      message: "Check the highlighted fields.",
      fieldErrors: fieldErrors(values.error.issues),
    };
  }

  const supabase = await createClient();

  /*
    The stored name is read back before the new one is built.

    A rename may change what a file is called and must never change what it
    claims to be: the extension records what the bytes are, and that was
    established once, when the file arrived. So the extension comes from the
    row rather than from what was typed.
  */
  const { data: existing } = await supabase
    .from("media")
    .select("filename")
    .eq("id", parsed.data.id)
    .maybeSingle();

  if (!existing) {
    return { status: "error", message: "That file no longer exists." };
  }

  const { error } = await supabase
    .from("media")
    .update(
      valuesToRow(parsed.data.id, existing.filename, values.data as Record<string, unknown>),
    )
    .eq("id", parsed.data.id);

  if (error) {
    console.error("[media] save failed:", error.message);
    return { status: "error", message: "Could not save. Nothing was changed." };
  }

  refresh();

  return { status: "success", message: "Everything using it is already showing it." };
}

/**
 * Delete an asset, and the file behind it.
 *
 * Every column that points at `media` is `on delete set null`, so this never
 * fails — it silently blanks an image somewhere instead. That is exactly why
 * the confirmation names what the file is being used as before it asks, and
 * why there is no soft-delete to fall back on: the honest options are keep it
 * or lose it.
 *
 * The row goes first. A row whose file is gone renders a broken image; an
 * object whose row is gone is unreachable and unfindable, so if only one of
 * the two can happen, it should be the one someone can see.
 */
export async function deleteMedia(
  _previous: RecordActionState,
  formData: FormData,
): Promise<RecordActionState> {
  const refused = await guard();
  if (refused) return refused;

  const parsed = recordIdSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { status: "error", message: "That request did not make sense." };
  }

  const supabase = await createClient();

  const { data: asset } = await supabase
    .from("media")
    .select("r2_key")
    .eq("id", parsed.data.id)
    .maybeSingle();

  const { error } = await supabase.from("media").delete().eq("id", parsed.data.id);

  if (error) {
    console.error("[media] delete failed:", error.message);
    return { status: "error", message: "Could not delete it. Nothing was changed." };
  }

  if (asset?.r2_key && !asset.r2_key.startsWith("/")) {
    // Never throws — see the note on `deleteObject`.
    await deleteObject(asset.r2_key);
  }

  refresh();

  return { status: "success", message: "Deleted." };
}

// ---------------------------------------------------------------------------

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
