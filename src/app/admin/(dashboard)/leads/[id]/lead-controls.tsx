"use client";

import { useActionState, useId, useRef, useState } from "react";
import { Archive, ArchiveRestore, Ban, ShieldCheck } from "lucide-react";
import { useBusyWhile } from "@/components/forms/use-busy-while";
import { useFormToast } from "@/components/forms/use-form-toast";
import { FIELD, LABEL } from "@/components/ui/field";
import { archiveLead, assignLead, markLeadSpam, updateLeadStatus } from "@/lib/actions/leads";
import {
  initialLeadActionState,
  LEAD_STATUSES,
  type LeadActionState,
  type LeadStatus,
} from "@/lib/validation/leads";
import type { StaffOption } from "@/lib/queries/leads";
import { cn } from "@/lib/utils";

/**
 * The value a control shows: the server's, held optimistically.
 *
 * Both selects have to be controlled. React resets an uncontrolled field after
 * a `<form action>` completes, so a select left uncontrolled snaps back to the
 * value it had before the change — the database is correct and the screen says
 * otherwise, which reads as the save having failed. Found by changing a status
 * and watching the select revert while the history below it recorded the move.
 *
 * Two adjustments, both made during render rather than in an effect, which is
 * the pattern React prescribes for state derived from props:
 *
 *   The server's value wins whenever it changes — after a successful save, and
 *   after any other refresh of the page.
 *
 *   A refused save reverts to it. The write never happened, so the control
 *   must not go on showing what was asked for.
 */
function useServerValue<T>(serverValue: T, state: LeadActionState) {
  const [value, setValue] = useState(serverValue);

  // The previous values are held in state rather than in refs. A ref must not
  // be read during render — it is not tracked, so React cannot know the render
  // depended on it — and the comparison below happens during render by design.
  const [lastServer, setLastServer] = useState(serverValue);
  const [lastState, setLastState] = useState(state);

  if (lastServer !== serverValue) {
    setLastServer(serverValue);
    setValue(serverValue);
  }

  if (lastState !== state) {
    setLastState(state);
    if (state.status === "error") setValue(serverValue);
  }

  return [value, setValue] as const;
}

/**
 * Status and assignment.
 *
 * Both submit on change rather than behind a save button. These are one-field
 * decisions taken while reading the enquiry, and a save button next to a
 * single select is a step that exists only to be forgotten.
 *
 * Each is its own form and its own action state, so a failed assignment does
 * not report itself as a failed status change.
 */
export function LeadControls({
  leadId,
  status,
  assignedTo,
  staff,
}: {
  leadId: string;
  status: LeadStatus;
  assignedTo: string | null;
  staff: StaffOption[];
}) {
  const statusId = useId();
  const assignId = useId();

  const statusForm = useRef<HTMLFormElement>(null);
  const assignForm = useRef<HTMLFormElement>(null);

  const [statusState, statusAction, statusPending] = useActionState(
    updateLeadStatus,
    initialLeadActionState,
  );
  const [assignState, assignAction, assignPending] = useActionState(
    assignLead,
    initialLeadActionState,
  );

  const [statusValue, setStatusValue] = useServerValue(status, statusState);
  const [assignValue, setAssignValue] = useServerValue(assignedTo ?? "", assignState);

  useBusyWhile(statusPending || assignPending, "Saving");
  useFormToast(statusState, { successTitle: "Status updated", errorTitle: "Could not change it" });
  useFormToast(assignState, { successTitle: "Assignment saved", errorTitle: "Could not assign it" });

  return (
    <div className="space-y-5">
      <form action={statusAction} ref={statusForm}>
        <input type="hidden" name="lead_id" value={leadId} />
        <label htmlFor={statusId} className={LABEL}>
          Status
        </label>
        <select
          id={statusId}
          name="status"
          value={statusValue}
          disabled={statusPending}
          onChange={(event) => {
            setStatusValue(event.target.value as LeadStatus);
            statusForm.current?.requestSubmit();
          }}
          className={cn(FIELD, "mt-2")}
        >
          {LEAD_STATUSES.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </form>

      <form action={assignAction} ref={assignForm}>
        <input type="hidden" name="lead_id" value={leadId} />
        <label htmlFor={assignId} className={LABEL}>
          Assigned to
        </label>
        <select
          id={assignId}
          name="assigned_to"
          value={assignValue}
          disabled={assignPending}
          onChange={(event) => {
            setAssignValue(event.target.value);
            assignForm.current?.requestSubmit();
          }}
          className={cn(FIELD, "mt-2")}
        >
          <option value="">Nobody</option>
          {staff.map((person) => (
            <option key={person.id} value={person.id}>
              {person.name}
            </option>
          ))}
        </select>
        {staff.length === 0 && (
          <p className="mt-1.5 text-xs text-text-subtle">
            No accounts can be assigned enquiries yet.
          </p>
        )}
      </form>
    </div>
  );
}

/**
 * Archive and spam.
 *
 * Both are flags. Nothing on this screen deletes an enquiry, because an
 * enquiry is the business asset — the archive is where a finished one goes and
 * the spam mark is how an obvious one leaves the list, and both are reversible
 * from the view they move it to.
 */
export function LeadFlags({
  leadId,
  archived,
  isSpam,
}: {
  leadId: string;
  archived: boolean;
  isSpam: boolean;
}) {
  const [archiveState, archiveAction, archivePending] = useActionState(
    archiveLead,
    initialLeadActionState,
  );
  const [spamState, spamAction, spamPending] = useActionState(
    markLeadSpam,
    initialLeadActionState,
  );

  useBusyWhile(archivePending || spamPending, "Saving");
  useFormToast(archiveState, { successTitle: "Done", errorTitle: "Could not do that" });
  useFormToast(spamState, { successTitle: "Done", errorTitle: "Could not do that" });

  return (
    <div className="flex flex-wrap gap-2">
      <form action={archiveAction}>
        <input type="hidden" name="lead_id" value={leadId} />
        <input type="hidden" name="archived" value={archived ? "false" : "true"} />
        <FlagButton pending={archivePending}>
          {archived ? (
            <>
              <ArchiveRestore className="size-4" aria-hidden />
              Restore
            </>
          ) : (
            <>
              <Archive className="size-4" aria-hidden />
              Archive
            </>
          )}
        </FlagButton>
      </form>

      <form action={spamAction}>
        <input type="hidden" name="lead_id" value={leadId} />
        <input type="hidden" name="is_spam" value={isSpam ? "false" : "true"} />
        <FlagButton pending={spamPending}>
          {isSpam ? (
            <>
              <ShieldCheck className="size-4" aria-hidden />
              Not spam
            </>
          ) : (
            <>
              <Ban className="size-4" aria-hidden />
              Mark as spam
            </>
          )}
        </FlagButton>
      </form>
    </div>
  );
}

function FlagButton({
  pending,
  children,
}: {
  pending: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="submit"
      disabled={pending}
      className={cn(
        "inline-flex items-center gap-2 rounded-lg border border-border px-3.5 py-2 text-sm",
        "text-text-muted transition-colors duration-[--duration-fast]",
        "hover:border-border-strong hover:bg-surface-2 hover:text-text",
        "disabled:pointer-events-none disabled:opacity-60",
      )}
    >
      {children}
    </button>
  );
}
