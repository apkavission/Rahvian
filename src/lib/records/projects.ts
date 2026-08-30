import { galleryToJson, readGallery } from "@/lib/media/gallery";
import type { MediaOption } from "@/lib/media/image-fields";
import type { Fieldset } from "@/lib/records/definition";
import { recordSchema } from "@/lib/records/definition";
import { imageField } from "@/lib/sections/fields";
import { CONTENT_STATUS_OPTIONS, SLUG_PATTERN } from "@/lib/validation/records";
import { slugify } from "@/lib/utils";
import type { Enums, Json, Tables, TablesUpdate } from "@/types/database";

export type ProjectRow = Tables<"projects">;

/**
 * What each kind of work is called in the admin.
 *
 * The same four the public cards carry, worded for the person choosing rather
 * than the person reading. The hint under the field spells out what the
 * database will and will not accept for each, because three of the four
 * honesty constraints on this table are about exactly this choice.
 */
export const PROJECT_TYPE_OPTIONS = [
  { value: "client", label: "Client project — real work, for a named client" },
  { value: "demo", label: "Self-built demo — our own concept, never a client's" },
  { value: "inhouse", label: "Our own product — built by us, for us" },
  { value: "previous", label: "Earlier work — from before the company" },
] as const;

/**
 * A portfolio item, as the admin edits it.
 *
 * Every descriptor is named after the column it writes, so the mapping below is
 * a rename-free copy and there is no second place where a field's identity is
 * decided.
 *
 * `gallery` is a repeater of image fields — the one column on this table that
 * holds a list of pictures rather than one. It needed no new machinery: the
 * repeater and the picker already composed, and the row it produces,
 * `{ media_id, caption }`, is the shape the column already stored.
 */
