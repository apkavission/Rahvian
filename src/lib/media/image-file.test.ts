import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { readImageFacts } from "@/lib/media/image-file";

/**
 * The dimension reader, against bytes rather than against a mock.
 *
 * This is the piece everything in `docs/image-rules.md` rests on. Every "this
 * field wants 1200 × 800" check is measured against what this function
 * returns, so a format it reads wrongly is a warning shown to the wrong person
 * — or, worse, a warning not shown at all.
 *
 * The fixtures are assembled here, byte by byte, rather than committed as
 * files. A header written out in code is a header you can read: the offsets
 * being tested are visible in the test, so a failure says which field moved.
 */

// ---------------------------------------------------------------------------
// Fixtures

/** PNG: 8-byte signature, then an IHDR chunk carrying width and height. */
function png(width: number, height: number): Uint8Array {
  const bytes = new Uint8Array(33);
  bytes.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 0);
  // Chunk length (13) and type "IHDR".
  bytes.set([0, 0, 0, 13], 8);
  bytes.set([0x49, 0x48, 0x44, 0x52], 12);
  writeU32BE(bytes, 16, width);
  writeU32BE(bytes, 20, height);
  return bytes;
}

/** GIF: "GIF89a", then the logical screen size, little-endian. */
function gif(width: number, height: number): Uint8Array {
  const bytes = new Uint8Array(16);
  bytes.set([0x47, 0x49, 0x46, 0x38, 0x39, 0x61], 0);
  writeU16LE(bytes, 6, width);
  writeU16LE(bytes, 8, height);
  return bytes;
}

/**
 * JPEG: SOI, an APP0 segment to skip past, then a start-of-frame.
 *
 * The APP0 is the point of the fixture. A JPEG's dimensions are not at a fixed
 * offset — the reader has to walk the segment chain — so a fixture without at
 * least one segment in front of the frame would pass against a parser that
 * simply looked at byte 2.
 */
function jpeg(width: number, height: number, marker = 0xc0): Uint8Array {
  const bytes = new Uint8Array(2 + 18 + 11);
  let at = 0;

  bytes.set([0xff, 0xd8], at);
  at += 2;

  // APP0, length 16, "JFIF\0" and eight bytes of nothing in particular.
  bytes.set([0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00], at);
  at += 18;

  // SOFn: marker, length, precision, height, width.
  bytes.set([0xff, marker, 0x00, 0x11, 0x08], at);
  writeU16BE(bytes, at + 5, height);
  writeU16BE(bytes, at + 7, width);

  return bytes;
}

/** WebP: the RIFF container, with one of the three payload chunk headers. */
function webp(chunk: "VP8 " | "VP8L" | "VP8X", width: number, height: number): Uint8Array {
  const bytes = new Uint8Array(40);
  ascii(bytes, 0, "RIFF");
  ascii(bytes, 8, "WEBP");
  ascii(bytes, 12, chunk);

  if (chunk === "VP8 ") {
    writeU16LE(bytes, 26, width);
    writeU16LE(bytes, 28, height);
  }

  if (chunk === "VP8L") {
    // 14 bits of (width − 1), then 14 of (height − 1).
    const packed = (width - 1) | ((height - 1) << 14);
    bytes[21] = packed & 0xff;
    bytes[22] = (packed >> 8) & 0xff;
    bytes[23] = (packed >> 16) & 0xff;
    bytes[24] = (packed >> 24) & 0xff;
  }

  if (chunk === "VP8X") {
    writeU24LE(bytes, 24, width - 1);
    writeU24LE(bytes, 27, height - 1);
  }

  return bytes;
}

function text(value: string): Uint8Array {
  return new TextEncoder().encode(value);
}

// ---------------------------------------------------------------------------

