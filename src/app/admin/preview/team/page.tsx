import type { Metadata } from "next";
import { requireMenu } from "@/lib/auth/session";
import { getAdminTeamCards } from "@/lib/queries/team-admin";
import { MemberCard } from "@/components/team/member-card";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Team preview",
  robots: { index: false, follow: false, nocache: true },
};

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/**
 * The team grid as it will look, including who is not published yet.
 *
 * The whole grid rather than one card, because a team is read as a group: the
 * order is taken as seniority whether or not it was meant that way, and a card
 * with three skill tags looks sparse only next to one with eight.
 *
 * The same `MemberCard` the About page renders, over rows read uncached as the
 * signed-in user — which is what makes a draft visible at all.
 *
 * It sits outside the `(dashboard)` group so the admin chrome does not wrap it.
 */
export default async function TeamPreview({ searchParams }: Props) {
  await requireMenu("team");

  const query = await searchParams;
  const selectedId = typeof query.member === "string" ? query.member : null;

  const members = await getAdminTeamCards();
  const live = members.filter((member) => member.status === "published").length;

  return (
    <div className="min-h-dvh bg-bg">
      <div className="border-b border-border bg-surface-2 px-4 py-2">
        <p className="font-mono text-[0.65rem] uppercase tracking-[0.14em] text-text-subtle">
          Preview · {members.length} {members.length === 1 ? "person" : "people"} · {live} on
          the site
        </p>
      </div>

      {members.length > 0 ? (
        <div className="px-4 py-10 sm:px-6 lg:px-8">
          <ul className="mx-auto grid max-w-6xl auto-rows-fr gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {members.map((member) => {
              const unpublished = member.status !== "published";

              return (
                <li
                  key={member.id}
                  className={cn(
                    "relative h-full rounded-2xl",
                    selectedRing(member.id === selectedId),
                    unpublished && "opacity-60",
                  )}
                >
                  {unpublished && (
                    <span className="absolute -top-2.5 right-4 z-10 inline-flex items-center rounded-full border border-border-strong bg-surface px-2.5 py-0.5 font-mono text-[0.6rem] uppercase tracking-[0.14em] text-text-subtle">
                      {member.status} · not on the site
                    </span>
                  )}
                  <MemberCard member={member} />
                </li>
              );
            })}
          </ul>
        </div>
      ) : (
        <div className="px-6 py-16">
          <p className="mx-auto max-w-md text-center text-sm leading-relaxed text-text-muted">
            Nobody is listed. The About page leaves the team section out
            entirely rather than showing an empty grid, so there is nothing to
            preview yet.
          </p>
        </div>
      )}
    </div>
  );
}

/**
 * The outline on the card being edited.
 *
 * Offset, so the ring sits outside the card's own border rather than replacing
 * it — the border is part of what is being checked.
 */
function selectedRing(selected: boolean) {
  return selected ? "ring-2 ring-ring ring-offset-4 ring-offset-bg" : undefined;
}
