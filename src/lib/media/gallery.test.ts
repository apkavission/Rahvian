import { describe, expect, it } from "vitest";
import { galleryToJson, readGallery } from "@/lib/media/gallery";

/**
 * The gallery document.
 *
 * `projects.gallery` and `case_studies.screenshots` are `jsonb`, so nothing at
 * the database guarantees this shape and both a public page and an admin form
 * read it. What matters most is the pair being symmetrical: what the form
 * writes has to be what the page reads, or a picture is saved and never
 * appears — and that failure looks like the save having worked.
 */

describe("readGallery", () => {
  it("keeps the order it was given", () => {
    const stored = [
      { media_id: "a", caption: "First" },
      { media_id: "b" },
      { media_id: "c", caption: "Third" },
    ];

    expect(readGallery(stored).map((item) => item.media_id)).toEqual(["a", "b", "c"]);
  });

  it("treats a missing, blank or non-string caption as no caption", () => {
    const stored = [
      { media_id: "a" },
      { media_id: "b", caption: "   " },
      { media_id: "c", caption: 42 },
    ];

    expect(readGallery(stored).map((item) => item.caption)).toEqual([null, null, null]);
  });

  it("drops an entry with no media id rather than rendering a hole", () => {
    const stored = [{ caption: "orphan" }, { media_id: "a" }, null, "nonsense", 7];

    expect(readGallery(stored).map((item) => item.media_id)).toEqual(["a"]);
  });

  it("returns nothing for a column that is not an array", () => {
    expect(readGallery(null)).toEqual([]);
    expect(readGallery({})).toEqual([]);
    expect(readGallery(undefined)).toEqual([]);
  });
});

describe("galleryToJson", () => {
  it("writes only the keys that were set", () => {
    const rows = [
      { media_id: "a", caption: "First" },
      { media_id: "b", caption: "" },
    ];

    expect(galleryToJson(rows)).toEqual([{ media_id: "a", caption: "First" }, { media_id: "b" }]);
  });

  it("drops a row with no picture", () => {
    // The form marks the picker required, so this only catches a posted
    // request — but a caption with no image is a row the page cannot draw.
    const rows = [{ caption: "no picture" }, { media_id: "  " }, { media_id: "a" }];

    expect(galleryToJson(rows)).toEqual([{ media_id: "a" }]);
  });

  it("trims what it stores", () => {
    expect(galleryToJson([{ media_id: " a ", caption: "  First  " }])).toEqual([
      { media_id: "a", caption: "First" },
    ]);
  });

  it("survives being handed something that is not a list", () => {
    expect(galleryToJson(undefined)).toEqual([]);
    expect(galleryToJson("nonsense")).toEqual([]);
  });

  it("round-trips: what the form writes is what the page reads", () => {
    const edited = [
      { media_id: "a", caption: "First" },
      { media_id: "b", caption: "" },
    ];

    expect(readGallery(galleryToJson(edited))).toEqual([
      { media_id: "a", caption: "First" },
      { media_id: "b", caption: null },
    ]);
  });
});
