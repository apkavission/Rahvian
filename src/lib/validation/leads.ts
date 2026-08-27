import { z } from "zod";
import type { Enums } from "@/types/database";

export type LeadStatus = Enums<"lead_status">;

/**
 * The pipeline, in order, with the words the admin uses for it.
 *
 * Ordered deliberately: the enum's own order is the order a deal moves
 * through, so a select rendered from this list reads as a pipeline rather than
 * as an alphabetical set of unrelated states.
 */
export const LEAD_STATUSES: { value: LeadStatus; label: string }[] = [
  { value: "new", label: "New" },
  { value: "contacted", label: "Contacted" },
  { value: "qualified", label: "Qualified" },
  { value: "proposal_sent", label: "Proposal sent" },
  { value: "negotiation", label: "Negotiation" },
  { value: "won", label: "Won" },
  { value: "lost", label: "Lost" },
];

export const LEAD_STATUS_LABEL: Record<LeadStatus, string> = Object.fromEntries(
  LEAD_STATUSES.map((status) => [status.value, status.label]),
) as Record<LeadStatus, string>;

/**
 * Which statuses read as finished.
 *
 * Used only for emphasis in the list. Won and lost are both conclusions, and a
 * pipeline view that shows them with the same weight as an untouched enquiry
 * makes the untouched one harder to find — which is the one that needs a
 * reply today.
 */
export const CLOSED_STATUSES: LeadStatus[] = ["won", "lost"];

const statusValues = LEAD_STATUSES.map((status) => status.value) as [
  LeadStatus,
  ...LeadStatus[],
];

export const updateStatusSchema = z.object({
  lead_id: z.uuid(),
  status: z.enum(statusValues),
});

export const assignSchema = z.object({
  lead_id: z.uuid(),
  /** Empty means unassign, which is a legitimate action rather than a mistake. */
  assigned_to: z
    .union([z.uuid(), z.literal("")])
    .transform((value) => (value === "" ? null : value)),
});

export const noteSchema = z.object({
  lead_id: z.uuid(),
  body: z
    .string()
    .trim()
    .min(1, "Write something before saving.")
    .max(5000, "Keep a note under 5000 characters."),
});

export const archiveSchema = z.object({
  lead_id: z.uuid(),
  /** `false` restores. Archiving is never a delete — the row stays. */
  archived: z.union([z.literal("true"), z.literal("false")]).transform((v) => v === "true"),
});

export const spamSchema = z.object({
  lead_id: z.uuid(),
  is_spam: z.union([z.literal("true"), z.literal("false")]).transform((v) => v === "true"),
});

export interface LeadActionState {
  status: "idle" | "success" | "error";
  message: string;
  fieldErrors?: Record<string, string>;
}

export const initialLeadActionState: LeadActionState = {
  status: "idle",
  message: "",
};

/** Filters the list screen understands. All optional, all from the query string. */
export interface LeadFilters {
  q?: string;
  status?: LeadStatus;
  assigned?: string;
  /** Archived and spam are hidden unless explicitly asked for. */
  view?: "open" | "archived" | "spam";
  page?: number;
}

export function isLeadStatus(value: unknown): value is LeadStatus {
  return typeof value === "string" && statusValues.includes(value as LeadStatus);
}
