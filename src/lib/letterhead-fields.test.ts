import { describe, expect, it } from "vitest";
import type { LetterheadCompany } from "@/lib/letterhead";
import {
  defaultFields,
  fieldId,
  joinFields,
  moveField,
  readFields,
  resolveFields,
  type LetterheadField,
} from "@/lib/letterhead-fields";

const company: LetterheadCompany = {
  companyName: "Rahvian",
  legalName: "Rahvian Technologies Private Limited",
  tagline: "Your Vision. We Make It Happen.",
  email: "hello@rahvian.com",
  phone: "+91 90000 00000",
  whatsapp: "",
  website: "rahvian.com",
  addressLines: ["12 Fraser Road", "Patna, Bihar 800001"],
  workingHours: "",
  cin: "U62099BR2026PTC000000",
  gst: "",
  socials: [],
  logo: { light: null, dark: null },
};

const field = (over: Partial<LetterheadField>): LetterheadField => ({
  id: fieldId(),
  source: "phone",
  label: "Phone",
  value: "",
  slot: "header",
  showLabel: false,
  ...over,
});

describe("the default arrangement", () => {
  it("puts the six the Act asks for on the page without anybody arranging it", () => {
    const sources = defaultFields().map((entry) => entry.source);

    for (const required of ["legalName", "address", "cin", "phone", "email", "website"]) {
      expect(sources, required).toContain(required);
    }
  });

  it("gives every block its own id", () => {
    const ids = defaultFields().map((entry) => entry.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("an empty field vanishes", () => {
  /*
    The rule the owner asked for, and the reason the blocks are a list:

      > koi field khali chod h to wo letter me khali nhi hona chiaye wo gayab hi
      > ho jayega
  */
  it("does not render a block whose value is empty", () => {
    const fields = [field({ source: "phone" }), field({ source: "whatsapp", label: "WhatsApp" })];
    const resolved = resolveFields(company, fields, "header");

    /* The company has a phone and no WhatsApp number. */
    expect(resolved).toHaveLength(1);
    expect(resolved[0].lines).toEqual(["+91 90000 00000"]);
  });

  it("does not render a label with nothing after it", () => {
    const fields = [field({ source: "gst", label: "GSTIN", showLabel: true, slot: "footer" })];
    expect(resolveFields(company, fields, "footer")).toEqual([]);
    expect(joinFields(resolveFields(company, fields, "footer"))).toBe("");
  });

  it("closes the gap rather than leaving one", () => {
    const fields = [
      field({ source: "phone", slot: "footer" }),
      field({ source: "gst", slot: "footer" }),
      field({ source: "email", slot: "footer" }),
    ];

    expect(joinFields(resolveFields(company, fields, "footer"))).toBe(
      "+91 90000 00000 · hello@rahvian.com",
    );
  });

  it("drops a custom field left blank", () => {
    const fields = [
      field({ source: "custom", label: "PAN", value: "", slot: "footer", showLabel: true }),
      field({ source: "custom", label: "Udyam", value: "UDYAM-BR-00-0000000", slot: "footer", showLabel: true }),
    ];

    expect(joinFields(resolveFields(company, fields, "footer"))).toBe("Udyam: UDYAM-BR-00-0000000");
  });

  it("drops an address with no lines in it", () => {
    const fields = [field({ source: "address", slot: "footer" })];
    expect(resolveFields({ ...company, addressLines: [] }, fields, "footer")).toEqual([]);
  });
});

describe("a custom field", () => {
  it("prints whatever was typed into it", () => {
    const fields = [
      field({ source: "custom", label: "PAN", value: "AAACR1234A", slot: "footer", showLabel: true }),
    ];

    expect(joinFields(resolveFields(company, fields, "footer"))).toBe("PAN: AAACR1234A");
  });

  it("prints without a label when the label is switched off", () => {
    const fields = [
      field({ source: "custom", label: "PAN", value: "AAACR1234A", slot: "footer", showLabel: false }),
    ];

    expect(joinFields(resolveFields(company, fields, "footer"))).toBe("AAACR1234A");
  });
});

describe("slots", () => {
  it("keeps a band block in the header when there is no band", () => {
    /* Somebody who changes layout must not silently lose a field. */
    const fields = [field({ source: "phone", slot: "band" })];

    expect(resolveFields(company, fields, "header", { hasBand: false })).toHaveLength(1);
    expect(resolveFields(company, fields, "header", { hasBand: true })).toHaveLength(0);
    expect(resolveFields(company, fields, "band", { hasBand: true })).toHaveLength(1);
  });

  it("keeps the order of the array", () => {
    const fields = [
      field({ source: "website", slot: "header" }),
      field({ source: "phone", slot: "header" }),
      field({ source: "email", slot: "header" }),
    ];

    expect(resolveFields(company, fields, "header").map((entry) => entry.lines[0])).toEqual([
      "rahvian.com",
      "+91 90000 00000",
      "hello@rahvian.com",
    ]);
  });
});

describe("readFields", () => {
  it("gives a letterhead its default blocks rather than none", () => {
    /* A page with no blocks is not a letterhead, and "never configured" is
       not worth distinguishing from "emptied" on a page that has to print. */
    expect(readFields(null).length).toBeGreaterThan(0);
    expect(readFields([]).length).toBeGreaterThan(0);
    expect(readFields("nonsense").length).toBeGreaterThan(0);
  });

  it("drops an entry naming a source this build does not have", () => {
    const fields = readFields([
      { id: "a", source: "phone", label: "Phone", value: "", slot: "header", showLabel: false },
      { id: "b", source: "hologram", label: "?", value: "", slot: "header", showLabel: false },
    ]);

    expect(fields).toHaveLength(1);
    expect(fields[0].source).toBe("phone");
  });

  it("repairs an entry rather than refusing the whole row", () => {
    const fields = readFields([{ source: "cin", slot: "nowhere", showLabel: "yes" }]);

    expect(fields).toHaveLength(1);
    expect(fields[0].slot).toBe("footer");
    /* Only a real `true` turns the label on: a string is a hand-edited row. */
    expect(fields[0].showLabel).toBe(false);
    expect(fields[0].id).not.toBe("");
  });
});

describe("moveField", () => {
  const a = field({ id: "a", source: "phone" });
  const b = field({ id: "b", source: "email" });
  const c = field({ id: "c", source: "website" });

  it("moves a block down", () => {
    expect(moveField([a, b, c], "a", 2).map((f) => f.id)).toEqual(["b", "c", "a"]);
  });

  it("moves a block up", () => {
    expect(moveField([a, b, c], "c", 0).map((f) => f.id)).toEqual(["c", "a", "b"]);
  });

  it("clamps a drop past either end instead of losing the block", () => {
    /* A drop past the end gives an index one beyond the list; dragging off the
       top gives a negative one. Both are gestures, not errors. */
    expect(moveField([a, b, c], "a", 99).map((f) => f.id)).toEqual(["b", "c", "a"]);
    expect(moveField([a, b, c], "c", -4).map((f) => f.id)).toEqual(["c", "a", "b"]);
  });

  it("leaves the list alone when the block is not in it", () => {
    expect(moveField([a, b], "zzz", 0)).toHaveLength(2);
  });

  it("does not mutate what it was given", () => {
    const original = [a, b, c];
    moveField(original, "a", 2);
    expect(original.map((f) => f.id)).toEqual(["a", "b", "c"]);
  });
});
