/**
 * Getting a picture into a banner, without it leaving the browser.
 *
 * ---------------------------------------------------------------------------
 * **Everything here is a data URL.** A file dropped onto the studio is read
 * with `FileReader` and never uploaded — which is what lets somebody build a
 * banner for a client whose name is not public yet, on a laptop, with no
 * account anywhere.
 *
 * It is also what makes the export work: a canvas that has drawn an image from
 * another origin is tainted, and `toBlob` on a tainted canvas throws. A data
 * URL is same-origin by definition, so the PNG always comes out.
 *
 * ---------------------------------------------------------------------------
 * **Video, honestly.**
 *
 * A banner is a still image — a PNG or an SVG — and no still image can contain
 * a video. Pretending otherwise would produce a preview that plays and a
 * download that does not, which is worse than saying so.
 *
 * What a video *can* give is a frame. Drop one in, scrub to the moment worth
 * using, and that frame becomes an image layer. That is what people actually
 * want from "put a video in the banner", and it is a thing a still image can
 * hold.
 */

export interface LoadedImage {
  src: string;
  naturalWidth: number;
  naturalHeight: number;
  /** What text placed over it will have to be read against. */
  averageColour: string;
  label: string;
}

/** How large a file the browser will hold happily as a data URL. */
export const MAX_BYTES = 12 * 1024 * 1024;

export class MediaError extends Error {}

/**
 * A picture, measured.
 *
 * The dimensions and the average colour are read here rather than when they are
 * needed, because both require the image to have decoded — and the guidance
 * that uses them ("this is being blown up", "text will not read on this") has
 * to be able to answer immediately as somebody drags things about.
 */
export async function loadImage(file: File): Promise<LoadedImage> {
  if (!file.type.startsWith("image/")) {
    throw new MediaError("That is not an image file.");
  }

  if (file.size > MAX_BYTES) {
    throw new MediaError(
      `That file is ${Math.round(file.size / 1024 / 1024)}MB. Anything over ${MAX_BYTES / 1024 / 1024}MB makes the page slow — please use a smaller one.`,
    );
  }

  const src = await asDataUrl(file);
  const image = await decode(src);

  return {
    src,
    naturalWidth: image.naturalWidth,
    naturalHeight: image.naturalHeight,
    averageColour: averageOf(image),
    label: file.name,
  };
}

/**
 * One frame of a video, as an image.
 *
 * `currentTime` is set and the `seeked` event waited for — setting it and
 * drawing immediately captures whatever frame happened to be decoded, which is
 * usually the first one however far along the scrubber is.
 */
export async function frameFromVideo(
  video: HTMLVideoElement,
  label: string,
): Promise<LoadedImage> {
  const canvas = document.createElement("canvas");
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;

  if (!canvas.width || !canvas.height) {
    throw new MediaError("That video has not loaded far enough to take a frame from.");
  }

  const context = canvas.getContext("2d");
  if (!context) throw new MediaError("This browser cannot capture a frame.");

  context.drawImage(video, 0, 0, canvas.width, canvas.height);

  const src = canvas.toDataURL("image/png");
  const image = await decode(src);

  return {
    src,
    naturalWidth: canvas.width,
    naturalHeight: canvas.height,
    averageColour: averageOf(image),
    label: `${label} — frame at ${video.currentTime.toFixed(1)}s`,
  };
}

/** A video file, ready to scrub. Revoked by the caller when finished with. */
export async function loadVideo(file: File): Promise<{ url: string; label: string }> {
  if (!file.type.startsWith("video/")) {
    throw new MediaError("That is not a video file.");
  }

  if (file.size > MAX_BYTES * 4) {
    throw new MediaError("That video is too large to hold in the page.");
  }

  /*
    An object URL rather than a data URL, unlike everything else here.

    A video is played, not exported — the thing that ends up in the banner is a
    single frame, already converted to a data URL by `frameFromVideo`. Holding
    a 40MB file as base64 text would be four times the memory for no benefit.
  */
  return { url: URL.createObjectURL(file), label: file.name };
}

/* -------------------------------------------------------------------------- */

function asDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new MediaError("That file could not be read."));

    reader.readAsDataURL(file);
  });
}

function decode(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();

    image.onload = () => resolve(image);
    image.onerror = () => reject(new MediaError("That file is not an image this browser can open."));

    image.src = src;
  });
}

/**
 * The average colour of a picture.
 *
 * ---------------------------------------------------------------------------
 * **Drawn small on purpose.** Scaling the image into a 32-pixel canvas makes
 * the browser average it in optimised code; reading every pixel of a
 * four-megapixel photograph in JavaScript would take long enough to be felt
 * while somebody is dragging.
 *
 * **It is a simplification and the guidance says so.** A photograph with a
 * bright sky and a dark foreground has no single colour, and text over it may
 * be readable in one half and not the other. What this catches is the common
 * case — a mid-toned picture with mid-toned text over it — which is most of
 * them.
 */
function averageOf(image: HTMLImageElement): string {
  const size = 32;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;

  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) return "#808080";

  context.drawImage(image, 0, 0, size, size);

  try {
    const { data } = context.getImageData(0, 0, size, size);

    let r = 0;
    let g = 0;
    let b = 0;
    let counted = 0;

    for (let at = 0; at < data.length; at += 4) {
      /* A transparent pixel contributes nothing to what text is read against —
         what shows through is whatever is behind, which is counted separately. */
      if (data[at + 3] < 24) continue;

      r += data[at];
      g += data[at + 1];
      b += data[at + 2];
      counted += 1;
    }

    if (counted === 0) return "#808080";

    const hex = (value: number) =>
      Math.round(value / counted)
        .toString(16)
        .padStart(2, "0");

    return `#${hex(r)}${hex(g)}${hex(b)}`;
  } catch {
    /* A tainted canvas. Cannot happen with a data URL, but a mid grey is a
       safer answer than a crash: it makes the contrast check cautious rather
       than absent. */
    return "#808080";
  }
}
