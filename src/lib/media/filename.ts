/**
 * The name an uploaded file is filed and served under.
 *
 * Pure, and in `lib/media` rather than beside the upload action, because a
 * `"use server"` module may only export async functions — so a helper living
 * there cannot be reached by a test at all. It was private in
 * `actions/media.ts` until 2026-08-28.
 *
 * It is worth testing rather than reading, because it is doing two jobs at
 * once and both of them are about not being lied to. The name becomes part of
 * a URL and part of a bucket key, so it has to survive being put in one. And
 * the extension is taken from **what the bytes are**, not from what the
 * uploader called the file — a JPEG named `.png` is stored as `.jpg`, because
 * the extension is the last thing anyone checks and the first thing that
 * misleads them.
 */

/** The formats the upload accepts, and the extension each is stored under. */
export const EXTENSIONS = {
  png: "png",
  // `.jpeg` and `.jpg` are the same format; one spelling is stored so a
  // filename never has to be guessed at twice.
  jpeg: "jpg",
  gif: "gif",
  webp: "webp",
  svg: "svg",
} as const;

export type ImageFormat = keyof typeof EXTENSIONS;

export function extensionFor(format: ImageFormat): string {
  return EXTENSIONS[format];
}

export function safeFilename(original: string, format: ImageFormat): string {
  const withoutExtension = original.replace(/\.[^.]+$/, "");

  const stem =
    withoutExtension
      .toLowerCase()
      .normalize("NFKD")
      /*
        Anything that is not a letter, a number or a hyphen becomes a hyphen,
        then runs collapse.

        This is what makes a path traversal or a query string impossible to
        smuggle in through a filename: `../`, `?`, `#` and a space are all the
        same character to this line. Eighty characters is a cap on the stem
        rather than on the whole name, so the extension is never truncated.
      */
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || "image";

  return `${stem}.${extensionFor(format)}`;
}

/**
 * A renamed file's name, with its extension kept.
 *
 * `safeFilename` is applied at upload, where the format is known from the
 * bytes. **Rename went through no sanitiser at all until 2026-08-28**, which a
 * browser click-through found: the form accepted `../evil.png`, `a/b/c.png`
 * and `no-extension`, and each of them went straight into the stored name and
 * into the address the file is served at.
 *
 * Nothing escaped anywhere — the bucket key is built from the id, and a URL
 * percent-encodes a slash — so it was not a way in. It was still wrong twice
 * over: the sanitiser exists *because* the name is part of a URL, and the two
 * paths into that column disagreed about what a name may be, which is the
 * drift this codebase objects to everywhere else.
 *
 * **The extension is taken from the stored name, never from what was typed.**
 * It records what the bytes are, established once when the file arrived; a
 * rename may change what a file is called and must never change what it claims
 * to be. Typing `photo.png` over a JPEG leaves it `photo.jpg`.
 */
export function renamedFilename(typed: string, current: string): string {
  const extension = /\.([a-z0-9]+)$/i.exec(current)?.[1]?.toLowerCase() ?? "";

  const stem =
    typed
      .replace(/\.[^.]+$/, "")
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || "image";

  return extension ? `${stem}.${extension}` : stem;
}