describe("readImageFacts", () => {
  it("reads a PNG's dimensions from its IHDR chunk", () => {
    expect(readImageFacts(png(1200, 800))).toEqual({
      format: "png",
      mimeType: "image/png",
      width: 1200,
      height: 800,
      vector: false,
    });
  });

  it("does not read a large PNG dimension as a negative number", () => {
    // 40000 fits in 16 bits; this is the case that catches a missing `>>> 0`
    // on the 32-bit read, which would turn a wide image into a negative width.
    const facts = readImageFacts(png(70000, 3));
    expect(facts?.width).toBe(70000);
    expect(facts?.height).toBe(3);
  });

  it("reads a GIF's logical screen size", () => {
    const facts = readImageFacts(gif(640, 480));
    expect(facts?.format).toBe("gif");
    expect(facts?.width).toBe(640);
    expect(facts?.height).toBe(480);
  });

  it("walks past a JPEG's metadata segments to the frame header", () => {
    const facts = readImageFacts(jpeg(1920, 1080));
    expect(facts?.format).toBe("jpeg");
    expect(facts?.width).toBe(1920);
    expect(facts?.height).toBe(1080);
  });

  it("reads a progressive JPEG, whose frame marker differs from a baseline one", () => {
    const facts = readImageFacts(jpeg(800, 600, 0xc2));
    expect(facts?.width).toBe(800);
    expect(facts?.height).toBe(600);
  });

  it("does not mistake a JPEG's Huffman table for a frame header", () => {
    // 0xC4 falls inside the SOFn range and is not one. A reader that accepts
    // the whole range reads four bytes of a Huffman table as a size.
    const facts = readImageFacts(jpeg(320, 240, 0xc4));
    expect(facts).toBeNull();
  });

  it.each([
    ["VP8 ", 1024, 768],
    ["VP8L", 300, 200],
    ["VP8X", 2400, 1600],
  ] as const)("reads a %s WebP", (chunk, width, height) => {
    const facts = readImageFacts(webp(chunk, width, height));
    expect(facts?.format).toBe("webp");
    expect(facts?.width).toBe(width);
    expect(facts?.height).toBe(height);
  });

  it("reads an SVG's width and height attributes", () => {
    const facts = readImageFacts(text('<svg width="120" height="40" xmlns="x"></svg>'));
    expect(facts).toMatchObject({ format: "svg", width: 120, height: 40, vector: true });
  });

  it("falls back to an SVG's viewBox when it declares no width", () => {
    const facts = readImageFacts(text('<svg viewBox="0 0 512 256" xmlns="x"></svg>'));
    expect(facts?.width).toBe(512);
    expect(facts?.height).toBe(256);
  });

  it("accepts an SVG behind an XML declaration and a comment", () => {
    const facts = readImageFacts(
      text('<?xml version="1.0"?>\n<!-- exported -->\n<svg width="64" height="64"></svg>'),
    );
    expect(facts?.format).toBe("svg");
  });

  it("reports an SVG with no declared size as having none", () => {
    const facts = readImageFacts(text("<svg xmlns='x'><path d='M0 0'/></svg>"));
    expect(facts).toMatchObject({ format: "svg", width: null, height: null, vector: true });
  });

  it("marks only SVG as a vector, because only SVG may be scaled up", () => {
    expect(readImageFacts(png(10, 10))?.vector).toBe(false);
    expect(readImageFacts(text("<svg width='1' height='1'/>"))?.vector).toBe(true);
  });

  it("refuses a text file, whatever it has been renamed to", () => {
    expect(readImageFacts(text("this is not an image, it is a sentence"))).toBeNull();
  });

  it("refuses a truncated PNG", () => {
    expect(readImageFacts(png(100, 100).subarray(0, 12))).toBeNull();
  });

  it("refuses an empty file", () => {
    expect(readImageFacts(new Uint8Array(0))).toBeNull();
  });
});

describe("the brand marks that are already committed", () => {
  /*
    Real files, read off disk. The fixtures above prove the offsets; these
    prove the reader survives what an actual export from a real tool looks
    like — which is where a header parser usually falls over.

    **They were SVGs until 2026-09-11 and are PNGs now**, and that is worth
    knowing rather than just seeing: the company's identity arrived as a
    single raster presentation sheet, and `scripts/extract-brand.mjs` cuts
    these out of it. When the designer sends vectors these become SVGs again
    and this list says so.
  */
  it.each(["symbol-light.png", "symbol-dark.png", "logo-light.png", "logo-dark.png"])(
    "reads %s",
    (name) => {
      const bytes = readFileSync(resolve(process.cwd(), "public", "brand", name));
      const facts = readImageFacts(new Uint8Array(bytes));

      expect(facts?.format).toBe("png");
      expect(facts?.vector).toBe(false);
      expect(facts?.width).toBeGreaterThan(0);
      expect(facts?.height).toBeGreaterThan(0);
    },
  );

  it("has a mark big enough to print and to scale down from", () => {
    /* Cut from a 1254px sheet, so these are as large as they can honestly be.
       Under about 400px the mark starts to soften in a letterhead, which is
       the one place it is printed rather than displayed. */
    const bytes = readFileSync(resolve(process.cwd(), "public", "brand", "symbol-light.png"));
    expect(readImageFacts(new Uint8Array(bytes))?.width).toBeGreaterThanOrEqual(400);
  });

  it("reads the committed apple touch icon as a 180 square", () => {
    const bytes = readFileSync(resolve(process.cwd(), "src", "app", "apple-icon.png"));
    const facts = readImageFacts(new Uint8Array(bytes));

    expect(facts?.format).toBe("png");
    expect(facts?.width).toBe(180);
    expect(facts?.height).toBe(180);
  });
});

// ---------------------------------------------------------------------------

function ascii(bytes: Uint8Array, offset: number, value: string): void {
  for (let i = 0; i < value.length; i += 1) bytes[offset + i] = value.charCodeAt(i);
}

function writeU16BE(bytes: Uint8Array, offset: number, value: number): void {
  bytes[offset] = (value >> 8) & 0xff;
  bytes[offset + 1] = value & 0xff;
}

function writeU16LE(bytes: Uint8Array, offset: number, value: number): void {
  bytes[offset] = value & 0xff;
  bytes[offset + 1] = (value >> 8) & 0xff;
}

function writeU24LE(bytes: Uint8Array, offset: number, value: number): void {
  bytes[offset] = value & 0xff;
  bytes[offset + 1] = (value >> 8) & 0xff;
  bytes[offset + 2] = (value >> 16) & 0xff;
}

function writeU32BE(bytes: Uint8Array, offset: number, value: number): void {
  bytes[offset] = (value >>> 24) & 0xff;
  bytes[offset + 1] = (value >>> 16) & 0xff;
  bytes[offset + 2] = (value >>> 8) & 0xff;
  bytes[offset + 3] = value & 0xff;
}
