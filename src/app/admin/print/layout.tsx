import type { Metadata } from "next";

export const metadata: Metadata = {
  robots: { index: false, follow: false, nocache: true },
};

/**
 * A page with nothing on it but the sheet.
 *
 * ---------------------------------------------------------------------------
 * **Why these routes sit outside `(dashboard)` rather than printing from
 * inside the panel.** The panel has a fixed sidebar, a sticky header and a
 * scroll container. Printing that means a stylesheet that hides all of it —
 * and every `@media print` rule of that kind is a guess about markup somebody
 * will change later, which fails silently, on paper, in front of whoever the
 * letter was sent to.
 *
 * A route with no shell has nothing to hide. What it renders is the sheet, so
 * what comes out of the printer is the sheet.
 *
 * The grey ground is for the screen — the moment before the dialogue opens, and
 * the person who dismisses it and wants to look. `@media print` drops it, and
 * a printer would ignore it anyway.
 */
export default function PrintLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="print-shell">
      <style>{`
        .print-shell {
          min-height: 100dvh;
          display: flex;
          justify-content: center;
          padding: 24px 12px;
          background: #e9edf1;
        }
        @media print {
          .print-shell { padding: 0; background: #ffffff; display: block; }
        }
      `}</style>
      {children}
    </div>
  );
}
