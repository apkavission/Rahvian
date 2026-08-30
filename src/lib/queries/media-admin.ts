import "server-only";

import type { MediaOption } from "@/lib/media/image-fields";
import { buildUsageMap, MEDIA_REFERENCES, type MediaUsage } from "@/lib/media/usage";
import { createClient } from "@/lib/supabase/server";

export type { MediaUsage } from "@/lib/media/usage";
import type { Tables } from "@/types/database";

export type MediaRow = Tables<"media">;

export interface MediaSummaryRow {
  id: string;
  filename: string;
  public_url: string;
  mime_type: string;
  size_bytes: number;
  width: number | null;
  height: number | null;
  alt_text: string;
  folder: string;
  dark_variant_id: string | null;
  created_at: string;
}

const SUMMARY_COLUMNS =
  "id, filename, public_url, mime_type, size_bytes, width, height, alt_text, folder, dark_variant_id, created_at";

/**
 * Every asset, newest first.
 *
 * Newest first rather than alphabetical, because the file someone is looking
 * for immediately after opening this screen is almost always the one they just
 * uploaded.
 *
 * Uncached and read through the session client, like every other admin read.
 * `media_public_read` is `using (true)` — the metadata is not secret, the file
 * behind it is what the serving route guards — so this is the same set an
 * anonymous read would return. It stays a separate query anyway, because the
 * day a private folder exists is the day these two must already be apart.
 */
export async function getAdminMedia(): Promise<MediaSummaryRow[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("media")
    .select(SUMMARY_COLUMNS)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[media] admin list failed:", error.message);
    return [];
  }

  return data ?? [];
}

/**
 * The library, as an image field's picker needs it.
 *
 * One query, shared by every screen that carries an image field, and the array
 * travels down to the form by reference — so a form with three image fields
 * carries the library once rather than three times.
 *
 * `vector` is derived here rather than stored, because it is a fact about the
 * mime type and nothing else: an SVG scales without loss, so no size rule
 * applies to it, and every check downstream needs to know that before it
 * compares anything.
 */
export async function getMediaOptions(): Promise<MediaOption[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("media")
    .select("id, filename, public_url, alt_text, width, height, mime_type")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[media] options read failed:", error.message);
    return [];
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    filename: row.filename,
    url: row.public_url,
    alt: row.alt_text,
    width: row.width,
    height: row.height,
    vector: row.mime_type === "image/svg+xml",
  }));
}

/** One asset, every column. */
export async function getAdminMediaItem(id: string): Promise<MediaRow | null> {
  const supabase = await createClient();

  const { data, error } = await supabase.from("media").select("*").eq("id", id).maybeSingle();

  if (error) {
    console.error(`[media] admin read failed for ${id}:`, error.message);
    return null;
  }

  return data;
}

/**
 * The folders in use, plus the default.
 *
 * Derived from the rows rather than declared in code, because `media.folder` is
 * a free text column with a default and a folder comes into existence by
 * someone typing it. A fixed list here would be a second source of truth that
 * disagreed with the data the first time anyone used a name it did not know.
 */
export async function mediaFolders(): Promise<{ folder: string; count: number }[]> {
  const supabase = await createClient();

  const { data, error } = await supabase.from("media").select("folder");

  if (error) {
    console.error("[media] folder list failed:", error.message);
    return [{ folder: "general", count: 0 }];
  }

  const counts = new Map<string, number>([["general", 0]]);
  for (const row of data ?? []) {
    counts.set(row.folder, (counts.get(row.folder) ?? 0) + 1);
  }

  return [...counts]
    .map(([folder, count]) => ({ folder, count }))
    .sort((a, b) => a.folder.localeCompare(b.folder));
}

/**
 * Assets that may be paired as a dark counterpart, for one asset.
 *
 * Itself excluded, because the table's own check constraint refuses it. Assets
 * already claimed as someone else's dark variant are still offered: one dark
 * file legitimately pairs with several light ones, and the constraint that
 * matters — an asset cannot be its own counterpart — is the only one there is.
 */
export async function darkVariantOptions(
  id: string,
): Promise<{ id: string; label: string }[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("media")
    .select("id, filename, folder")
    .neq("id", id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[media] dark variant options failed:", error.message);
    return [];
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    label: `${row.filename} · ${row.folder}`,
  }));
}

/**
 * Where every asset is used, in one query per referencing column rather than
 * per asset.
 *
 * The whole map at once, because the delete confirmation lives on a list row —
 * the dialog opens without a round trip, so the counts have to be on screen
 * already. Counting per asset would be seventeen queries times however many
 * files are in the library.
 *
 * It exists so that dialog can say "this is the header image on two case
 * studies" rather than "are you sure". Every one of these columns is
 * `on delete set null`, so deleting never fails — it silently blanks an image
 * somewhere, which is exactly the kind of damage a confirmation is for.
 *
 * The list and the counting live in `lib/media/usage.ts`, where a test can
 * reach them. That move found seven references missing from the list.
 */
export async function mediaUsageMap(): Promise<Map<string, MediaUsage>> {
  const supabase = await createClient();

  const results = await Promise.all(
    MEDIA_REFERENCES.map(async (reference) => {
      const { data, error } = await supabase
        // The generated `from()` is overloaded per table, so a variable table
        // name needs this cast. `MEDIA_REFERENCES` is a literal, so nothing
        // unexpected reaches it.
        .from(reference.table as "services")
        .select(reference.column)
        .not(reference.column, "is", null);

      if (error) {
        console.error(
          `[media] usage read failed for ${reference.table}.${reference.column}:`,
          error.message,
        );
        return null;
      }

      const ids = (data ?? [])
        .map((row) => (row as Record<string, unknown>)[reference.column])
        .filter((value): value is string => typeof value === "string");

      return { label: reference.label, ids };
    }),
  );

  return buildUsageMap(results);
}
