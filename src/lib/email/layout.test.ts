import { describe, expect, it } from "vitest";
import { escapeHtml, renderEmail, type EmailBrand } from "./layout";

/**
 * The frame every email in this estate is rendered into.
 *
 * ---------------------------------------------------------------------------
 * **Why this is worth unit-testing when the studio can show it on screen.**
 *
 * The preview answers "does it look right". These answer the things that look
 * right and are wrong: a name with an apostrophe that closes an attribute, a
 * layout that only works because a `<style>` block survived, a background that
 * a client's dark mode is free to invent. Every one of those renders perfectly
 * in the preview and breaks in somebody's inbox.
 */

const BRAND: EmailBrand = {
  companyName: "Rahvian",
  legalName: "Rahvian Technologies Private Limited",
  email: "hello@rahvian.com",
  phone: "+91 98765 43210",
  addressLines: ["12 Main Road", "Ranchi 834001"],
  siteUrl: "https://rahvian.com",
};

const base = {
  preheader: "A short line for the inbox",
  heading: "Thank you",
  brand: BRAND,
};

describe("escapeHtml", () => {
  it("closes off every character that could end an attribute or a tag", () => {
    expect(escapeHtml(`<img src="x" onerror=alert(1)>`)).toBe(
      "&lt;img src=&quot;x&quot; onerror=alert(1)&gt;",
    );
  });

  it("escapes the ampersand first, so nothing is double-decoded", () => {
    /* Escaping `<` before `&` turns `&lt;` into `&amp;lt;` and the reader sees
       the entity rather than the character. */
    expect(escapeHtml("Saffron & Smoke <Ranchi>")).toBe("Saffron &amp; Smoke &lt;Ranchi&gt;");
  });
});

describe("renderEmail", () => {
  it("puts what somebody typed through the escaper", () => {
    const html = renderEmail({
      ...base,
      heading: `O'Brien & Sons <script>`,
      intro: "Line one\nline two",
      rows: [["Company", `Saffron & "Smoke"`]],
    });

    expect(html).not.toContain("<script>");
    expect(html).toContain("O&#039;Brien &amp; Sons &lt;script&gt;".replace("&#039;", "'"));
    expect(html).toContain("Saffron &amp; &quot;Smoke&quot;");
  });

  it("keeps the shape of a pasted paragraph", () => {
    /* An enquiry arrives with the line breaks the person typed. Collapsing them
       turns three sentences into a wall, which is what the reader was avoiding
       when they pressed return. */
    const html = renderEmail({
      ...base,
      blocks: [{ label: "What they said", body: "First line\nSecond line" }],
    });

    expect(html).toContain("First line<br>Second line");
  });

  it("carries the inbox preview line, and hides it from the message", () => {
    const html = renderEmail({ ...base, preheader: "Ready in one working day" });

    expect(html).toContain("Ready in one working day");
    /* Shown beside the subject in the list, never as the first line of the
       email itself. */
    expect(html).toMatch(/display:none[^>]*>\s*Ready in one working day/);
  });

  it("states every background rather than leaving one to be inferred", () => {
    /*
      A client that forces dark mode inverts what it can infer. An unstated
      background is the usual reason a light-ink logo ends up on a colour nobody
      chose — and the header bar here is dark precisely so the mark reads either
      way.
    */
    const html = renderEmail(base);

    expect(html).toContain('name="color-scheme" content="light"');
    expect(html).toMatch(/<body[^>]*background:#/);
  });

  it("survives a client that throws the style block away", () => {
    /*
      Gmail keeps `<style>`; several others do not. The one rule in it is the
      mobile media query, so a client that drops it must still get a readable
      two-column layout rather than a broken one — which is why every other
      style is inline.
    */
    const html = renderEmail({
      ...base,
      rows: [["Service", "Website"]],
      button: { label: "Open", href: "https://example.test" },
    });

    const withoutStyleBlock = html.replace(/<style>[\s\S]*?<\/style>/, "");

    expect(withoutStyleBlock).toContain("Website");
    expect(withoutStyleBlock).toContain("https://example.test");
    /* The layout is tables, so it still lays out with no CSS at all. */
    expect(withoutStyleBlock).toContain('role="presentation"');
  });

  it("has exactly one media query, and it is the one that stacks the rows", () => {
    const html = renderEmail({ ...base, rows: [["Service", "Website"]] });

    expect(html.match(/@media/g)).toHaveLength(1);
    expect(html).toContain("max-width:480px");
    /* The label and value carry the class that rule targets — without it the
       two columns squeeze on a phone, which is where most of these are read. */
    expect(html).toContain('class="stack"');
  });

  it("renders the button as a table cell, not a styled link", () => {
    /* Outlook ignores padding on inline elements, so an anchor alone renders as
       bare text. The padding has to sit on the cell. */
    const html = renderEmail({
      ...base,
      button: { label: "Open the tracker", href: "https://example.test/x" },
    });

    expect(html).toMatch(/<td[^>]*background:#[0-9a-f]+;border-radius:8px[^>]*>\s*<a/);
  });

  it("says who sent it", () => {
    const html = renderEmail(base);

    expect(html).toContain("Rahvian");
    expect(html).toContain("Rahvian Technologies Private Limited");
    expect(html).toContain("hello@rahvian.com");
    expect(html).toContain("Ranchi 834001");
  });

  it("leaves out every optional part that was not given", () => {
    /* An empty quoted box or a bare horizontal rule reads as a message somebody
       forgot to finish. */
    const html = renderEmail(base);

    expect(html).not.toContain('class="stack"');
    expect(html).not.toContain("<a href=\"https://example.test");
  });

  it("numbers the steps in the order they were given", () => {
    const html = renderEmail({
      ...base,
      steps: [
        { title: "We read it", body: "A person, not a robot." },
        { title: "You get an answer", body: "Within one working day." },
      ],
    });

    const first = html.indexOf("We read it");
    const second = html.indexOf("You get an answer");

    expect(first).toBeGreaterThan(-1);
    expect(second).toBeGreaterThan(first);
  });
});
