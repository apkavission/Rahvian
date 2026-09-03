import { Quote, Star } from "lucide-react";
import { FramedImage } from "@/components/media/image";
import type { Testimonial } from "@/lib/queries/testimonials";
import { cn } from "@/lib/utils";

/**
 * One quote, as it appears on the site.
 *
 * In its own file rather than inside the section, for the same reason
 * `MemberCard` is: the admin preview renders this over drafts, and a preview
 * that draws its own version of the card is a preview of something that does
 * not exist. One card, two callers.
 */
export function TestimonialCard({ testimonial }: { testimonial: Testimonial }) {
  return (
    <figure className="surface-raised flex h-full flex-col rounded-2xl border border-border p-6">
      <Quote className="size-5 shrink-0 text-accent" aria-hidden />

      <blockquote className="measure mt-4 flex-1 leading-relaxed text-text-muted">
        {testimonial.quote}
      </blockquote>

      {testimonial.rating !== null && <Rating out={testimonial.rating} />}

      <figcaption className="mt-5 flex items-center gap-3 border-t border-border pt-5">
        {testimonial.avatar && (
          <FramedImage image={testimonial.avatar} className="size-10 shrink-0 rounded-full" />
        )}

        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{testimonial.author_name}</p>
          {(testimonial.author_role || testimonial.company_name) && (
            <p className="truncate text-xs text-text-subtle">
              {[testimonial.author_role, testimonial.company_name].filter(Boolean).join(" · ")}
            </p>
          )}
        </div>
      </figcaption>
    </figure>
  );
}

/**
 * The rating, drawn and also written.
 *
 * Five stars with two of them dimmed is a picture, and a picture is not an
 * answer to a screen reader — so the number is stated in text and the stars
 * are hidden from it, rather than each star announcing itself.
 */
function Rating({ out }: { out: number }) {
  return (
    <p className="mt-4 flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((position) => (
        <Star
          key={position}
          aria-hidden
          className={cn(
            "size-3.5",
            position <= out ? "fill-accent text-accent" : "text-border-strong",
          )}
        />
      ))}
      <span className="sr-only">{out} out of 5</span>
    </p>
  );
}
