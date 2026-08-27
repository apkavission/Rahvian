import { readFile } from "node:fs/promises";
import { join } from "node:path";

/**
 * The shared Open Graph card.
 *
 * Rendered by Satori, not a browser. Satori implements a deliberate subset of
 * CSS: flexbox only, no grid, no cascade beyond inline styles, and every
 * element holding more than one child needs `display: flex` stated outright.
 * Layout that would be obvious in the app has to be spelled out here.
 *
 * The design is the dark end of the site's own palette rather than a separate
 * treatment, so a shared link and the page it opens look like the same
 * company.
 */

export const OG_SIZE = { width: 1200, height: 630 } as const;

const COLOR = {
  bg: "#07090c",
  surface: "#0e1218",
  border: "#232b36",
  text: "#e8edf4",
  textMuted: "#98a5b6",
  accent: "#2dd4bf",
} as const;

/**
 * The logo, inlined as a data URI.
 *
 * Satori has no network access and no notion of the public directory, so an
 * `/brand/logo-email.png` src would silently render nothing. Reading the file
 * and inlining it is the only reliable route.
 */
export async function readLogoDataUri(): Promise<string> {
  const file = await readFile(
    join(process.cwd(), "public", "brand", "logo-email.png"),
  );
  return `data:image/png;base64,${file.toString("base64")}`;
}

export interface OgCardProps {
  /** Small line above the title. The section the page belongs to. */
  eyebrow?: string;
  title: string;
  /** One sentence under the title. Trimmed rather than wrapped forever. */
  description?: string | null;
  /** Bottom-right label, usually the site's own domain. */
  footer?: string;
  logoDataUri: string;
}

export function OgCard({
  eyebrow,
  title,
  description,
  footer,
  logoDataUri,
}: OgCardProps) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        background: COLOR.bg,
        padding: "64px 72px",
        position: "relative",
      }}
    >
      {/*
        Accent wash. A radial gradient anchored off the bottom-right corner,
        matching the glow the site uses behind its closing section.
      */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          display: "flex",
          background: `radial-gradient(900px 520px at 88% 108%, ${COLOR.accent}26, transparent 70%)`,
        }}
      />

      {/* Accent rule along the top edge. */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: 6,
          display: "flex",
          background: COLOR.accent,
        }}
      />

      <div style={{ display: "flex", alignItems: "center" }}>
        {/* eslint-disable-next-line @next/next/no-img-element -- Satori renders
            plain <img>; next/image has no meaning in an ImageResponse. */}
        <img src={logoDataUri} width={168} height={103} alt="" />
      </div>

      <div style={{ display: "flex", flexDirection: "column" }}>
        {eyebrow ? (
          <div
            style={{
              display: "flex",
              fontSize: 22,
              letterSpacing: 4,
              textTransform: "uppercase",
              color: COLOR.accent,
              marginBottom: 20,
            }}
          >
            {eyebrow}
          </div>
        ) : null}

        <div
          style={{
            display: "flex",
            fontSize: title.length > 40 ? 60 : 72,
            lineHeight: 1.1,
            fontWeight: 700,
            color: COLOR.text,
            letterSpacing: -1.5,
          }}
        >
          {title}
        </div>

        {description ? (
          <div
            style={{
              display: "flex",
              marginTop: 24,
              fontSize: 28,
              lineHeight: 1.45,
              color: COLOR.textMuted,
              maxWidth: 900,
            }}
          >
            {truncate(description, 130)}
          </div>
        ) : null}
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderTop: `1px solid ${COLOR.border}`,
          paddingTop: 28,
        }}
      >
        <div style={{ display: "flex", fontSize: 24, color: COLOR.textMuted }}>
          Apka Saathi Private Limited
        </div>
        {footer ? (
          <div style={{ display: "flex", fontSize: 24, color: COLOR.accent }}>
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}

/** Satori will not reflow an overlong string, so it is cut before it renders. */
function truncate(value: string, max: number): string {
  const collapsed = value.replace(/\s+/g, " ").trim();
  if (collapsed.length <= max) return collapsed;
  return `${collapsed.slice(0, collapsed.lastIndexOf(" ", max - 1))}…`;
}
