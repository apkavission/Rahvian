import type { MediaOption } from "@/lib/media/image-fields";
import type { Fieldset } from "@/lib/records/definition";
import { recordSchema } from "@/lib/records/definition";
import { imageField } from "@/lib/sections/fields";
import { CONTENT_STATUS_OPTIONS, SLUG_PATTERN } from "@/lib/validation/records";
import type { Tables, TablesUpdate } from "@/types/database";

export type BlogPostRow = Tables<"blog_posts">;
export type BlogCategoryRow = Tables<"blog_categories">;

export interface PickerOption {
  id: string;
  label: string;
}

/**
 * A blog post, as the admin edits it.
 *
 * Three columns are absent and each for its own reason.
 *
 * `reading_minutes` is set by a database trigger from the body, at 200 words a
 * minute — a figure typed by hand is a figure that stops being true the next
 * time a paragraph is added.
 *
 * `author_id` points at `profiles`, which is closed to the anonymous role by
 * design, so a byline would embed as null on the public site. Posts go out
 * under the company's name until `team_members` becomes a public-safe source
 * for an author, and offering the field before then would be offering a
 * setting with no effect.
 *
 */
export function postFieldsets(
  categories: PickerOption[],
  assets: MediaOption[],
): Fieldset[] {
  return [
    {
      legend: "Identity",
      fields: [
        {
          kind: "text",
          name: "title",
          label: "Title",
          required: true,
          max: 200,
          hint: "What the reader gets out of it, not what the piece is about.",
        },
        {
          kind: "text",
          name: "slug",
          label: "Address",
          required: true,
          max: 120,
          pattern: SLUG_PATTERN,
          hint: "The last part of the web address: /blog/…",
        },
        {
          kind: "textarea",
          name: "excerpt",
          label: "Excerpt",
          max: 400,
          hint: "Two sentences at most. This is the card on the index, and the description search engines fall back to.",
        },
        {
          kind: "select",
          name: "category_id",
          label: "Category",
          options: categories.map((category) => ({
            value: category.id,
            label: category.label,
          })),
          hint: "Shown in the breadcrumb, and what decides which posts appear as further reading.",
        },
        {
          kind: "list",
          name: "tags",
          label: "Tags",
          hint: "Listed under the article.",
        },
      ],
    },
    {
      legend: "The article",
      hint: "Markdown. It is parsed into elements and rendered, never injected as HTML, so a pasted article cannot run script or break the page.",
      fields: [
        {
          kind: "textarea",
          name: "content",
          label: "Body",
          rows: 24,
          max: 200000,
          hint: "## for a section heading — three or more of them turn on the contents list beside the article. Reading time is worked out from this and cannot be typed.",
        },
      ],
    },
    {
      legend: "Images",
      hint: "Both optional. A post with no picture reads as an article; a post with a stock photograph of a laptop reads as filler.",
      fields: [
        imageField("featured_image_id", "post.featured", assets),
        imageField("og_image_id", "post.social", assets),
      ],
    },
    {
      legend: "Publication",
      hint: "Posts are ordered by publication date, newest first — there is no manual position to set.",
      fields: [
        {
          kind: "select",
          name: "status",
          label: "Status",
          required: true,
          options: [...CONTENT_STATUS_OPTIONS],
          hint: "Only published posts appear on the site and in the sitemap.",
        },
        {
          kind: "boolean",
          name: "is_featured",
          label: "Feature this post",
          hint: "Marks it for the places that show one post rather than the whole list.",
        },
      ],
    },
    {
      legend: "Search engines",
      hint: "All optional. Left empty, the title and the excerpt are used.",
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
          label: "Ask search engines not to index this post",
          hint: "The post stays reachable by anyone who has the link.",
        },
      ],
    },
  ];
}

export function postSchema(categories: PickerOption[], assets: MediaOption[]) {
  return recordSchema(postFieldsets(categories, assets));
}

export function postToValues(row: BlogPostRow): Record<string, unknown> {
  return {
    title: row.title,
    slug: row.slug,
    excerpt: row.excerpt ?? "",
    category_id: row.category_id ?? "",
    tags: row.tags,

    featured_image_id: row.featured_image_id ?? "",
    og_image_id: row.og_image_id ?? "",

    content: row.content,

    status: row.status,
    is_featured: row.is_featured,

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
 * `content` is the one text field that keeps its empty string rather than
 * becoming null: the column is `not null default ''`, and the reading-time
 * trigger reads it on every write.
 */
export function postValuesToRow(values: Record<string, unknown>): TablesUpdate<"blog_posts"> {
  return {
    title: text(values.title) ?? "",
    slug: text(values.slug) ?? "",
    excerpt: text(values.excerpt),
    category_id: text(values.category_id),
    tags: list(values.tags),

    featured_image_id: text(values.featured_image_id),
    og_image_id: text(values.og_image_id),

    content: typeof values.content === "string" ? values.content : "",

    status: values.status as BlogPostRow["status"],
    is_featured: values.is_featured === true,

    seo_title: text(values.seo_title),
    seo_description: text(values.seo_description),
    seo_keywords: list(values.seo_keywords),
    canonical_url: text(values.canonical_url),
    noindex: values.noindex === true,
  };
}

// ---------------------------------------------------------------------------

/**
 * A blog category.
 *
 * Short enough that the whole record fits on one screen, which is why this is
 * the first content type with no preview column: a category has no page of its
 * own on the site yet, and previewing a name and a sentence would be showing
 * the form back to the person who just typed it.
 */
export function categoryFieldsets(): Fieldset[] {
  return [
    {
      legend: "Identity",
      fields: [
        { kind: "text", name: "name", label: "Name", required: true, max: 80 },
        {
          kind: "text",
          name: "slug",
          label: "Address",
          required: true,
          max: 120,
          pattern: SLUG_PATTERN,
          hint: "Used to filter the archive.",
        },
        {
          kind: "textarea",
          name: "description",
          label: "Description",
          max: 400,
          hint: "One sentence on what belongs in here.",
        },
        {
          kind: "number",
          name: "sort_order",
          label: "Position",
          required: true,
          min: 0,
          hint: "Lower comes first. The arrows in the list are the easier way to change it.",
        },
      ],
    },
    {
      legend: "Search engines",
      fields: [
        { kind: "text", name: "seo_title", label: "Title tag", max: 160 },
        { kind: "textarea", name: "seo_description", label: "Meta description", max: 400 },
        {
          kind: "boolean",
          name: "noindex",
          label: "Ask search engines not to index this category",
        },
      ],
    },
  ];
}

export function categorySchema() {
  return recordSchema(categoryFieldsets());
}

export function categoryToValues(row: BlogCategoryRow): Record<string, unknown> {
  return {
    name: row.name,
    slug: row.slug,
    description: row.description ?? "",
    sort_order: row.sort_order,
    seo_title: row.seo_title ?? "",
    seo_description: row.seo_description ?? "",
    noindex: row.noindex,
  };
}

export function categoryValuesToRow(
  values: Record<string, unknown>,
): TablesUpdate<"blog_categories"> {
  return {
    name: text(values.name) ?? "",
    slug: text(values.slug) ?? "",
    description: text(values.description),
    sort_order: typeof values.sort_order === "number" ? values.sort_order : 0,
    seo_title: text(values.seo_title),
    seo_description: text(values.seo_description),
    noindex: values.noindex === true,
  };
}

// ---------------------------------------------------------------------------

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim() !== "" ? value.trim() : null;
}

function list(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}
