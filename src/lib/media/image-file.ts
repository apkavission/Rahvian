/**
 * What an uploaded file actually is, read from its own bytes.
 *
 * Two questions, both answered here and neither answered by asking the
 * browser:
 *
 *   **What format is it?** `File.type` is whatever the operating system
 *   guessed from the extension. Renaming `notes.txt` to `photo.png` is enough
 *   to make a browser claim `image/png`, and a store that believes it ends up
 *   serving a text file with an image content type.
 *
 *   **What size is it?** The image rules in `docs/image-rules.md` require every
 *   field to state the pixels it wants and to warn when the file given does
 *   not match. That comparison is only worth making against a dimension read
 *   from the file rather than one the uploader reported.
 *
 * No dependency. Five formats, each of which puts its dimensions in a fixed
 * place near the front of the file, so this reads a header rather than
 * decoding an image.
 */

export type ImageFormat = "png" | "jpeg" | "gif" | "webp" | "svg";

export interface ImageFacts {
  format: ImageFormat;
  mimeType: string;
  /** Null for an SVG that declares no intrinsic size. */
  width: number | null;
  height: number | null;
  /**
   * Whether the format scales without losing anything.
   *
   * SVG does, so the "never upscaled" rule does not apply to it and a size
   * mismatch is not worth warning about. Every raster format does not.
   */
  vector: boolean;
}

const MIME: Record<ImageFormat, string> = {
  png: "image/png",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  svg: "image/svg+xml",
};

/** The formats an upload may be, as an `accept` attribute. */
export const ACCEPTED_IMAGE_TYPES = Object.values(MIME).join(",");

/**
 * Read the format and the dimensions, or null if it is not an image we accept.
 *
 * Null is the answer for a corrupt file as well as for a wrong one, and both
 * are refused at the same place for the same reason: a file whose header
 * cannot be read is a file whose dimensions cannot be checked.
 */
export function readImageFacts(bytes: Uint8Array): ImageFacts | null {
  if (isPng(bytes)) {
    return {
      format: "png",
      mimeType: MIME.png,
      // IHDR is always the first chunk, so width and height sit at fixed
      // offsets — 8 bytes of signature, 8 of chunk header, then the two.
      width: readU32BE(bytes, 16),
      height: readU32BE(bytes, 20),
      vector: false,
    };
  }

  if (isGif(bytes)) {
    return {
      format: "gif",
      mimeType: MIME.gif,
      width: readU16LE(bytes, 6),
      height: readU16LE(bytes, 8),
      vector: false,
    };
  }

  if (isJpeg(bytes)) {
    const size = jpegSize(bytes);
    if (!size) return null;
    return { format: "jpeg", mimeType: MIME.jpeg, ...size, vector: false };
  }

  if (isWebp(bytes)) {
    const size = webpSize(bytes);
    if (!size) return null;
    return { format: "webp", mimeType: MIME.webp, ...size, vector: false };
  }

  if (isSvg(bytes)) {
    return { format: "svg", mimeType: MIME.svg, ...svgSize(bytes), vector: true };
  }

  return null;
}

// ---------------------------------------------------------------------------
// Signatures

function isPng(b: Uint8Array): boolean {
  return (
    b.length > 24 &&
    b[0] === 0x89 &&
    b[1] === 0x50 &&
    b[2] === 0x4e &&
    b[3] === 0x47 &&
    b[4] === 0x0d &&
    b[5] === 0x0a &&
    b[6] === 0x1a &&
    b[7] === 0x0a
  );
}

function isGif(b: Uint8Array): boolean {
  return b.length > 10 && b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46;
}

function isJpeg(b: Uint8Array): boolean {
  return b.length > 4 && b[0] === 0xff && b[1] === 0xd8;
}

function isWebp(b: Uint8Array): boolean {
  return (
    b.length > 30 &&
    ascii(b, 0, 4) === "RIFF" &&
    ascii(b, 8, 4) === "WEBP"
  );
}

/**
 * An SVG, identified by reading the start of it as text.
 *
 * A leading byte-order mark, an XML declaration, a doctype and comments are
 * all legal before the root element, so this looks for `<svg` anywhere in the
 * first kilobyte rather than at the very front.
 */
function isSvg(b: Uint8Array): boolean {
  const head = new TextDecoder("utf-8", { fatal: false })
    .decode(b.subarray(0, 1024))
    .toLowerCase();
  return head.includes("<svg");
}

// ---------------------------------------------------------------------------
// Dimensions

/**
 * JPEG, by walking the marker segments to the frame header.
 *
 * There is no fixed offset: a JPEG is a chain of segments, and the one that
 * carries the dimensions — a start-of-frame marker — sits after however much
 * metadata the camera or the editor wrote. Progressive JPEGs use a different
 * SOF marker from baseline ones, which is why this accepts a range rather than
 * one value; the four excluded from that range (`C4`, `C8`, `CC`) are Huffman
 * and arithmetic tables that happen to fall inside it.
 */
