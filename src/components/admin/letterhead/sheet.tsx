import { MARGIN, PAGE, type LayoutKey, type LetterheadCompany } from "@/lib/letterhead";
import {
  joinFields,
  resolveFields,
  type LetterheadField,
  type ResolvedField,
} from "@/lib/letterhead-fields";

/**
 * One sheet of company paper, at its real size.
 *
 * ---------------------------------------------------------------------------
 * **Every measurement is in millimetres**, because the output of this component
 * is paper. A letterhead laid out in pixels prints at whatever size the browser
 * decided a pixel was, which is how a design that looked right on screen comes
 * out of the printer with the footer half an inch off the page.
 *
 * ---------------------------------------------------------------------------
 * **No hooks and no client directive**, so the same component draws the
 * preview inside the panel and the page that actually prints. Two components
 * would drift, and the one that drifted would be the printed one — which is the
 * one somebody signs.
 *
 * ---------------------------------------------------------------------------
 * **Its own `<style>` rather than Tailwind classes, and that is deliberate.**
 * This is a print stylesheet: `@page`, millimetre lengths, and
 * `print-color-adjust` so a coloured band survives a printer's "save ink"
 * default. Tailwind has no `@page`, and expressing 18mm as an arbitrary value
 * in thirty places would make the one number that matters — the margin a
 * printer can honour — impossible to find.
 */

export interface SheetLetter {
  recipient: string;
  reference: string;
  letterDate: string | null;
  subject: string;
  salutation: string;
  bodyHtml: string;
  signatoryName: string;
  signatoryRole: string;
}

export interface SheetOptions {
  layout: LayoutKey;
  accent: string;
  logoScale: number;
  footerNote: string;
  /**
   * The blocks, in order.
   *
   * Every one of them is resolved through `resolveFields()`, which is where
   * the rule lives: a block with nothing in it is not drawn, and the block
   * after it closes the gap.
   */
  fields: LetterheadField[];
}

/**
 * One block of the letterhead, drawn.
 *
 * It is only ever reached for a block that has something in it — `resolveFields()`
 * has already dropped the empty ones — so there is no "if there is a value"
 * branch here. That is the point of resolving first: the rule is in one place
 * and the drawing cannot forget it.
 */
function Block({ field }: { field: ResolvedField }) {
  return (
    <div>
      {field.showLabel && <span className="lh-field-label">{field.label}: </span>}
      {field.lines.map((line, index) => (
        <span key={line + index}>
          {index > 0 && <br />}
          {line}
        </span>
      ))}
    </div>
  );
}

/** The date as a letter writes it: 11 September 2026. */
function formatDate(value: string | null): string {
  if (!value) return "";
  const date = new Date(value + "T00:00:00");
  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
}

