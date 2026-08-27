import { Github, Linkedin } from "lucide-react";
import { FramedImage } from "@/components/media/image";
import type { TeamMember } from "@/lib/queries/team";

/**
 * One person, as a card.
 *
 * The card without the list item around it, for the same reason the pricing
 * card is: the public section wraps it in a `Reveal`, and the admin preview
 * wraps it in something that can say "not published yet". Both render this,
 * so the preview is the page rather than a drawing of it.
 */
export function MemberCard({ member }: { member: TeamMember }) {
  return (
    <article className="surface-raised flex h-full flex-col rounded-2xl border border-border p-6">
      {member.photo && (
        /*
          A circle, so the file has to be square — the field asks for 400 × 400
          and the picker warns when it is not. `FramedImage` keeps it square,
          contains rather than crops, and never enlarges a small photograph into
          a soft one.
        */
        <FramedImage
          image={member.photo}
          className="mb-5 size-20 shrink-0 rounded-full"
        />
      )}

      <h3 className="font-display text-lg font-semibold">{member.name}</h3>
      <p className="mt-1 font-mono text-xs uppercase tracking-[0.14em] text-accent">
        {member.role}
      </p>

      {member.bio && (
        <p className="mt-4 flex-1 text-sm leading-relaxed text-text-muted">{member.bio}</p>
      )}

      {member.skills.length > 0 && (
        <ul className="mt-5 flex flex-wrap gap-1.5">
          {member.skills.map((skill) => (
            <li
              key={skill}
              className="rounded-md border border-border bg-surface px-2 py-1 text-xs text-text-muted"
            >
              {skill}
            </li>
          ))}
        </ul>
      )}

      {(member.linkedin_url || member.github_url) && (
        <div className="mt-5 flex gap-3 border-t border-border pt-5">
          {member.linkedin_url && (
            <ProfileLink href={member.linkedin_url} label={`${member.name} on LinkedIn`}>
              <Linkedin className="size-4" aria-hidden />
            </ProfileLink>
          )}
          {member.github_url && (
            <ProfileLink href={member.github_url} label={`${member.name} on GitHub`}>
              <Github className="size-4" aria-hidden />
            </ProfileLink>
          )}
        </div>
      )}
    </article>
  );
}

function ProfileLink({
  href,
  label,
  children,
}: {
  href: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      className="text-text-subtle transition-colors hover:text-accent"
    >
      {children}
    </a>
  );
}