function jpegSize(b: Uint8Array): { width: number; height: number } | null {
  let offset = 2;

  while (offset + 9 < b.length) {
    if (b[offset] !== 0xff) {
      offset += 1;
      continue;
    }

    const marker = b[offset + 1];

    // Padding, and the standalone markers that carry no length.
    if (marker === 0xff || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd9)) {
      offset += 2;
      continue;
    }

    const isFrame =
      marker >= 0xc0 &&
      marker <= 0xcf &&
      marker !== 0xc4 &&
      marker !== 0xc8 &&
      marker !== 0xcc;

    if (isFrame) {
      return {
        height: readU16BE(b, offset + 5),
        width: readU16BE(b, offset + 7),
      };
    }

    const length = readU16BE(b, offset + 2);
    if (length < 2) return null;
    offset += 2 + length;
  }

  return null;
}

/**
 * WebP, which is three formats sharing a container.
 *
 * `VP8 ` is lossy, `VP8L` lossless and `VP8X` extended — an animation or a file
 * with an alpha channel or metadata. Each stores its size differently, and a
 * reader that handles only the first gets nothing from most modern exports,
 * because anything with transparency is written as `VP8X`.
 */
function webpSize(b: Uint8Array): { width: number; height: number } | null {
  const chunk = ascii(b, 12, 4);

  if (chunk === "VP8 ") {
    // The 14 bits after the frame tag and the start code.
    return {
      width: readU16LE(b, 26) & 0x3fff,
      height: readU16LE(b, 28) & 0x3fff,
    };
  }

  if (chunk === "VP8L") {
    // 14 bits each, packed across four bytes after the signature byte.
    const bits = readU32LE(b, 21);
    return {
      width: (bits & 0x3fff) + 1,
      height: ((bits >> 14) & 0x3fff) + 1,
    };
  }

  if (chunk === "VP8X") {
    // Canvas size, stored as 24-bit little-endian, each one less than actual.
    return {
      width: readU24LE(b, 24) + 1,
      height: readU24LE(b, 27) + 1,
    };
  }

  return null;
}

/**
 * An SVG's intrinsic size, if it declares one.
 *
 * `width` and `height` first; `viewBox` as the fallback, which is what a file
 * exported for the web usually carries instead. Percentages and unitless
 * numbers are the only forms worth reading — a width in millimetres is a print
 * asset and has no pixel size to compare anything against.
 *
 * Null for both is a legitimate answer, not a failure: an SVG with no declared
 * size scales to whatever box it is put in, which is exactly what it is for.
 */
function svgSize(b: Uint8Array): { width: number | null; height: number | null } {
  const head = new TextDecoder("utf-8", { fatal: false }).decode(b.subarray(0, 4096));

  const tag = /<svg\b[^>]*>/i.exec(head);
  if (!tag) return { width: null, height: null };

  const attr = (name: string): number | null => {
    const match = new RegExp(`\\b${name}\\s*=\\s*["']\\s*([0-9.]+)\\s*(px)?\\s*["']`, "i").exec(
      tag[0],
    );
    if (!match) return null;
    const value = Number.parseFloat(match[1]);
    return Number.isFinite(value) && value > 0 ? Math.round(value) : null;
  };

  const width = attr("width");
  const height = attr("height");
  if (width && height) return { width, height };

  const viewBox = /\bviewBox\s*=\s*["']\s*([-\d.]+)[\s,]+([-\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)/i.exec(
    tag[0],
  );

  if (viewBox) {
    const w = Math.round(Number.parseFloat(viewBox[3]));
    const h = Math.round(Number.parseFloat(viewBox[4]));
    if (w > 0 && h > 0) return { width: w, height: h };
  }

  return { width: width ?? null, height: height ?? null };
}

// ---------------------------------------------------------------------------
// Readers

function ascii(b: Uint8Array, offset: number, length: number): string {
  let out = "";
  for (let i = 0; i < length; i += 1) out += String.fromCharCode(b[offset + i]);
  return out;
}

function readU16BE(b: Uint8Array, o: number): number {
  return (b[o] << 8) | b[o + 1];
}

function readU16LE(b: Uint8Array, o: number): number {
  return b[o] | (b[o + 1] << 8);
}

function readU24LE(b: Uint8Array, o: number): number {
  return b[o] | (b[o + 1] << 8) | (b[o + 2] << 16);
}

function readU32BE(b: Uint8Array, o: number): number {
  // `>>> 0` because a top bit set would otherwise make this negative — a
  // dimension of −2,147,483,648 rather than one of 2,147,483,648.
  return ((b[o] << 24) | (b[o + 1] << 16) | (b[o + 2] << 8) | b[o + 3]) >>> 0;
}

function readU32LE(b: Uint8Array, o: number): number {
  return (b[o] | (b[o + 1] << 8) | (b[o + 2] << 16) | (b[o + 3] << 24)) >>> 0;
}
