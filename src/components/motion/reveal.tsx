import { cn } from "@/lib/utils";

/**
 * Scroll-driven reveal.
 *
 * A Server Component with no JavaScript at all. The behaviour lives entirely
 * in the `.reveal` class in `globals.css`, which uses `animation-timeline:
 * view()` behind an `@supports` guard.
 *
 * Content is rendered visible. Where the browser supports scroll-driven
 * animation and the visitor has not asked for reduced motion, it animates in
 * as it enters the viewport. Where it does not, the content is simply there.
 *
 * The earlier version of this component used IntersectionObserver and started
 * at `opacity: 0`, which meant the whole page was blank until hydration
 * completed — and stayed blank if a script failed to load. That is not a
 * trade-off worth making for an entrance animation.
 */
export function Reveal({
  children,
  className,
  as: Tag = "div",
}: {
  children: React.ReactNode;
  className?: string;
  as?: "div" | "section" | "li" | "article" | "span";
}) {
  return <Tag className={cn("reveal", className)}>{children}</Tag>;
}

/**
 * Wrapper that staggers its direct children.
 *
 * Apply to the grid or list itself; the children need no marker of their own.
 * Ordering comes from `nth-child` rules, so it works for any number of items —
 * which matters because item counts here are admin-editable.
 */
export function RevealGroup({
  children,
  className,
  as: Tag = "div",
}: {
  children: React.ReactNode;
  className?: string;
  as?: "div" | "ul" | "ol";
}) {
  return <Tag className={cn("reveal-group", className)}>{children}</Tag>;
}
