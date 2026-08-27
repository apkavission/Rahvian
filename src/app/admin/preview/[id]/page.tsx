import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { SectionRenderer } from "@/components/sections/renderer";
import { requireStaff } from "@/lib/auth/session";
import { getAdminPage } from "@/lib/queries/pages-admin";

export const metadata: Metadata = {
  title: "Preview",
  robots: { index: false, follow: false, nocache: true },
};

/**
 * The page as it will look, including what is not published yet.
 *
 * Deliberately the real thing: it renders through the same `SectionRenderer`
 * the public route uses, so what appears here is what a visitor gets rather
 * than a second implementation that can drift from it. A preview that is only
 * approximately the page is worse than none, because it is trusted.
 *
 * Two differences from the public route, both necessary:
 *
 *   Draft pages render. That is the whole point — a page nobody can see yet is
 *   exactly the one that needs looking at.
 *
 *   Hidden sections render, marked. An editor turning one off wants to see
 *   what the page looks like without it *and* be able to find it again.
 *
 * It sits outside the `(dashboard)` group so the admin chrome does not wrap
 * it: this is loaded in an iframe beside the editor, and a sidebar inside a
 * preview pane is a sidebar twice.
 */
export default async function PreviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  // The admin layout does not wrap this route, so it establishes the session
  // for itself. A preview of an unpublished page is not public content.
  await requireStaff();

  const { id } = await params;
  const result = await getAdminPage(id);

  if (!result) notFound();

  const active = result.sections.filter((section) => section.is_active);
  const hidden = result.sections.length - active.length;

  return (
    <div className="min-h-dvh bg-bg">
      <div className="border-b border-border bg-surface-2 px-4 py-2">
        <p className="font-mono text-[0.65rem] uppercase tracking-[0.14em] text-text-subtle">
          Preview · {result.page.title} · {result.page.status}
          {hidden > 0 ? ` · ${hidden} hidden ${hidden === 1 ? "section" : "sections"}` : ""}
        </p>
      </div>

      {active.length > 0 ? (
        <SectionRenderer
          sections={active.map((section) => ({
            id: section.id,
            type: section.type,
            content: section.content,
            background: section.background_variant,
          }))}
        />
      ) : (
        <div className="container-page py-20">
          <p className="text-sm text-text-muted">
            Nothing is showing on this page yet. Add a section, or turn one on.
          </p>
        </div>
      )}
    </div>
  );
}
