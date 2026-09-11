/**
 * The company's letterhead, worked out rather than drawn by hand.
 *
 * ---------------------------------------------------------------------------
 * **The owner's instruction, 2026-09-11.**
 *
 *   > service me ek aur kaam karna h — letter head banne wala menu add karna h
 *   > jisme letter head kaise banta h wo dekh lena … and aacha design ka bana
 *   > dena
 *
 * ---------------------------------------------------------------------------
 * **A letterhead is not a decorated page. It is a legal document frame.**
 *
 * Under section 12(3)(c) of the Companies Act 2013, a company must print, on
 * every business letter, billhead and letter paper:
 *
 *   · its name
 *   · the address of its registered office
 *   · its Corporate Identity Number
 *   · its telephone number
 *   · its email address
 *   · and its website, if it has one
 *
 * That is the whole reason this screen exists in the panel rather than in a
 * design tool. Every one of those six is already a column in `site_settings`,
 * filled in on the Settings screen — so the letterhead is generated from the
 * same row the footer and the invoices read, and it cannot say a different
 * address from the website. A letterhead typed into Word says whatever it said
 * the day somebody typed it.
 *
 * `statutoryGaps()` is what makes that useful: it names what is still empty,
 * so the missing CIN is found here rather than by whoever receives the letter.
 *
 * ---------------------------------------------------------------------------
 * **The measurements are print measurements, and they are not arbitrary.**
 *
 * A4 is 210 × 297 mm. Every number below is in millimetres for that reason:
 * a letterhead is the one thing in this application whose output is paper, and
 * a design specified in pixels is a design that prints at whatever size the
 * browser felt like.
 *
 *   · **18 mm side margins.** Under about 15 mm an office printer starts
 *     clipping, and 18 leaves room for a punch hole without eating text.
 *   · **The body starts at 45 mm.** Below that the letter's first line collides
 *     with the header on a long address block.
 *   · **22 mm reserved at the foot**, because the statutory line lives there
 *     and it must not be what gets pushed onto a second page.
 *   · **A colour band runs to the edge**, which needs 3 mm of bleed at a press
 *     and will stop 4–5 mm short on a desk printer. That is a real trade and
 *     the screen says so rather than pretending otherwise.
 */

/**
 * Everything the company has, as the letterhead may print it.
 *
 * The owner's instruction was "company me jitna bhi chej hota h wo sab hona
 * chiaye" — so this is not the six the law asks for, it is every identifier
 * and contact detail `site_settings` holds, plus anything typed in by hand as
 * a custom field. What appears on a given letterhead is decided by the field
 * list, not by this shape.
 */
export interface LetterheadCompany {
  companyName: string;
  legalName: string;
  tagline: string;
  email: string;
  phone: string;
  whatsapp: string;
  website: string;
  addressLines: string[];
  workingHours: string;
  cin: string;
  gst: string;
  /** Whatever the company has beyond those — PAN, Udyam, a bank account. */
  socials: { label: string; value: string }[];
  logo: { light: string | null; dark: string | null };
}

/* ============================================================== the paper == */

/** A4, in millimetres, because the output is paper. */
export const PAGE = { width: 210, height: 297 } as const;

export const MARGIN = {
  side: 18,
  /** Where the letter's own first line may begin. */
  bodyTop: 45,
  /** Kept clear at the foot for the statutory line. */
  bottom: 22,
} as const;

/* ============================================================= the layouts == */

export const LAYOUTS = [
  {
    key: "classic",
    label: "Classic",
    note: "Mark on the left, contact details on the right, a rule under both. What most Indian company letterheads look like, and the safest to send to anybody.",
  },
  {
    key: "centred",
    label: "Centred",
    note: "Mark in the middle with the details beneath it. Formal. Suits a letter that will be signed and scanned.",
  },
  {
    key: "band",
    label: "Side band",
    note: "A colour band down the left edge carrying the contact details. The most distinctive, and the one that needs a printer that can bleed.",
  },
  {
    key: "minimal",
    label: "Minimal",
    note: "A small mark at the top and everything else at the foot. The most room for the letter itself — right for a two-page contract.",
  },
] as const;

export type LayoutKey = (typeof LAYOUTS)[number]["key"];

export function isLayoutKey(value: unknown): value is LayoutKey {
  return typeof value === "string" && LAYOUTS.some((layout) => layout.key === value);
}

/* ========================================================== what the law asks == */

export interface StatutoryField {
  key: keyof LetterheadCompany | "addressLines";
  label: string;
  /** Why it is on the page, in the words somebody can act on. */
  why: string;
}

/**
 * The six the Companies Act names, in the order a reader looks for them.
 *
 * The GST number is deliberately **not** here: it belongs on a tax invoice and
 * is merely conventional on a letterhead. Listing it as required would teach
 * somebody to ignore this list, which is how a real gap gets missed.
 */
export const STATUTORY_FIELDS: readonly StatutoryField[] = [
  { key: "legalName", label: "Registered company name", why: "The name on the certificate of incorporation, not the brand." },
  { key: "addressLines", label: "Registered office address", why: "The address on file with the Registrar of Companies." },
  { key: "cin", label: "CIN", why: "The 21-character Corporate Identity Number." },
  { key: "phone", label: "Telephone number", why: "One reachable number." },
  { key: "email", label: "Email address", why: "One monitored address." },
  { key: "website", label: "Website", why: "Required only if the company has one — and it does." },
] as const;

/** Which of the six are still empty. Empty array means the page is compliant. */
export function statutoryGaps(company: LetterheadCompany): StatutoryField[] {
  return STATUTORY_FIELDS.filter((field) => {
    if (field.key === "addressLines") return company.addressLines.length === 0;
    const value = company[field.key];
    return typeof value !== "string" || value.trim() === "";
  });
}

/* ================================================================ the words == */

/**
 * The statutory line, as one sentence across the foot of the page.
 *
 * Built by joining what exists rather than by a template with holes in it: a
 * letterhead reading "CIN: · GST:" with nothing after the colons looks like a
 * mistake, and a missing field is already reported by `statutoryGaps()`.
 */
export function statutoryLine(company: LetterheadCompany): string {
  const parts = [
    company.legalName,
    company.addressLines.join(", "),
    company.cin && `CIN: ${company.cin}`,
    company.gst && `GSTIN: ${company.gst}`,
  ];

  return parts.filter((part) => typeof part === "string" && part.trim() !== "").join(" · ");
}

/** Phone, email and website, in the order they are read. */
export function contactLines(company: LetterheadCompany): string[] {
  return [company.phone, company.email, company.website].filter((line) => line.trim() !== "");
}

/**
 * The address, with an empty line dropped rather than printed.
 *
 * `address_line2` is optional and is blank for most companies; joining the six
 * address columns naively gives a letterhead with a hole in the middle of the
 * address, which is the commonest generated-document tell there is.
 */
export function addressFrom(parts: {
  line1?: string | null;
  line2?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
  country?: string | null;
}): string[] {
  const cityLine = [parts.city, parts.state].filter(Boolean).join(", ");
  const withPin = [cityLine, parts.postalCode].filter(Boolean).join(" ");

  return [parts.line1, parts.line2, withPin, parts.country]
    .map((line) => (line ?? "").trim())
    .filter((line) => line !== "");
}
