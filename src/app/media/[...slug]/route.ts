import { unstable_cache } from "next/cache";
import { CACHE_TAGS } from "@/lib/cache/tags";
import { getObject } from "@/lib/storage/r2";
import { createCachedClient } from "@/lib/supabase/server";

/**
 * Every stored file is served from here.
 *
 * The bucket is private — no r2.dev domain, no custom domain in front of it —
 * so this route is the only way anything in it reaches a browser. It looks the
 * row up, decides whether the request may have the file, and streams it.
 *
 * The address is `/media/<id>/<filename>`. Only the id is used; the filename is
 * carried so the URL says what the file is, which matters to image search and
 * to anyone reading a link. Renaming the file in the library changes the URL
 * cosmetically and the old one keeps working, because the id in front of it is
 * what resolves.
 *
 * **Caching.** A key is never reused: replacing an image uploads a new object
 * under a new key and repoints the row, so a file at a given id is immutable
 * and can be cached for a year by the browser and by any CDN in front of this.
 * The database lookup is cached under the media tag, so a hot asset costs one
 * R2 read and no query.
 *
 * **What this is not, yet.** Every row is public, because everything uploaded
 * so far is company-site imagery that appears on a public page. The moment
 * client work is stored in the same bucket, the check belongs here — one
 * place, before the stream is opened — which is the whole reason files are
 * read back through the application rather than off a CDN.
 */

const lookup = unstable_cache(
  async (id: string) => {
    const supabase = createCachedClient();

    const { data, error } = await supabase
      .from("media")
      .select("r2_key, mime_type, filename")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      console.error(`[media] lookup failed for ${id}:`, error.message);
      return null;
    }

    return data;
  },
  ["media-object"],
  { tags: [CACHE_TAGS.media] },
);

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string[] }> },
) {
  const { slug } = await params;
  const id = slug?.[0];

  // Checked before the query rather than after it: an id that is not a UUID
  // makes Postgres raise a type error rather than return no rows, and a
  // malformed URL should be a 404 rather than a 500.
  if (!id || !UUID.test(id)) {
    return new Response("Not found", { status: 404 });
  }

  const row = await lookup(id);
  if (!row) return new Response("Not found", { status: 404 });

  // A row that points at a file under `public/` — the brand marks do — is
  // served by the static handler, not from the bucket. Reaching here with one
  // means a URL was hand-assembled, and there is nothing in R2 to hand back.
  if (!row.r2_key || row.r2_key.startsWith("/")) {
    return new Response("Not found", { status: 404 });
  }

  let object;
  try {
    object = await getObject(row.r2_key);
  } catch {
    return new Response("Storage unavailable", { status: 502 });
  }

  if (!object) return new Response("Not found", { status: 404 });

  const headers = new Headers({
    "Content-Type": object.contentType ?? row.mime_type,
    "Cache-Control": "public, max-age=31536000, immutable",
    // Images only, and never as a download. Belt and braces against an SVG
    // being served in a way that lets it run script against this origin: the
    // CSP neutralises that, and the disposition keeps the filename honest if
    // someone saves it.
    "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; sandbox",
    "X-Content-Type-Options": "nosniff",
    "Content-Disposition": `inline; filename="${row.filename.replace(/"/g, "")}"`,
  });

  if (object.contentLength !== undefined) {
    headers.set("Content-Length", String(object.contentLength));
  }
  if (object.etag) headers.set("ETag", object.etag);

  return new Response(object.body, { status: 200, headers });
}
