import { LEAD_STATUS_LABEL, type LeadStatus } from "@/lib/validation/leads";
import { cn } from "@/lib/utils";

/**
 * How each stage of the pipeline is coloured.
 *
 * Only the three that carry a decision get a colour: an untouched enquiry, a
 * won deal, a lost one. Everything in between is neutral, because colouring
 * all seven turns the list into a chart nobody can read at a glance and makes
 * the one that needs a reply today no easier to find.
 *
 * Every value is a token pair, so the badge is correct in both themes without
 * a second set of styles.
 */
const TONE: Record<LeadStatus, string> = {
  new: "bg-accent-soft text-accent",
  contacted: "bg-surface-3 text-text-muted",
  qualified: "bg-surface-3 text-text-muted",
  proposal_sent: "bg-surface-3 text-text-muted",
  negotiation: "bg-surface-3 text-text-muted",
  won: "bg-success-soft text-success",
  lost: "bg-surface-3 text-text-subtle",
};

export function StatusBadge({
  status,
  className,
}: {
  status: LeadStatus;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-full px-2.5 py-1",
        "font-mono text-[0.65rem] uppercase tracking-[0.12em]",
        TONE[status],
        className,
      )}
    >
      {LEAD_STATUS_LABEL[status]}
    </span>
  );
}
