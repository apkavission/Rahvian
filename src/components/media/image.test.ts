import { describe, expect, it } from "vitest";
import { ceiling } from "@/components/media/image";

/**
 * The size ceiling on a stored image.
 *
 * ---------------------------------------------------------------------------
 * **Why this is worth a test of its own.**
 *
 * `FramedImage` carries two rules that look independent and are not. The class
 * list says "never bigger than your frame" (`max-w-full`); the inline style
 * says "never bigger than your own natural size". An inline style beats a
 * class, so for two months the second silently replaced the first, and every
 * framed image was free to overflow its box — hidden by `overflow-hidden`,
 * which is why nobody saw it until a 400×400 portrait rendered at 400×400
 * inside an 80px circle and showed the middle of somebody's face.
 *
 * The bug was invisible to typecheck, lint and every existing test, and it is
 * one CSS keyword wide. So the keyword is what gets pinned.
 */
describe("ceiling", () => {
  const raster = { url: "/media/x/photo.jpg", alt: "", width: 400, height: 400 };

  it("caps at the frame as well as at the natural size", () => {
    const style = ceiling(raster);

    // `min()` of the two is the whole fix. Either bound alone is a bug: the
    // pixel value alone lets a big picture overflow a small box, and `100%`
    // alone lets a small picture be blown up and go soft.
    expect(style?.maxWidth).toBe("min(100%, 400px)");
    expect(style?.maxHeight).toBe("min(100%, 400px)");
  });

  it("never returns a bare pixel value", () => {
    const style = ceiling({ ...raster, width: 1600, height: 900 });

    for (const value of [style?.maxWidth, style?.maxHeight]) {
      expect(
        String(value).includes("100%"),
        `${value} does not bound against the frame, so the image can overflow it.`,
      ).toBe(true);
    }
  });

  it("leaves vectors alone", () => {
    // An SVG's intrinsic size comes from its viewBox and is often a couple of
    // dozen units; capping a logo at 24px would ruin the one format that
    // scales perfectly.
    expect(ceiling({ ...raster, url: "/media/x/logo.svg" })).toBeUndefined();
  });

  it("omits a bound it does not know", () => {
    const style = ceiling({ ...raster, width: null, height: null });

    expect(style?.maxWidth).toBeUndefined();
    expect(style?.maxHeight).toBeUndefined();
  });
});
