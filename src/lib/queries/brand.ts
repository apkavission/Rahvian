import { unstable_cache } from "next/cache";
import { CACHE_TAGS } from "@/lib/cache/tags";
import { createCachedClient } from "@/lib/supabase/server";

export interface BrandMark {
  url: string;
  alt: string;
  width: number | null;
  height: number | null;
}

export interface BrandLogos {
  light: BrandMark | null;
  dark: BrandMark | null;
}

/**
 * The two theme variants of the logo shown in the app shell.
 *
 * `site_settings.logo_light_id` and `logo_dark_id` point at `media` rows, so
 * swapping the logo is an admin action rather than a deploy. Both are embedded
 * through their foreign keys in one request — the header and footer each need
 * them on every page, and two round trips for one logo is two too many.
 *
 * Shares the site-settings cache tag: the admin changes the logo by saving
 * settings, so one tag clears both.
 */
export const getBrandLogos = unstable_cache(
  async (): Promise<BrandLogos> => {
    const supabase = createCachedClient();

    const { data, error } = await supabase
      .from("site_settings")
      .select(
        `
        light:media!site_settings_logo_light_id_fkey(public_url, alt_text, width, height),
        dark:media!site_settings_logo_dark_id_fkey(public_url, alt_text, width, height)
        `,
      )
      .eq("id", 1)
      .maybeSingle();

    if (error) {
      // A missing logo must degrade to the wordmark, never to a broken header.
      console.error("[brand] logo read failed:", error.message);
      return { light: null, dark: null };
    }

    return { light: toMark(data?.light), dark: toMark(data?.dark) };
  },
  ["brand-logos"],
  { tags: [CACHE_TAGS.siteSettings] },
);

type EmbeddedMedia = {
  public_url: string;
  alt_text: string;
  width: number | null;
  height: number | null;
} | null | undefined;

function toMark(row: EmbeddedMedia): BrandMark | null {
  if (!row) return null;
  return {
    url: row.public_url,
    alt: row.alt_text,
    width: row.width,
    height: row.height,
  };
}
