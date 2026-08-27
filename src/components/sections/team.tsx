import { Reveal } from "@/components/motion/reveal";
import { Section, SectionHeading } from "@/components/sections/section";
import type { BackgroundVariant } from "@/components/sections/section";
import { MemberCard } from "@/components/team/member-card";
import { getTeamMembers } from "@/lib/queries/team";

export interface TeamContent {
  eyebrow?: string;
  heading: string;
  description?: string;
  background?: BackgroundVariant;
}

/**
 * The people who do the work.
 *
 * Renders nothing while `team_members` is empty. An About page with a "Meet
 * the team" heading over a blank grid says less than one without the section
 * at all, and the row that fills it is an admin action rather than a deploy.
 *
 * The card lives in `components/team/member-card` because the admin preview
 * renders the same one over drafts.
 */
export async function Team({ content }: { content: TeamContent }) {
  const members = await getTeamMembers();
  if (members.length === 0) return null;

  return (
    <Section background={content.background ?? "muted"}>
      <SectionHeading
        eyebrow={content.eyebrow}
        title={content.heading}
        description={content.description}
      />

      <ul className="reveal-group mt-12 grid auto-rows-fr gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {members.map((member) => (
          <Reveal key={member.id} as="li" className="h-full">
            <MemberCard member={member} />
          </Reveal>
        ))}
      </ul>
    </Section>
  );
}
