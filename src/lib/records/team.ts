import type { MediaOption } from "@/lib/media/image-fields";
import type { Fieldset } from "@/lib/records/definition";
import { recordSchema } from "@/lib/records/definition";
import { imageField } from "@/lib/sections/fields";
import { CONTENT_STATUS_OPTIONS } from "@/lib/validation/records";
import type { Tables, TablesUpdate } from "@/types/database";

export type TeamMemberRow = Tables<"team_members">;

/**
 * A profile link has to be a real address.
 *
 * Both URL columns are rendered straight into an `href` on a card that carries
 * someone's name. A bare word there resolves against whatever page the card is
 * on, so the link would silently go somewhere wrong rather than nowhere — which
 * on a personal profile is worse than a broken link.
 */
const URL_PATTERN = {
  re: /^https?:\/\/\S+$/,
  message: "Paste the whole address, starting with https://",
} as const;

/**
 * A team member, as the admin edits it.
 *
 * `sort_order` is absent for the usual reason: the order is set with the arrows
 * on the list, where it can be seen, rather than by typing a number.
 */
export function teamFieldsets(assets: MediaOption[]): Fieldset[] {
  return [
    {
      legend: "Who they are",
      fields: [
        {
          kind: "text",
          name: "name",
          label: "Name",
          required: true,
          max: 120,
          hint: "As they would introduce themselves, not as their passport spells it.",
        },
        {
          kind: "text",
          name: "role",
          label: "Role",
          required: true,
          max: 120,
          hint: "What they actually do here. Printed in capitals under the name, so keep it short.",
        },
        {
          kind: "textarea",
          name: "bio",
          label: "About them",
          max: 1000,
          rows: 5,
          hint: "A few sentences at most — the card is a card, not a CV. Real experience only; nothing invented.",
        },
      ],
    },
    {
      legend: "Photo",
      hint: "Optional. The card is written to render without one, so a profile with no photograph is complete rather than broken.",
      fields: [imageField("photo_id", "team.photo", assets)],
    },
    {
      legend: "What they work with",
      hint: "Shown as small tags under the description. Leave it empty and the tags are left out.",
      fields: [
        {
          kind: "list",
          name: "skills",
          label: "Skills",
          itemLabel: "skill",
        },
      ],
    },
    {
      legend: "Profiles",
      hint: "Both optional, and both open in a new tab. Only link to profiles the person is happy to have linked.",
      fields: [
        {
          kind: "text",
          name: "linkedin_url",
          label: "LinkedIn",
          max: 500,
          pattern: URL_PATTERN,
        },
        {
          kind: "text",
          name: "github_url",
          label: "GitHub",
          max: 500,
          pattern: URL_PATTERN,
        },
      ],
    },
    {
      legend: "Publication",
      hint: "The order people appear in is set with the arrows on the list, not here.",
      fields: [
        {
          kind: "select",
          name: "status",
          label: "Status",
          required: true,
          options: [...CONTENT_STATUS_OPTIONS],
          hint: "Only published people appear on the About page. While nobody is published, the section is left out of the page entirely rather than shown empty.",
        },
      ],
    },
  ];
}

/** The schema for one team member. No cross-field rules; the table has none. */
export function teamSchema(assets: MediaOption[]) {
  return recordSchema(teamFieldsets(assets));
}

/** The row, as the form's values. */
export function memberToValues(row: TeamMemberRow): Record<string, unknown> {
  return {
    name: row.name,
    role: row.role,
    bio: row.bio ?? "",
    photo_id: row.photo_id ?? "",
    skills: stringList(row.skills),
    linkedin_url: row.linkedin_url ?? "",
    github_url: row.github_url ?? "",
    status: row.status,
  };
}

/** The validated values, as columns. */
export function valuesToRow(values: Record<string, unknown>): TablesUpdate<"team_members"> {
  return {
    name: text(values.name) ?? "",
    role: text(values.role) ?? "",
    bio: text(values.bio),
    photo_id: text(values.photo_id),
    skills: list(values.skills),
    linkedin_url: text(values.linkedin_url),
    github_url: text(values.github_url),
    status: values.status as TeamMemberRow["status"],
  };
}

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim() !== "" ? value.trim() : null;
}

function list(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function stringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item.trim() !== "");
}
