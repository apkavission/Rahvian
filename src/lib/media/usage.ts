/**
 * Where each stored file is used, and how to say it.
 *
 * Pure, and separate from the queries that gather it, because the counting and
 * the wording are what the delete confirmation actually shows — and neither
 * needs a database to be got wrong. The read lives in
 * `queries/media-admin.ts`; this decides what the answer means.
 */

/** What an asset is being used as, so a delete can say what it will blank. */
export interface MediaUsage {
  total: number;
  /** Human phrases, already counted: "2 × a case study's header image". */
  places: string[];
}

/**
 * Every reference to `media` in the schema.
 *
 * Listed by hand rather than read from the catalogue on purpose. A generated
 * list would silently start counting a reference nobody had thought about, and
 * the wording matters as much as the count — the delete dialog has to say what
 * the asset *is* somewhere, not which column holds it.
 *
 * Hand-written means it can fall behind, so `usage.test.ts` checks it against
 * the migrations: every `references company.media(id)` in the schema has to
 * appear here. A column missing from this list is an image the confirmation
 * would not mention, and deleting through that dialog blanks it silently.
 */
export const MEDIA_REFERENCES = [
  // Settings — the four that appear on every page of the site.
  { table: "site_settings", column: "logo_light_id", label: "the light logo" },
  { table: "site_settings", column: "logo_dark_id", label: "the dark logo" },
  { table: "site_settings", column: "favicon_id", label: "the browser tab icon" },
  { table: "site_settings", column: "og_default_id", label: "the site's default social image" },
  { table: "seo_defaults", column: "default_og_image_id", label: "the site-wide social image" },

  // Content.
  { table: "pages", column: "og_image_id", label: "a page's social image" },
  { table: "services", column: "og_image_id", label: "a service's social image" },
  { table: "projects", column: "thumbnail_id", label: "a portfolio thumbnail" },
  { table: "projects", column: "og_image_id", label: "a portfolio social image" },
  { table: "case_studies", column: "og_image_id", label: "a case study's header image" },
  { table: "blog_categories", column: "og_image_id", label: "a blog category's social image" },
  { table: "blog_posts", column: "featured_image_id", label: "a post's featured image" },
  { table: "blog_posts", column: "og_image_id", label: "a post's social image" },
  { table: "team_members", column: "photo_id", label: "a team photo" },
  { table: "technologies", column: "logo_id", label: "a technology's logo" },
  { table: "testimonials", column: "avatar_id", label: "a testimonial's portrait" },

  // And the library referring to itself.
  { table: "media", column: "dark_variant_id", label: "another asset's dark counterpart" },
] as const;

/** One column's answer: the label for it, and every id found in it. */
export interface UsageResult {
  label: string;
  ids: string[];
}

/**
 * The per-asset usage, from one result per column.
 *
 * Two things it has to get right, and both show up in a sentence a person
 * reads before pressing delete.
 *
 * **The count is per column, not per row.** Two case studies using one header
 * image is "2 × a case study's header image" — one phrase with a number, not
 * the same phrase twice. A dialog that repeats itself reads as a bug and gets
 * dismissed unread.
 *
 * **A missing result is skipped, not counted as zero.** A column whose read
 * failed is a column this cannot speak for, and saying "used nowhere" about it
 * would be the one wrong answer that matters: it is the sentence somebody
 * deletes on.
 */
export function buildUsageMap(
  results: (UsageResult | null)[],
): Map<string, MediaUsage> {
  const usage = new Map<string, MediaUsage>();

  for (const result of results) {
    if (!result) continue;

    const counts = new Map<string, number>();
    for (const id of result.ids) counts.set(id, (counts.get(id) ?? 0) + 1);

    for (const [id, count] of counts) {
      const entry = usage.get(id) ?? { total: 0, places: [] };
      entry.total += count;
      entry.places.push(count === 1 ? result.label : `${count} × ${result.label}`);
      usage.set(id, entry);
    }
  }

  return usage;
}
