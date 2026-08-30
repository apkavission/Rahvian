import { describe, expect, it } from "vitest";
import { renamedFilename, safeFilename } from "@/lib/media/filename";

/**
 * The name an uploaded file is stored and served under.
 *
 * Two jobs, and both are about not being lied to.
 *
 * The name becomes part of a URL and part of a bucket key, so anything that
 * could change the meaning of either has to stop being a character. That is
 * not a tidiness rule: `../`, a query string and a fragment are all things
 * somebody can put in a filename, and all three are the same character to the
 * rule below.
 *
 * And the extension comes from **what the bytes are**, never from what the
 * uploader called the file. A JPEG named `.png` is stored as `.jpg`, because
 * the extension is the last thing anybody checks and the first thing that
 * misleads them.
 */

describe("safeFilename", () => {
  it("keeps an ordinary name, lowercased", () => {
    expect(safeFilename("Company Logo.PNG", "png")).toBe("company-logo.png");
  });

  it("takes the extension from the format, not from the name", () => {
    // The whole reason this function exists.
    expect(safeFilename("photo.png", "jpeg")).toBe("photo.jpg");
    expect(safeFilename("drawing.jpg", "svg")).toBe("drawing.svg");
    expect(safeFilename("no-extension-at-all", "webp")).toBe("no-extension-at-all.webp");
  });

  it("stores both spellings of a JPEG the same way", () => {
    // One spelling on disk, so a filename never has to be guessed at twice.
    expect(safeFilename("a.jpeg", "jpeg")).toBe("a.jpg");
    expect(safeFilename("a.jpg", "jpeg")).toBe("a.jpg");
  });

  it("cannot carry a path out of its folder", () => {
    /*
      The one that matters. A slash, a dot-dot and a backslash are all just
      characters to the replacement, so none of them survives into a bucket key.
    */
    expect(safeFilename("../../etc/passwd.png", "png")).toBe("etc-passwd.png");
    expect(safeFilename("..\\..\\windows\\system32.png", "png")).toBe(
      "windows-system32.png",
    );
    expect(safeFilename("/absolute/path.png", "png")).toBe("absolute-path.png");

    for (const name of ["../../etc/passwd.png", "/absolute/path.png"]) {
      expect(safeFilename(name, "png")).not.toContain("/");
      expect(safeFilename(name, "png")).not.toContain("..");
    }
  });

  it("cannot carry a query string or a fragment", () => {
    const result = safeFilename("logo.png?width=9999#anchor", "png");

    expect(result).not.toContain("?");
    expect(result).not.toContain("#");
  });

  it("falls back to a name rather than storing an extension on its own", () => {
    // A name of nothing but punctuation reduces to nothing, and ".png" is not
    // a filename — it is a file that looks broken in every listing.
    expect(safeFilename("!!!.png", "png")).toBe("image.png");
    expect(safeFilename("___", "png")).toBe("image.png");
    expect(safeFilename("", "png")).toBe("image.png");
  });

  it("collapses runs and trims the hyphens off both ends", () => {
    expect(safeFilename("  hello   world  .png", "png")).toBe("hello-world.png");
    expect(safeFilename("--leading-and-trailing--.png", "png")).toBe(
      "leading-and-trailing.png",
    );
  });

  it("flattens accents rather than dropping the word", () => {
    // NFKD first, so "café" becomes "cafe" and not "caf".
    expect(safeFilename("café.png", "png")).toBe("cafe.png");
  });

  it("caps the stem without eating the extension", () => {
    const long = safeFilename(`${"a".repeat(200)}.png`, "png");

    expect(long.endsWith(".png")).toBe(true);
    expect(long).toBe(`${"a".repeat(80)}.png`);
  });

  it("never returns something with a character a URL would have to escape", () => {
    const awkward = [
      "a b&c=d.png",
      "100%.png",
      "über–dash.png",
      "emoji-🙂.png",
      "quote\"and'apostrophe.png",
    ];

    for (const name of awkward) {
      expect(safeFilename(name, "png")).toMatch(/^[a-z0-9-]+\.png$/);
    }
  });
});

describe("renamedFilename", () => {
  /*
    Added after a browser click-through on 2026-08-28 found that renaming a
    file went through no sanitiser at all: `../evil.png`, `a/b/c.png` and
    `no-extension` were all accepted and written straight into the stored name
    and the served address. `safeFilename` existed and was applied on upload
    only, so the two paths into one column disagreed about what a name may be.
  */
  it("cleans a name the same way an upload would", () => {
    expect(renamedFilename("My New Photo.png", "old.png")).toBe("my-new-photo.png");
    expect(renamedFilename("  spaced  out  ", "old.jpg")).toBe("spaced-out.jpg");
  });

  it("refuses to carry a path into the address", () => {
    expect(renamedFilename("../evil.png", "old.png")).toBe("evil.png");
    expect(renamedFilename("a/b/c.png", "old.png")).toBe("a-b-c.png");
    expect(renamedFilename("/absolute.png", "old.png")).toBe("absolute.png");
  });

  it("keeps the extension from the stored name, never from what was typed", () => {
    /*
      The extension records what the bytes are, and that was established once,
      when the file arrived. Typing `.png` over a JPEG would make the row lie
      about the file — which is the exact thing `safeFilename` exists to stop
      at the other end.
    */
    expect(renamedFilename("photo.png", "picture.jpg")).toBe("photo.jpg");
    expect(renamedFilename("logo", "mark.svg")).toBe("logo.svg");
    expect(renamedFilename("anything.exe", "safe.webp")).toBe("anything.webp");
  });

  it("never leaves a file without a name", () => {
    expect(renamedFilename("!!!", "old.png")).toBe("image.png");
    expect(renamedFilename("", "old.png")).toBe("image.png");
  });

  it("produces only characters a URL needs no escaping for", () => {
    for (const typed of ["a b&c=d", "100%", "über–dash", "emoji-🙂", "..\..\win"]) {
      expect(renamedFilename(typed, "x.png")).toMatch(/^[a-z0-9-]+\.png$/);
    }
  });
});
