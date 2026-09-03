import type { Metadata } from "next";
import Link from "next/link";
import { requireMenu } from "@/lib/auth/session";
import { emailSamples } from "@/lib/email/samples";
import { newSeed } from "@/lib/studio/seed";
import { BannerStudio } from "./banner-studio";
import { EmailPreview } from "./email-preview";
import { LogoStudio } from "./logo-studio";

export const metadata: Metadata = {
  title: "Logo & banners",
  robots: { index: false, follow: false, nocache: true },
};

/**
 * A logo and a banner, made here rather than commissioned.
 *
 * ---------------------------------------------------------------------------
 * **What this is for.** A demo is built for a prospect in an afternoon, and it
 * needs a mark on it by the end of that afternoon. Waiting on a designer for
 * something that will be thrown away if the prospect says no is how demos end
 * up shipping with placeholder text where a logo should be — which is the one
 * thing a prospect definitely notices.
 *
 * ---------------------------------------------------------------------------
 * **Everything happens in the browser.** Nothing typed here is saved, sent, or
 * seen by anybody: the designs are drawn in the page, and the download is the
 * same drawing serialised. There is no upload, no service, and nothing to leak
 * — which is why a business name for a prospect we have not signed yet can
 * safely be typed into it.
 *
 * ---------------------------------------------------------------------------
 * **Why this screen has its own menu key.**
 *
 * `requireMenu("studio")` is the guard, and `studio` is in no role's default
 * menu — so an Admin does not reach it by being an Admin. It is handed to a
 * named person on the Users screen. That was the instruction, and the reason
 * behind it is sound: making the company's marks is a job somebody holds, not
 * a rank somebody has.
 */
export default async function StudioPage({
  searchParams,
}: {
  searchParams: Promise<{ tool?: string }>;
}) {
  await requireMenu("studio");

  const { tool } = await searchParams;
  const making = tool === "banner" ? "banner" : tool === "email" ? "email" : "logo";

  /*
    Built on the server, because the email builders are server-only: they read
    the editable copy out of the database and resolve the configured logo. Only
    fetched for the tab that shows them — the other two tools have no reason to
    pay for it.
  */
  const samples = making === "email" ? await emailSamples() : [];

  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-display text-2xl font-semibold tracking-tight">
          Logo &amp; banners
        </h1>
        <p className="measure mt-2 text-sm text-text-muted">
          {making === "email"
            ? "Every email this website sends, built by the code that sends it, at the widths people read them on. Nothing here sends anything."
            : "Type a name, choose a design and a colour, and take the files. Nothing you type here is saved or sent anywhere — it is drawn in this page, and the download is that same drawing."}
        </p>
      </header>

      {/* Links rather than tabs in state: which tool you are in is an address,
          so it survives a refresh and can be sent to somebody. */}
      <nav aria-label="Which tool" className="flex gap-2">
        <Tool href="/admin/studio" active={making === "logo"}>
          Logo
        </Tool>
        <Tool href="/admin/studio?tool=banner" active={making === "banner"}>
          Banner
        </Tool>
        <Tool href="/admin/studio?tool=email" active={making === "email"}>
          Emails
        </Tool>
      </nav>

      {making === "logo" && <LogoStudio initialSeed={newSeed()} />}
      {making === "banner" && <BannerStudio initialAccent="#2563eb" />}
      {making === "email" && <EmailPreview samples={samples} />}
    </div>
  );
}

function Tool({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={
        active
          ? "rounded-full bg-accent px-4 py-1.5 text-sm font-medium text-accent-fg"
          : "rounded-full border border-border px-4 py-1.5 text-sm transition-colors hover:bg-surface-2"
      }
    >
      {children}
    </Link>
  );
}
