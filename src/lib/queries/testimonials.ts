import { unstable_cache } from "next/cache";
import { CACHE_TAGS } from "@/lib/cache/tags";
import { createCachedClient } from "@/lib/supabase/server";

export interface Testimonial {
  id: string;
  quote: string;
  author_name: string;
  author_role: string | null;
  company_name: string | null;
  rating: number | null;
  avatar: { url: string; alt: string; width: number | null; height: number | null } | null;
}

/**
 * Published testimonials, in the admin's order.
 *
 * ---------------------------------------------------------------------------
 * **Why this did not exist until now.**
 *
 * `/admin/testimonials` has managed these records since the catalogue was
 * built, and nothing on the public site could read them: there were nineteen
 * section types and not one of them was testimonials. So the words a client
 * agreed to have quoted were collected, consented to, published — and had
 * nowhere to appear. Reported on 2026-08-31 as *"option bhi nahi hai"*, which
 * is precisely what it was.
 *
 * ---------------------------------------------------------------------------
 * **Published is a stronger word here than elsewhere.**
 *
 * Row-level security limits this to published rows, and the table refuses to
 * publish one at all unless `consent_confirmed` is set — a check constraint,
 * not a habit. So a quote reaching this function has been confirmed by
 * somebody as actually said, and agreed to. That is the reason the constraint
 * is on the table rather than in the form: a testimonial nobody agreed to is a
 * legal problem, and forms are easier to bypass than constraints.
 *
 * Empty is a legitimate answer. The section renders nothing rather than an
 * empty grid under a heading.
 */
export const getTestimonials = unstable_cache(
  async (): Promise<Testimonial[]> => {
    const supabase = createCachedClient();

    const { data, error } = await supabase
      .from("testimonials")
      .select(
        `id, quote, author_name, author_role, company_name, rating,
         avatar:media!testimonials_avatar_id_fkey(public_url, alt_text, width, height)`,
      )
      .order("sort_order", { ascending: true });

    if (error) {
      console.error("[testimonials] read failed:", error.message);
      return [];
    }

    return (data ?? []).map((row) => {
      // PostgREST types an embedded row as an array; it is one row or none.
      const media = Array.isArray(row.avatar) ? row.avatar[0] : row.avatar;

      return {
        id: row.id,
        quote: row.quote,
        author_name: row.author_name,
        author_role: row.author_role,
        company_name: row.company_name,
        rating: row.rating,
        avatar: media?.public_url
          ? {
              url: media.public_url,
              // The person's own photograph is decoration beside their name,
              // which is already written out beneath the quote. An alt that
              // repeats it makes a screen reader say the name twice.
              alt: media.alt_text ?? "",
              width: media.width,
              height: media.height,
            }
          : null,
      };
    });
  },
  ["testimonials"],
  { tags: [CACHE_TAGS.testimonials] },
);
