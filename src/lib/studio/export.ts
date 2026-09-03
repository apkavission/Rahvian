/**
 * Turning what is on screen into a file.
 *
 * ---------------------------------------------------------------------------
 * **The preview is the export.**
 *
 * Everything here starts from the `<svg>` element the studio already rendered,
 * serialised out of the page. Nothing re-draws the logo for the download, and
 * that is the whole design: a second drawing path is a second set of bugs, and
 * the ones it produces are the worst kind — a preview that looks right and a
 * downloaded file that does not, discovered by whoever printed it.
 *
 * ---------------------------------------------------------------------------
 * **Browser only.** Every function below touches `document`, `Image` or
 * `URL.createObjectURL`. They are called from event handlers in a client
 * component and never during a render.
 */

/**
 * The element, as a standalone SVG file.
 *
 * Three things are added that a document-embedded `<svg>` does not need and a
 * file does: the namespace, an explicit width and height, and the XML
 * declaration. Without the namespace the file opens as a blank page in
 * Illustrator and in a browser tab, which is a bug report rather than a logo.
 */
export function toSvgFile(source: SVGSVGElement, width?: number, height?: number): string {
  const copy = source.cloneNode(true) as SVGSVGElement;

  const natural = naturalSize(source);

  copy.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  copy.setAttribute("xmlns:xlink", "http://www.w3.org/1999/xlink");
  copy.setAttribute("width", String(width && width > 0 ? width : natural.width));
  copy.setAttribute("height", String(height && height > 0 ? height : natural.height));

  /* Anything the studio uses to find the node again is not part of the artwork. */
  copy.removeAttribute("data-studio");
  copy.removeAttribute("class");
  copy.removeAttribute("style");

  const markup = new XMLSerializer().serializeToString(copy);

  return `<?xml version="1.0" encoding="UTF-8"?>\n${markup}`;
}

/**
 * The same thing as a PNG, at whatever size was asked for.
 *
 * ---------------------------------------------------------------------------
 * **Why the SVG is turned into a data URL rather than a blob URL.**
 *
 * A canvas that has drawn an image from a blob URL on another origin is
 * tainted, and `toBlob` on a tainted canvas throws a security error. A data URL
 * is same-origin by definition, so it never taints — which matters here because
 * the failure is not a crash: it is a download button that silently does
 * nothing, and only on some browsers.
 *
 * ---------------------------------------------------------------------------
 * **Fonts.** An SVG rasterised through an `Image` gets no access to the page's
 * stylesheets, so a webfont that has not been loaded falls back. Every face
 * this studio offers names real system fonts after the webfont for that reason,
 * and the shapes are geometry rather than type wherever it would matter.
 */
export async function toPngBlob(
  source: SVGSVGElement,
  width: number,
  height: number,
  background: string | null,
): Promise<Blob> {
  /*
    Rasterised at the artwork's own size, then fitted onto the canvas.

    Not at the requested size: an SVG carrying `width="512" height="512"` has
    already letterboxed its own content by the time the browser draws it, and
    fitting that again is fitting twice. One place decides how the drawing sits
    in the frame, and it is the `drawImage` below.
  */
  const svg = toSvgFile(source);

  /*
    `encodeURIComponent` rather than `btoa`.

    `btoa` throws on any character above U+00FF, so a business with a name in
    Devanagari — which is most of the point of this estate — would produce an
    exception instead of a logo.
  */
  const url = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;

  const image = await loadImage(url);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");
  if (!context) throw new Error("This browser cannot draw the image.");

  /*
    A PNG keeps transparency, and a logo usually should. But a *banner* on a
    transparent background is a rectangle of nothing in most places it gets
    pasted, so the caller says which it wants.
  */
  if (background) {
    context.fillStyle = background;
    context.fillRect(0, 0, width, height);
  }

  /*
    Fitted, never stretched.

    A wide logo asked for as a 512-square app icon used to be squashed into the
    square — which does not look like a mistake in a 32-pixel favicon, it looks
    like a slightly wrong logo, and that is worse. So it is scaled to fit and
    centred, and the space around it is whatever the background is (nothing, for
    a transparent PNG).
  */
  const natural = naturalSize(source);
  const scale = Math.min(width / natural.width, height / natural.height);
  const drawn = { width: natural.width * scale, height: natural.height * scale };

  context.drawImage(
    image,
    (width - drawn.width) / 2,
    (height - drawn.height) / 2,
    drawn.width,
    drawn.height,
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("The image could not be made."))),
      "image/png",
    );
  });
}

/**
 * The shape the drawing actually is, from its viewBox.
 *
 * Not `getBoundingClientRect`: that answers with the size the *page* is showing
 * it at, which is whatever the preview's CSS decided and has nothing to do with
 * the artwork. The viewBox is the artwork.
 */
function naturalSize(source: SVGSVGElement): { width: number; height: number } {
  const box = source.getAttribute("viewBox");
  const parts = box?.split(/[\s,]+/).map(Number);

  if (parts && parts.length === 4 && parts[2] > 0 && parts[3] > 0) {
    return { width: parts[2], height: parts[3] };
  }

  /* No usable viewBox — square, so nothing is distorted while somebody works
     out why. */
  return { width: 100, height: 100 };
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();

    image.onload = () => resolve(image);
    image.onerror = () =>
      reject(new Error("The drawing could not be read back. Try a different design."));

    image.src = url;
  });
}

/**
 * Hand the file to the person.
 *
 * The object URL is revoked on the next frame rather than immediately: revoking
 * it in the same tick cancels the download in some browsers, which is a bug
 * that only appears on other people's machines.
 */
export function save(blob: Blob, name: string): void {
  const url = URL.createObjectURL(blob);

  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  anchor.rel = "noopener";

  document.body.append(anchor);
  anchor.click();
  anchor.remove();

  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function saveText(text: string, name: string, type: string): void {
  save(new Blob([text], { type }), name);
}