export function projectFieldsets(
  technologies: { id: string; name: string }[],
  services: { id: string; name: string }[],
  assets: MediaOption[],
): Fieldset[] {
  return [
    {
      legend: "Identity",
      hint: "What this piece of work is, and where it lives.",
      fields: [
        {
          kind: "text",
          name: "title",
          label: "Title",
          required: true,
          max: 160,
          hint: "The name of the project, as the page heading.",
        },
        {
          kind: "text",
          name: "slug",
          label: "Address",
          required: true,
          max: 120,
          pattern: SLUG_PATTERN,
          hint: "The last part of the web address: /portfolio/…",
        },
        {
          kind: "select",
          name: "type",
          label: "Kind of work",
          required: true,
          options: [...PROJECT_TYPE_OPTIONS],
          hint: "This is the one field the database polices hardest: a demo can never name a client, our own products never name one either, and real client work must name theirs.",
        },
        {
          kind: "text",
          name: "client_name",
          label: "Client",
          max: 160,
          hint: "Required for client work. Must be empty for a demo or our own product — an unnamed “client project” is indistinguishable from an invented one.",
        },
        {
          kind: "text",
          name: "category",
          label: "Category",
          max: 80,
          hint: "A few words on the row above the title — “E-commerce”, “Healthcare”.",
        },
        {
          kind: "textarea",
          name: "summary",
          label: "Summary",
          required: true,
          max: 400,
          hint: "One or two sentences. This is the card on the portfolio grid, and the description search engines fall back to.",
        },
        {
          kind: "number",
          name: "year",
          label: "Year",
          min: 2000,
          max: 2100,
        },
        {
          kind: "boolean",
          name: "is_featured",
          label: "Feature this",
          hint: "Featured work leads the portfolio grid, ahead of the order below.",
        },
      ],
    },
    {
      legend: "The story",
      hint: "Both optional, and both render as their own block. A project with only a summary is a short, complete page rather than a skeleton of empty headings.",
      fields: [
        {
          kind: "textarea",
          name: "problem",
          label: "What needed solving",
          max: 2000,
        },
        {
          kind: "textarea",
          name: "solution",
          label: "What we did",
          max: 2000,
        },
      ],
    },
    {
      legend: "What it does",
      fields: [
        {
          kind: "list",
          name: "features",
          label: "Built into it",
          hint: "The things a visitor would notice using it.",
        },
        {
          kind: "list",
          name: "capabilities",
          label: "What it can handle",
          hint: "The things underneath — load, integrations, scale.",
        },
      ],
    },
    {
      legend: "Built with",
      fields: [
        {
          kind: "checkboxes",
          name: "technology_ids",
          label: "Technologies",
          options: technologies.map((tech) => ({ value: tech.id, label: tech.name })),
          hint: "Shown as the stack behind it. Tick none and the block is left out.",
        },
        {
          kind: "checkboxes",
          name: "service_ids",
          label: "Services this came from",
          options: services.map((service) => ({ value: service.id, label: service.name })),
          hint: "Which of our services this piece of work is an example of.",
        },
      ],
    },
    {
      legend: "Links",
      fields: [
        {
          kind: "text",
          name: "live_url",
          label: "Live site",
          max: 500,
          hint: "The full address, including https://",
        },
        {
          kind: "text",
          name: "admin_demo_url",
          label: "Admin demo",
          max: 500,
          hint: "Where someone can look at the admin side, if there is one to show.",
        },
      ],
    },
    {
      legend: "Demos only",
      hint: "The database refuses both of these on anything that is not a self-built demo. Filling them in on client work will be rejected with the reason.",
      fields: [
        {
          kind: "group",
          name: "demo_credentials",
          label: "Demo sign-in",
          hint: "Printed on the page for anyone to use, so it must be a read-only account and nothing else. Leave both empty for no sign-in panel.",
          fields: [
            { kind: "text", name: "email", label: "Email", max: 160 },
            { kind: "text", name: "password", label: "Password", max: 160 },
          ],
        },
        {
          kind: "repeater",
          name: "variants",
          label: "Live industry variants",
          itemLabel: "variant",
          max: 20,
          hint: "One codebase configured per industry. Each one must be a running site, not a mockup.",
          fields: [
            { kind: "text", name: "label", label: "Industry", required: true, max: 80 },
            {
              kind: "text",
              name: "url",
              label: "Address",
              required: true,
              max: 500,
              hint: "The full address, including https://",
            },
            {
              kind: "text",
              name: "slug",
              label: "Short name",
              max: 80,
              pattern: SLUG_PATTERN,
              hint: "Left empty, it is made from the industry name.",
            },
          ],
        },
      ],
    },
    {
      legend: "Images",
      hint: "The card image is what the portfolio grid shows. Without one the card renders its title over a plain panel, which is correct but plain.",
      fields: [
        imageField("thumbnail_id", "project.thumbnail", assets),
        imageField("og_image_id", "project.social", assets),
      ],
    },
    {
      legend: "Gallery",
      hint: "The “A look inside” grid, two pictures to a row, in the order set here. Leave it empty and the whole section is left out of the page rather than shown as an empty grid. A picture whose file is later deleted from the library drops out on its own.",
      fields: [
        {
          kind: "repeater",
          name: "gallery",
          label: "Pictures",
          itemLabel: "picture",
          max: 12,
          fields: [
            // Required, because a row with a caption and no picture is a row
            // the page cannot draw — and the page's own reader would drop it,
            // leaving a caption that was saved and never appeared.
            imageField("media_id", "project.gallery", assets, { required: true }),
            {
              kind: "text",
              name: "caption",
              label: "Caption",
              max: 200,
              hint: "Optional. One line under the picture — what the screen is, not what it looks like.",
            },
          ],
        },
      ],
    },
    {
      legend: "Publication",
      fields: [
        {
          kind: "select",
          name: "status",
          label: "Status",
          required: true,
          options: [...CONTENT_STATUS_OPTIONS],
          hint: "Only published work appears on the site and in the sitemap.",
        },
        {
          kind: "number",
          name: "sort_order",
          label: "Position",
          required: true,
          min: 0,
          hint: "Lower comes first, after the featured items. The arrows in the list are the easier way to change it.",
        },
      ],
    },
    {
      legend: "Search engines",
      hint: "All optional. Left empty, the title and the summary are used.",
      fields: [
        { kind: "text", name: "seo_title", label: "Title tag", max: 160 },
        { kind: "textarea", name: "seo_description", label: "Meta description", max: 400 },
        {
          kind: "list",
          name: "seo_keywords",
          label: "Keywords",
          hint: "Rarely worth filling in — no major search engine has used this tag for ranking in years.",
        },
        { kind: "text", name: "canonical_url", label: "Canonical URL", max: 500 },
        {
          kind: "boolean",
          name: "noindex",
          label: "Ask search engines not to index this page",
          hint: "The page stays reachable by anyone who has the link.",
        },
      ],
    },
  ];
}

