import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";

/**
 * Cache invalidation endpoint.
 *
 * Every read in this application is cached indefinitely under a tag and is
 * only ever cleared explicitly. That is what allows content to be fully
 * database-driven while pages are still served as static HTML from the edge —
 * but it also means a write that forgets to invalidate serves stale content
 * forever, with nothing failing to draw attention to it.
 *
 * In-process writes call `revalidateTag` directly. This route exists for the
 * writers that are not in this process:
 *
 *   - the seed and content scripts
 *   - the super admin, which edits demo applications running on other
 *     deployments (spec section 4.3)
 *
 * POST /api/revalidate
 *   header: x-revalidate-secret: <REVALIDATE_SECRET>
 *   body:   { "tags": ["page:home", "services"] }
 */

function secretMatches(provided: string | null, expected: string) {
  if (!provided) return false;

  const a = Buffer.from(provided);
  const b = Buffer.from(expected);

  // Compare in constant time. A length check first is unavoidable, and leaks
  // only the length — which is not the secret.
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export async function POST(request: Request) {
  const expected = process.env.REVALIDATE_SECRET;

  // Fail closed. An unset secret must not mean an open endpoint.
  if (!expected) {
    console.error("[revalidate] REVALIDATE_SECRET is not configured");
    return NextResponse.json({ error: "Not configured" }, { status: 500 });
  }

  if (!secretMatches(request.headers.get("x-revalidate-secret"), expected)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let tags: unknown;
  try {
    ({ tags } = await request.json());
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!Array.isArray(tags) || tags.some((tag) => typeof tag !== "string")) {
    return NextResponse.json(
      { error: "Body must be { tags: string[] }" },
      { status: 400 },
    );
  }

  for (const tag of tags as string[]) {
    // Next 16 requires a cache-life profile alongside the tag. "max" matches
    // how these caches are declared — indefinite, cleared only on an explicit
    // invalidation like this one.
    revalidateTag(tag, "max");
  }

  return NextResponse.json({ revalidated: tags, at: Date.now() });
}
