"use client";

import { useEffect } from "react";

/**
 * Opens the browser's print dialogue as soon as the page is ready.
 *
 * ---------------------------------------------------------------------------
 * **Why this is the download.** "Save as PDF" lives inside that dialogue on
 * every browser on every platform, so a print route *is* a PDF download — and
 * one that needs no PDF library, produces real selectable text rather than an
 * image of text, and cannot render differently from the preview because it is
 * the same component.
 *
 * A PDF built in the browser by a library would be a second renderer to keep
 * in step with the first, and the estate has already learned what a second
 * copy of anything costs.
 *
 * ---------------------------------------------------------------------------
 * **It waits for the fonts.** `document.fonts.ready` resolves once the faces
 * the page asked for have loaded; printing before that captures the fallback
 * face, so a letterhead comes out in Arial having looked right on screen. The
 * wait is capped so a font that never arrives does not leave somebody staring
 * at a page with no dialogue on it.
 */
export function PrintOnLoad() {
  useEffect(() => {
    let printed = false;

    const print = () => {
      if (printed) return;
      printed = true;
      window.print();
    };

    const timer = window.setTimeout(print, 1500);

    document.fonts?.ready.then(() => {
      /* A frame, so the last layout pass has happened before the snapshot. */
      requestAnimationFrame(() => {
        window.clearTimeout(timer);
        print();
      });
    });

    return () => window.clearTimeout(timer);
  }, []);

  return null;
}
