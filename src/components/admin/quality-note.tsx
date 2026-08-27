import { CircleCheck, Info, TriangleAlert } from "lucide-react";
import type { Quality } from "@/lib/media/image-fields";
import { cn } from "@/lib/utils";

/**
 * A file's quality verdict, said the same way everywhere.
 *
 * The owner's rule is that a picture must never reach the site looking broken,
 * blurry or low quality — and that the panel has to say so, in every place a
 * file can be chosen. This is that sentence, in one component, so the upload
 * form, the picker and the library cannot end up wording it three ways or
 * showing it in two of the three.
 *
 * It is a warning, never a block. The site already refuses to enlarge anything
 * (`components/media/image.tsx`), so a small file cannot come out blurry — it
 * comes out small. Which of those two is acceptable is a judgement about the
 * particular picture, and that judgement is the owner's.
 */
export function QualityNote({
  quality,
  compact,
  className,
}: {
  quality: Quality;
  /** One line only — for a list row or a form field. */
  compact?: boolean;
  className?: string;
}) {
  const Icon =
    quality.level === "poor" ? TriangleAlert : quality.level === "note" ? Info : CircleCheck;

  return (
    <div
      className={cn(
        "flex items-start gap-2 rounded-lg border p-2.5 text-xs leading-relaxed",
        quality.level === "poor" && "border-warning/50 bg-warning-soft/40 text-warning",
        quality.level === "note" && "border-border bg-surface-2 text-text-muted",
        quality.level === "good" && "border-border bg-surface-2 text-text-subtle",
        className,
      )}
    >
      <Icon
        className={cn("mt-0.5 size-3.5 shrink-0", quality.level === "good" && "text-success")}
        aria-hidden
      />
      <span className="min-w-0">
        <span className="font-medium">{quality.summary}</span>
        {!compact && <span className="mt-1 block">{quality.detail}</span>}
      </span>
    </div>
  );
}
