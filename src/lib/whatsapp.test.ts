import { describe, expect, it } from "vitest";
import {
  DEFAULT_WHATSAPP_TEMPLATE,
  GENERIC_CONTEXT,
  whatsappHref,
  whatsappLink,
  whatsappMessage,
} from "@/lib/whatsapp";

/**
 * The click-to-chat link.
 *
 * Two failures matter here and neither one throws:
 *
 * **A link that opens an empty chat.** The visitor has to write the first
 * sentence themselves, which is the sentence they are least likely to write.
 * That was the state of all three existing WhatsApp buttons before this.
 *
 * **A link that looks fine and goes nowhere.** `wa.me` does not reject a number
 * missing its country code — it opens WhatsApp on a chat with nobody. The
 * failure lands on the visitor, after the tap, where nobody sees it.
 */

describe("whatsappHref", () => {
  it("strips everything that is not a digit", () => {
    expect(whatsappHref("+91 98765 43210")).toBe("https://wa.me/919876543210");
    expect(whatsappHref("(+91)-98765-43210")).toBe("https://wa.me/919876543210");
  });

  it("refuses a number with no country code rather than making a dead link", () => {
    // Ten digits is an Indian mobile as people write it locally. `wa.me` would
    // accept it and open a chat with nobody.
    expect(whatsappHref("9876543210")).toBeNull();
    expect(whatsappHref("98765 43210")).toBeNull();
  });

  it("refuses nothing at all", () => {
    expect(whatsappHref(null)).toBeNull();
    expect(whatsappHref(undefined)).toBeNull();
    expect(whatsappHref("")).toBeNull();
    expect(whatsappHref("not a number")).toBeNull();
  });

  it("carries the message as text", () => {
    const href = whatsappHref("+919876543210", "Hi, about the pricing");

    expect(href).toContain("?text=");
    expect(decodeURIComponent(href!.split("?text=")[1])).toBe("Hi, about the pricing");
  });

  it("encodes a space as %20, never as +", () => {
    /*
      `URLSearchParams` would write `+`, and WhatsApp prints that literally in
      the message box — "Hi,+I'd+like+a+quote". It looks like a bug to the
      visitor, in the first message they send.
    */
    const href = whatsappHref("+919876543210", "two words");

    expect(href).toContain("%20");
    expect(href).not.toContain("+");
  });

  it("survives the characters a real message contains", () => {
    const href = whatsappHref("+919876543210", "Hi — I'd like a quote for ₹50,000 & up?");

    expect(href).not.toContain(" ");
    expect(decodeURIComponent(href!.split("?text=")[1])).toBe(
      "Hi — I'd like a quote for ₹50,000 & up?",
    );
  });

  it("omits the query entirely when there is no message", () => {
    expect(whatsappHref("+919876543210")).toBe("https://wa.me/919876543210");
    expect(whatsappHref("+919876543210", "   ")).toBe("https://wa.me/919876543210");
  });
});

describe("whatsappMessage", () => {
  it("puts the page's subject into the template", () => {
    expect(whatsappMessage("Hi, I'm interested in {context}.", "Mobile App Development")).toBe(
      "Hi, I'm interested in Mobile App Development.",
    );
  });

  it("replaces every placeholder, not only the first", () => {
    expect(whatsappMessage("{context} — yes, {context}.", "SEO")).toBe("SEO — yes, SEO.");
  });

  it("falls back to a generic subject rather than leaving a gap", () => {
    // "I'd like to talk about ." is worse than a vague sentence.
    expect(whatsappMessage(null, null)).toBe(
      DEFAULT_WHATSAPP_TEMPLATE.replace("{context}", GENERIC_CONTEXT),
    );
    expect(whatsappMessage("About {context}!", "   ")).toBe(`About ${GENERIC_CONTEXT}!`);
  });

  it("leaves a template with no placeholder exactly as written", () => {
    // Deleting the placeholder is an edit somebody made on purpose.
    expect(whatsappMessage("Hello, I have a question.", "Pricing")).toBe(
      "Hello, I have a question.",
    );
  });

  it("uses the default when the template is blank", () => {
    expect(whatsappMessage("   ", "SEO")).toBe("Hi, I'd like to talk about SEO.");
  });
});

describe("whatsappLink", () => {
  it("is the two halves together", () => {
    const href = whatsappLink("+91 98765 43210", "Hi, I'm interested in {context}.", "SEO");

    expect(href).toBe(
      `https://wa.me/919876543210?text=${encodeURIComponent("Hi, I'm interested in SEO.")}`,
    );
  });

  it("is null whenever the number is unusable, whatever the message says", () => {
    expect(whatsappLink("9876543210", "Hi, {context}", "SEO")).toBeNull();
    expect(whatsappLink(null, "Hi", "SEO")).toBeNull();
  });
});