export function LetterheadSheet({
  company,
  options,
  letter,
  /** Drawn as a blank sheet — the stationery on its own, with no letter on it. */
  blank = false,
}: {
  company: LetterheadCompany;
  options: SheetOptions;
  letter?: SheetLetter;
  blank?: boolean;
}) {
  const band = options.layout === "band";

  const headerFields = resolveFields(company, options.fields, "header", { hasBand: band });
  const bandFields = resolveFields(company, options.fields, "band", { hasBand: band });
  const footerFields = resolveFields(company, options.fields, "footer", { hasBand: band });
  const statutory = joinFields(footerFields);
  /* `centred` needs no variable: the layout is on the sheet as a data
     attribute and the stylesheet reads it. `minimal` changes two lengths that
     the stylesheet interpolates, so it does. */
  const minimal = options.layout === "minimal";

  /* The band takes its width out of the page, so the body's left edge moves. */
  const bandWidth = 42;
  const bodyLeft = band ? bandWidth + 12 : MARGIN.side;

  return (
    <div className="lh-sheet" data-layout={options.layout}>
      <style>{`
        /*
          A4 with no printer margin of its own: the margins are drawn inside
          the sheet, so what is on screen is what comes out. A printer margin
          on top of the design's own is how a letterhead loses 10mm.
        */
        @page { size: A4; margin: 0; }

        .lh-sheet {
          --lh-accent: ${options.accent};
          --lh-ink: #14181d;
          --lh-quiet: #55606c;
          --lh-rule: #d7dde3;

          position: relative;
          box-sizing: border-box;
          width: ${PAGE.width}mm;
          min-height: ${PAGE.height}mm;
          background: #ffffff;
          color: var(--lh-ink);
          font-family: "Inter", "Segoe UI", system-ui, sans-serif;
          font-size: 10.5pt;
          line-height: 1.55;
          overflow: hidden;
          /* A coloured band is information here, not decoration, so it must
             survive a printer's ink-saving default. */
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }

        .lh-sheet * { box-sizing: border-box; }

        /* ------------------------------------------------------- the band */

        .lh-band {
          position: absolute;
          top: 0; left: 0; bottom: 0;
          width: ${bandWidth}mm;
          background: var(--lh-accent);
          color: #ffffff;
          padding: ${MARGIN.side}mm 6mm 18mm 8mm;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }
        .lh-band .lh-band-contact { font-size: 8pt; line-height: 1.5; word-break: break-word; }
        .lh-band .lh-band-contact div { margin-bottom: 2mm; }

        /* ----------------------------------------------------- the header */

        .lh-head {
          position: absolute;
          top: ${band ? MARGIN.side : 14}mm;
          left: ${bodyLeft}mm;
          right: ${MARGIN.side}mm;
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 10mm;
        }
        .lh-sheet[data-layout="centred"] .lh-head {
          flex-direction: column;
          align-items: center;
          text-align: center;
          gap: 3mm;
        }

        .lh-mark { display: flex; align-items: center; gap: 4mm; }
        .lh-mark img { height: ${(options.logoScale / 100) * 16}mm; width: auto; }
        .lh-name {
          font-size: ${minimal ? 13 : 17}pt;
          font-weight: 700;
          letter-spacing: -0.01em;
          line-height: 1.1;
        }
        .lh-tagline { font-size: 8pt; color: var(--lh-quiet); margin-top: 1mm; }

        .lh-contact { font-size: 8.5pt; color: var(--lh-quiet); text-align: right; line-height: 1.6; }
        .lh-contact > div { margin-bottom: 0.6mm; }
        /* A label is quieter than the value it introduces, so the eye reaches
           the number rather than the word "Phone". */
        .lh-field-label { opacity: 0.72; }
        .lh-sheet[data-layout="centred"] .lh-contact { text-align: center; }

        /* The rule under the header. Two weights: the accent carries the
           brand, the grey stops it shouting. */
        .lh-rule {
          position: absolute;
          left: ${bodyLeft}mm;
          right: ${MARGIN.side}mm;
          top: ${band ? 34 : minimal ? 30 : 36}mm;
          height: 0.8mm;
          background: var(--lh-accent);
        }
        .lh-rule::after {
          content: "";
          position: absolute;
          left: 0; right: 0; top: 0.8mm;
          height: 0.2mm;
          background: var(--lh-rule);
        }

        /* ------------------------------------------------------- the body */

        .lh-body {
          position: absolute;
          left: ${bodyLeft}mm;
          right: ${MARGIN.side}mm;
          top: ${MARGIN.bodyTop}mm;
          bottom: ${MARGIN.bottom}mm;
        }

        .lh-meta { display: flex; justify-content: space-between; gap: 8mm; font-size: 9.5pt; color: var(--lh-quiet); }
        .lh-recipient { margin-top: 8mm; white-space: pre-line; font-size: 10pt; }
        .lh-subject { margin-top: 7mm; font-weight: 700; }
        .lh-salutation { margin-top: 6mm; }

        .lh-content { margin-top: 4mm; }
        .lh-content p { margin: 0 0 3.5mm; }
        .lh-content h2 { font-size: 12pt; margin: 6mm 0 2mm; }
        .lh-content h3 { font-size: 11pt; margin: 5mm 0 2mm; }
        .lh-content h4 { font-size: 10.5pt; margin: 4mm 0 2mm; }
        .lh-content ul, .lh-content ol { margin: 0 0 3.5mm; padding-left: 7mm; }
        .lh-content li { margin-bottom: 1.5mm; }
        .lh-content blockquote {
          margin: 0 0 3.5mm;
          padding-left: 5mm;
          border-left: 0.6mm solid var(--lh-accent);
          color: var(--lh-quiet);
        }
        .lh-content a { color: var(--lh-accent); text-decoration: underline; }
        .lh-content hr { border: 0; border-top: 0.2mm solid var(--lh-rule); margin: 5mm 0; }
        .lh-content table { width: 100%; border-collapse: collapse; margin: 0 0 4mm; font-size: 9.5pt; }
        .lh-content th, .lh-content td {
          border: 0.2mm solid var(--lh-rule);
          padding: 1.6mm 2.4mm;
          text-align: left;
          vertical-align: top;
        }
        .lh-content th { background: #f3f5f7; font-weight: 600; }

        .lh-sign { margin-top: 12mm; }
        /* The gap a signature goes in. 18mm is enough for a real one and
           small enough not to push a short letter onto two pages. */
        .lh-sign-space { height: 18mm; }
        .lh-sign-name { font-weight: 600; }
        .lh-sign-role { font-size: 9pt; color: var(--lh-quiet); }

        /* ----------------------------------------------------- the footer */

        .lh-foot {
          position: absolute;
          left: ${band ? bandWidth + 12 : MARGIN.side}mm;
          right: ${MARGIN.side}mm;
          bottom: 8mm;
          padding-top: 2.5mm;
          border-top: 0.2mm solid var(--lh-rule);
          font-size: 7.5pt;
          line-height: 1.45;
          color: var(--lh-quiet);
          text-align: center;
        }
        .lh-foot-note { margin-top: 1mm; }

        /* The blank sheet's guide, which is on screen and never on paper. */
        .lh-guide {
          position: absolute;
          left: ${bodyLeft}mm;
          right: ${MARGIN.side}mm;
          top: ${MARGIN.bodyTop}mm;
          bottom: ${MARGIN.bottom}mm;
          border: 0.3mm dashed #c9d2da;
          color: #9aa6b2;
          font-size: 8pt;
          padding: 2mm;
        }
        @media print { .lh-guide { display: none; } }
      `}</style>

      {band && (
        <div className="lh-band">
          <div />
          <div className="lh-band-contact">
            {bandFields.map((field) => (
              <Block key={field.id} field={field} />
            ))}
          </div>
        </div>
      )}

      <div className="lh-head">
        <div className="lh-mark">
          {company.logo.light && (
            /* A plain `<img>`: this markup is serialised into a downloadable
               file and printed, and `next/image` needs the optimiser at the
               other end of both. */
            // eslint-disable-next-line @next/next/no-img-element
            <img src={company.logo.light} alt="" />
          )}
          {/*
            The name is printed only when there is no mark.

            The mark carries the company on paper as it does on screen, and a
            letterhead that prints both reads as a logo with its own name typed
            beside it. The legal name is on the statutory line at the foot
            regardless, so nothing required is lost by leaving it out here.
          */}
          {!company.logo.light && !company.logo.dark && (
            <div>
              <div className="lh-name">{company.companyName}</div>
            </div>
          )}
        </div>

        {headerFields.length > 0 && (
          <div className="lh-contact">
            {headerFields.map((field) => (
              <Block key={field.id} field={field} />
            ))}
          </div>
        )}
      </div>

      <div className="lh-rule" />

      {blank || !letter ? (
        <div className="lh-guide">The letter goes here.</div>
      ) : (
        <div className="lh-body">
          <div className="lh-meta">
            <span>{letter.reference}</span>
            <span>{formatDate(letter.letterDate)}</span>
          </div>

          {letter.recipient && <div className="lh-recipient">{letter.recipient}</div>}
          {letter.subject && <div className="lh-subject">{letter.subject}</div>}
          {letter.salutation && <div className="lh-salutation">{letter.salutation}</div>}

          {/*
            The body is stored HTML and is written straight in.

            It has been through `cleanLetterHtml()` on the way into the
            database — allowed tags only, every attribute rebuilt rather than
            copied — which is what makes this line safe. Sanitising here
            instead would mean trusting that every future writer remembered to
            do it; sanitising at the boundary means the column cannot hold
            anything else.
          */}
          <div
            className="lh-content"
            dangerouslySetInnerHTML={{ __html: letter.bodyHtml }}
          />

          {(letter.signatoryName || letter.signatoryRole) && (
            <div className="lh-sign">
              <div>Yours faithfully,</div>
              <div className="lh-sign-space" />
              {letter.signatoryName && <div className="lh-sign-name">{letter.signatoryName}</div>}
              {letter.signatoryRole && <div className="lh-sign-role">{letter.signatoryRole}</div>}
              <div className="lh-sign-role">{company.legalName}</div>
            </div>
          )}
        </div>
      )}

      <div className="lh-foot">
        <div>{statutory}</div>
        {options.footerNote && <div className="lh-foot-note">{options.footerNote}</div>}
      </div>
    </div>
  );
}

/**
 * The sheet at a size that fits on a screen.
 *
 * `transform: scale()` rather than smaller millimetres, so what is being looked
 * at is the same element that prints — every measurement inside it stays in the
 * units the printer uses, and the preview cannot be subtly different from the
 * page.
 */
export function SheetPreview({
  scale = 0.62,
  children,
}: {
  scale?: number;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        width: `${PAGE.width * scale}mm`,
        height: `${PAGE.height * scale}mm`,
        overflow: "hidden",
        borderRadius: "6px",
        boxShadow: "0 1px 2px rgb(0 0 0 / 0.12), 0 18px 40px -18px rgb(0 0 0 / 0.35)",
        flexShrink: 0,
      }}
    >
      <div style={{ transform: `scale(${scale})`, transformOrigin: "top left" }}>{children}</div>
    </div>
  );
}