/**
 * The schema for a project, plus the rules no single field can express.
 *
 * Four of the five are check constraints on `company.projects`, so the database
 * would refuse the row anyway — and that is the point of restating them here.
 * A refusal that arrives as `projects_demo_has_no_client` under a red banner
 * teaches nobody anything; a sentence under the field that caused it does. The
 * constraints stay the authority; these are the explanation.
 */
export function projectSchema(
  technologies: { id: string; name: string }[],
  services: { id: string; name: string }[],
  assets: MediaOption[],
) {
  return recordSchema(projectFieldsets(technologies, services, assets)).superRefine((values, ctx) => {
    const record = values as Record<string, unknown>;

    const type = record.type;
    const client = typeof record.client_name === "string" ? record.client_name.trim() : "";
    const credentials = (record.demo_credentials ?? {}) as Record<string, unknown>;
    const email = typeof credentials.email === "string" ? credentials.email.trim() : "";
    const password = typeof credentials.password === "string" ? credentials.password.trim() : "";
    const variants = Array.isArray(record.variants) ? record.variants : [];

    // projects_client_named
    if (type === "client" && !client) {
      ctx.addIssue({
        code: "custom",
        path: ["client_name"],
        message: "Real client work has to name the client. An unnamed client project reads as an invented one.",
      });
    }

    // projects_demo_has_no_client and projects_inhouse_has_no_client
    if ((type === "demo" || type === "inhouse") && client) {
      ctx.addIssue({
        code: "custom",
        path: ["client_name"],
        message:
          type === "demo"
            ? "A self-built demo has no client. Clear this, or change the kind of work above."
            : "Our own products are ours. Clear this, or change the kind of work above.",
      });
    }

    // projects_credentials_only_for_demos
    if ((email || password) && type !== "demo") {
      ctx.addIssue({
        code: "custom",
        path: ["demo_credentials.email"],
        message: "Only a self-built demo may publish a sign-in. Clear both, or change the kind of work above.",
      });
    }

    // Half a credential pair is unusable, and the page would ignore it silently.
    if (email && !password) {
      ctx.addIssue({
        code: "custom",
        path: ["demo_credentials.password"],
        message: "Give the password as well, or clear the email — half a sign-in is not usable.",
      });
    }
    if (password && !email) {
      ctx.addIssue({
        code: "custom",
        path: ["demo_credentials.email"],
        message: "Give the email as well, or clear the password — half a sign-in is not usable.",
      });
    }

    // projects_variants_only_for_demos
    if (variants.length > 0 && type !== "demo") {
      ctx.addIssue({
        code: "custom",
        path: ["variants"],
        message: "Only a self-built demo has industry variants. Remove them, or change the kind of work above.",
      });
    }
  });
}

/** The row, as the form's values. */
export function projectToValues(row: ProjectRow): Record<string, unknown> {
  const credentials = readCredentials(row.demo_credentials);

  return {
    title: row.title,
    slug: row.slug,
    type: row.type,
    client_name: row.client_name ?? "",
    category: row.category ?? "",
    summary: row.summary,
    year: row.year ?? undefined,
    is_featured: row.is_featured,

    thumbnail_id: row.thumbnail_id ?? "",
    og_image_id: row.og_image_id ?? "",

    // Read through the same function the public page reads it with, so the
    // form shows exactly the rows that would render — a malformed entry is
    // dropped in both places rather than in one of them.
    gallery: readGallery(row.gallery).map((item) => ({
      media_id: item.media_id,
      caption: item.caption ?? "",
    })),

    problem: row.problem ?? "",
    solution: row.solution ?? "",

    features: stringList(row.features),
    capabilities: stringList(row.capabilities),

    technology_ids: row.technology_ids,
    service_ids: row.service_ids,

    live_url: row.live_url ?? "",
    admin_demo_url: row.admin_demo_url ?? "",

    demo_credentials: {
      email: credentials?.email ?? "",
      password: credentials?.password ?? "",
    },
    variants: readVariants(row.variants),

    status: row.status,
    sort_order: row.sort_order,

    seo_title: row.seo_title ?? "",
    seo_description: row.seo_description ?? "",
    seo_keywords: row.seo_keywords,
    canonical_url: row.canonical_url ?? "",
    noindex: row.noindex,
  };
}

