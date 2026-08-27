import { getBrandLogos } from "@/lib/queries/brand";
import { cn } from "@/lib/utils";

interface Props {
  /** Rendered height in pixels. Width follows from the file's aspect ratio. */
  height?: number;
  className?: string;
  /**
   * The logo is almost always inside a link that already names the company, so
   * it defaults to decorative. Set this only where the mark stands alone.
   */
  decorative?: boolean;
}

/**
 * The company mark, correct in both themes.
 *
 * Both files are emitted and CSS hides one (see `.theme-light-only` in
 * `globals.css`). Choosing in JavaScript instead would mean either a flash of
 * the wrong mark or a logo that never appears without hydration.
 *
 * Rendered with a plain `<img>` rather than `next/image`: the source is an SVG
 * of known intrinsic size served from our own origin, so there is nothing for
 * the optimiser to resize, re-encode or lazily defer — and the header logo is
 * the one image on the page that must never be deferred.
 *
 * Returns `null` when no logo is configured. Callers pair it with the company
 * name, so the header still reads correctly on a fresh database.
 */
export async function BrandLogo({ height = 32, className, decorative = true }: Props) {
  const { light, dark } = await getBrandLogos();

  if (!light && !dark) return null;

  return (
    <>
      {light && <Mark mark={light} theme="light" height={height} className={className} decorative={decorative} />}
      {dark && <Mark mark={dark} theme="dark" height={height} className={className} decorative={decorative} />}
    </>
  );
}

function Mark({
  mark,
  theme,
  height,
  className,
  decorative,
}: {
  mark: NonNullable<Awaited<ReturnType<typeof getBrandLogos>>["light"]>;
  theme: "light" | "dark";
  height: number;
  className?: string;
  decorative: boolean;
}) {
  // Width comes from the stored intrinsic size so the box is reserved before
  // the SVG arrives. Without it the header reflows on first paint.
  const width =
    mark.width && mark.height ? Math.round((mark.width / mark.height) * height) : undefined;

  return (
    // eslint-disable-next-line @next/next/no-img-element -- see component note
    <img
      src={mark.url}
      alt={decorative ? "" : mark.alt}
      aria-hidden={decorative || undefined}
      width={width}
      height={height}
      style={{ height, width: width ?? "auto" }}
      className={cn(theme === "light" ? "theme-light-only" : "theme-dark-only", className)}
    />
  );
}
