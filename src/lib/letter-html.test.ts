import { describe, expect, it } from "vitest";
import { cleanLetterHtml, estimateLines, letterPlainText } from "@/lib/letter-html";

describe("cleanLetterHtml", () => {
  it("keeps the things a letter is made of", () => {
    const html = cleanLetterHtml(
      "<p>Dear Sir,</p><p>Please find our <strong>revised</strong> quotation " +
        "<em>attached</em>.</p><ul><li>Scope</li><li>Timeline</li></ul>",
    );

    expect(html).toBe(
      "<p>Dear Sir,</p><p>Please find our <strong>revised</strong> quotation " +
        "<em>attached</em>.</p><ul><li>Scope</li><li>Timeline</li></ul>",
    );
  });

  it("keeps a table, because letters have them", () => {
    const html = cleanLetterHtml(
      '<table><tbody><tr><th colspan="2">Fees</th></tr><tr><td>Design</td><td>₹40,000</td></tr></tbody></table>',
    );

    expect(html).toContain("<table>");
    expect(html).toContain('<th colspan="2">');
    expect(html).toContain("₹40,000");
  });

  /* ------------------------------------------------------------- the paste */

  it("survives a paste out of Word", () => {
    /*
      This is what actually arrives on the clipboard: a class nobody defined,
      inline `mso-` styles, a namespaced empty tag, and a conditional comment
      wrapping more markup.
    */
    const word =
      '<!--[if gte mso 9]><xml><w:WordDocument/></xml><![endif]-->' +
      '<p class="MsoNormal" style="margin:0cm;mso-pagination:widow-orphan">' +
      '<span style=\'font-family:"Calibri",sans-serif\'>Dear Sir,</span><o:p></o:p></p>';

    const html = cleanLetterHtml(word);

    expect(html).toBe("<p>Dear Sir,</p>");
    expect(html).not.toContain("Mso");
    expect(html).not.toContain("mso-");
    expect(html).not.toContain("o:p");
    expect(html).not.toContain("style");
  });

  it("drops a tag it does not know and keeps the words inside it", () => {
    expect(cleanLetterHtml("<p><span class='x'>Kept</span></p>")).toBe("<p>Kept</p>");
    expect(cleanLetterHtml("<div><font size='7'>Kept</font></div>")).toBe("Kept");
  });

  it("drops a script and everything inside it", () => {
    /* The contents are the payload rather than the prose, so unlike a span
       this takes its children with it. */
    expect(cleanLetterHtml("<p>Before</p><script>alert(1)</script><p>After</p>")).toBe(
      "<p>Before</p><p>After</p>",
    );
    expect(cleanLetterHtml("<style>p{color:red}</style><p>Only this</p>")).toBe("<p>Only this</p>");
  });

  it("drops an unclosed script rather than leaving the rest of the paste", () => {
    /* A truncated paste can end mid-tag. A pattern that only matched a closed
       pair would keep the opening tag and everything after it. */
    expect(cleanLetterHtml("<p>Fine</p><script>alert(1)")).toBe("<p>Fine</p>");
  });

  /* ------------------------------------------------------- what cannot pass */

  it("keeps no attribute it did not write itself", () => {
    /*
      The safety property of this file: an allowed tag is re-emitted from
      scratch and the original attribute text is never copied. So this is not
      "onerror is filtered" — it is that nothing survives which was not rebuilt.
    */
    const html = cleanLetterHtml(
      '<p onclick="steal()" style="position:fixed" data-x="1" id="p">Text</p>',
    );

    expect(html).toBe("<p>Text</p>");
  });

  it("refuses a javascript: link and keeps the words", () => {
    const html = cleanLetterHtml('<p><a href="javascript:alert(1)">Click</a></p>');
    expect(html).toBe("<p>Click</p>");
    expect(html).not.toContain("javascript");
  });

  it("refuses a data: link", () => {
    const html = cleanLetterHtml('<p><a href="data:text/html,<script>x</script>">Click</a></p>');
    expect(html).not.toContain("data:");
  });

  it("allows the four schemes a letter actually links to", () => {
    for (const href of [
      "https://rahvian.com",
      "http://rahvian.com",
      "mailto:hello@rahvian.com",
      "tel:+919000000000",
    ]) {
      expect(cleanLetterHtml(`<a href="${href}">x</a>`), href).toContain(`href="${href}"`);
    }
  });

  it("adds rel to every link it keeps", () => {
    expect(cleanLetterHtml('<a href="https://rahvian.com">x</a>')).toContain(
      'rel="noopener noreferrer"',
    );
  });

  it("refuses a colspan that is not a small number", () => {
    /* A colspan of 90,000 pasted out of a spreadsheet renders a table wider
       than the page. */
    expect(cleanLetterHtml('<td colspan="90000">x</td>')).toBe("<td>x</td>");
    expect(cleanLetterHtml('<td colspan="x">y</td>')).toBe("<td>y</td>");
    expect(cleanLetterHtml('<td colspan="3">z</td>')).toBe('<td colspan="3">z</td>');
  });

  it("does not give a void tag a closing tag", () => {
    expect(cleanLetterHtml("<p>One<br>Two</p>")).toBe("<p>One<br>Two</p>");
    expect(cleanLetterHtml("<p>One<br/>Two</p>")).toBe("<p>One<br>Two</p>");
  });

  /* ------------------------------------------------------------ the empties */

  it("treats an editor's leftover empty paragraph as nothing", () => {
    /* Every contenteditable leaves `<p><br></p>` behind when somebody selects
       all and deletes. A letter that is "empty but not blank" would print a
       mysterious gap and count as written. */
    expect(cleanLetterHtml("<p><br></p>")).toBe("");
    expect(cleanLetterHtml("<p>&nbsp;</p>")).toBe("");
    expect(cleanLetterHtml("   ")).toBe("");
    expect(cleanLetterHtml("<div><span></span></div>")).toBe("");
  });

  it("copes with something that is not a string", () => {
    expect(cleanLetterHtml(undefined as unknown as string)).toBe("");
    expect(cleanLetterHtml(null as unknown as string)).toBe("");
  });
});

describe("letterPlainText", () => {
  it("turns blocks into line breaks rather than running words together", () => {
    expect(letterPlainText("<p>Dear Sir,</p><p>Thank you.</p>")).toBe("Dear Sir,\nThank you.");
  });

  it("unescapes what the editor escaped", () => {
    expect(letterPlainText("<p>Terms &amp; conditions</p>")).toBe("Terms & conditions");
  });
});

describe("estimateLines", () => {
  it("counts a short letter as short", () => {
    expect(estimateLines("<p>Dear Sir,</p><p>Thank you.</p>")).toBe(2);
  });

  it("counts a long paragraph as more than one line", () => {
    const long = "<p>" + "word ".repeat(60) + "</p>";
    expect(estimateLines(long)).toBeGreaterThan(2);
  });

  it("gives an empty body no lines to speak of", () => {
    expect(estimateLines("")).toBeLessThanOrEqual(1);
  });
});