/**
 * The validated values, as columns.
 *
 * Optional text becomes `null` rather than `""`. An empty string in a nullable
 * column is a value that looks absent and is not — the page's `??` fallback
 * never fires, and the block renders empty instead of being left out.
 *
 * `demo_credentials` is the one column where empty must become SQL `NULL`
 * rather than an empty object: the check constraint tests `is null`, and
 * `'{}'::jsonb` is not null, so a blank pair on a client project would be
 * refused by the database for a reason nobody could see on screen.
 */
export function valuesToRow(values: Record<string, unknown>): TablesUpdate<"projects"> {
  const credentials = (values.demo_credentials ?? {}) as Record<string, unknown>;
  const email = text(credentials.email);
  const password = text(credentials.password);

  return {
    title: text(values.title) ?? "",
    slug: text(values.slug) ?? "",
    type: values.type as Enums<"project_type">,
    client_name: text(values.client_name),
    category: text(values.category),
    summary: text(values.summary) ?? "",
    year: typeof values.year === "number" ? values.year : null,

    thumbnail_id: text(values.thumbnail_id),
    og_image_id: text(values.og_image_id),
    gallery: galleryToJson(values.gallery),
    is_featured: values.is_featured === true,

    problem: text(values.problem),
    solution: text(values.solution),

    features: asJson(list(values.features)),
    capabilities: asJson(list(values.capabilities)),

    technology_ids: list(values.technology_ids),
    service_ids: list(values.service_ids),

    live_url: text(values.live_url),
    admin_demo_url: text(values.admin_demo_url),

    demo_credentials: email && password ? asJson({ email, password }) : null,
    variants: asJson(
      (Array.isArray(values.variants) ? values.variants : []).flatMap((entry) => {
        const row = (entry ?? {}) as Record<string, unknown>;
        const label = text(row.label);
        const url = text(row.url);
        if (!label || !url) return [];
        return [{ label, url, slug: text(row.slug) ?? slugify(label) }];
      }),
    ),

    status: values.status as Enums<"content_status">,
    sort_order: typeof values.sort_order === "number" ? values.sort_order : 0,

    seo_title: text(values.seo_title),
    seo_description: text(values.seo_description),
    seo_keywords: list(values.seo_keywords),
    canonical_url: text(values.canonical_url),
    noindex: values.noindex === true,
  };
}

/**
 * A validated value, as the column's type.
 *
 * The generated `Json` type is a recursive union that TypeScript cannot see a
 * plain array or object as a member of, even when every value inside it is one.
 * The cast is safe precisely because of where it is applied: to values that have
 * already been parsed field by field and then narrowed again by the helpers
 * above, so nothing unserialisable can be inside.
 */
function asJson(value: unknown): Json {
  return value as Json;
}

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim() !== "" ? value.trim() : null;
}

function list(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

/**
 * JSONB columns are `Json`, which is legitimately anything. Everything read out
 * of one is filtered to the shape the form expects; anything else is dropped
 * rather than loaded, so a row edited by hand degrades to a missing entry
 * instead of a broken form.
 */
function stringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item.trim() !== "");
}

function readVariants(value: unknown): { label: string; url: string; slug: string }[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((entry) => {
    if (!entry || typeof entry !== "object") return [];
    const row = entry as Record<string, unknown>;
    if (typeof row.label !== "string" || typeof row.url !== "string") return [];
    return [
      {
        label: row.label,
        url: row.url,
        slug: typeof row.slug === "string" ? row.slug : "",
      },
    ];
  });
}

function readCredentials(value: unknown): { email: string; password: string } | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  if (typeof row.email !== "string" || typeof row.password !== "string") return null;
  return { email: row.email, password: row.password };
}
