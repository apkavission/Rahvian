import type { Metadata } from "next";
import { ExternalLink } from "lucide-react";
import { PreviewPane } from "@/components/admin/preview-pane";
import { requireMenu } from "@/lib/auth/session";
import { getMediaOptions } from "@/lib/queries/media-admin";
import { getAdminTeamMember, getAdminTeamMembers } from "@/lib/queries/team-admin";
import { memberToValues } from "@/lib/records/team";
import { MemberEditor } from "./member-editor";
import { MemberList } from "./member-list";
import { NewMemberForm } from "./new-member-form";

export const metadata: Metadata = {
  title: "Team",
  robots: { index: false, follow: false, nocache: true },
};

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/**
 * The team screen.
 *
 * The same three columns as every other content list, from the same
 * components. What is written here is the queries and the words.
 *
 * The preview shows the whole grid rather than one card, for the same reason
 * pricing does: a team grid is read as a group, the order is read as seniority
 * whether or not it was meant that way, and one card in isolation shows none of
 * that.
 */
export default async function TeamScreen({ searchParams }: Props) {
  await requireMenu("team");

  const query = await searchParams;
  const requested = typeof query.member === "string" ? query.member : null;

  const [members, assets] = await Promise.all([getAdminTeamMembers(), getMediaOptions()]);

  const selectedId =
    members.find((member) => member.id === requested)?.id ?? members[0]?.id ?? null;

  // Read in full only once one is selected — the list carries the columns it
  // needs, and the form needs all of them for exactly one row.
  const selected = selectedId ? await getAdminTeamMember(selectedId) : null;

  const published = members.filter((member) => member.status === "published").length;

  return (
    <div className="mx-auto w-full max-w-7xl">
      <header className="flex flex-wrap items-start justify-between gap-6">
        <div>
          <h1 className="font-display text-2xl font-semibold">Team</h1>
          <p className="measure mt-2 text-sm leading-relaxed text-text-muted">
            The people on the About page. While nobody is published the section
            is left out of the page entirely rather than shown as an empty grid,
            so the page is correct both before and after anyone is listed here.
          </p>
        </div>

        {published > 0 && (
          <a
            href="/about"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg border border-border-strong bg-surface px-4 py-2.5 text-sm font-medium transition-colors hover:bg-surface-2"
          >
            View on the site
            <ExternalLink className="size-4" aria-hidden />
          </a>
        )}
      </header>

      <div className="mt-10 grid gap-8 xl:grid-cols-[17rem_minmax(0,1fr)_minmax(0,1fr)]">
        <div className="xl:sticky xl:top-24 xl:self-start">
          <h2 className="font-mono text-[0.65rem] uppercase tracking-[0.16em] text-text-subtle">
            In the order shown
          </h2>
          <div className="mt-3">
            <MemberList
              members={members.map((member) => ({
                id: member.id,
                name: member.name,
                role: member.role,
                status: member.status,
              }))}
              selectedId={selectedId}
            />
            <NewMemberForm />
          </div>
        </div>

        <div className="min-w-0">
          {selected ? (
            <>
              <div className="surface-raised rounded-2xl border border-border p-6">
                {/*
                  Keyed on the person, so selecting another one remounts the
                  form. Without it React would reuse the component and keep the
                  first person's words in state — the editor would show one
                  biography under another's name.
                */}
                <MemberEditor
                  key={selected.id}
                  id={selected.id}
                  values={memberToValues(selected)}
                  assets={assets}
                />
              </div>
            </>
          ) : (
            <div className="rounded-2xl border border-dashed border-border bg-surface-2/40 p-8">
              <h2 className="font-display text-lg font-semibold">Nobody listed yet</h2>
              <p className="measure mt-3 text-sm leading-relaxed text-text-muted">
                Add someone on the left and they will open here. New profiles
                start as drafts, so nothing half-written reaches the site.
              </p>
            </div>
          )}
        </div>

        {/*
          The preview, beside the form rather than behind a link.

          Three columns from `xl` up and stacked below it: at 1280 the form and
          a readable grid do not both fit, and cards squeezed into 300px tell
          you nothing about how the grid reads.
        */}
        <div className="min-w-0 xl:sticky xl:top-24 xl:self-start">
          <PreviewPane
            path={`/admin/preview/team${selectedId ? `?member=${selectedId}` : ""}`}
            note="The whole grid, drafts included. Unpublished cards are marked; a visitor sees only the published ones."
          />
        </div>
      </div>
    </div>
  );
}
