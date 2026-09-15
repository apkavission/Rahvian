import { buildSchema, emptyContent, type Field } from "@/lib/sections/fields";

/**
 * What every section type is, and what it holds.
 *
 * The single description of each type. The Server Action validates against a
 * schema derived from these fields, the builder renders its form from them,
 * and the section component reads the shape they produce. Adding a type is:
 * write the component, register it, and add an entry here — still no
 * migration, because `page_sections.type` is a text column.
 *
 * Fields marked required are the ones a section cannot render without. Almost
 * everything else is optional, because a section that quietly omits a block it
 * has no content for is the behaviour the whole public site is built on.
 */

export interface SectionDefinition {
  /** What it is called in the section library. */
  label: string;
  /** One line on when to reach for it. */
  description: string;
  fields: Field[];
}

/** A call to action. The shape repeats often enough to be declared once. */
const cta = (name: string, label: string, required = false): Field => ({
  kind: "group",
  name,
  label,
  required,
  fields: [
    { kind: "text", name: "label", label: "Button text", required: true, max: 60 },
    { kind: "text", name: "href", label: "Links to", required: true, max: 300 },
  ],
});

/** The heading block almost every section opens with. */
const HEADING_FIELDS: Field[] = [
  {
    kind: "text",
    name: "eyebrow",
    label: "Eyebrow",
    hint: "The small line above the heading.",
    max: 60,
  },
  { kind: "text", name: "heading", label: "Heading", required: true, max: 200 },
  {
    kind: "textarea",
    name: "description",
    label: "Description",
    hint: "One or two sentences. Make the heading concrete rather than repeating it.",
    max: 600,
  },
];

/** The empty state a database-backed section shows while its table is empty. */
const EMPTY_STATE: Field = {
  kind: "group",
  name: "empty",
  label: "Empty state",
  hint: "Shown in place of the list while there is nothing to show. Say why, plainly.",
  fields: [
    { kind: "text", name: "heading", label: "Heading", required: true, max: 120 },
    { kind: "textarea", name: "body", label: "Body", required: true, max: 800 },
    cta("cta", "Button"),
  ],
};

const MORE_LINK: Field = {
  kind: "group",
  name: "more",
  label: "Link under the list",
  fields: [
    { kind: "text", name: "label", label: "Link text", required: true, max: 60 },
    { kind: "text", name: "href", label: "Links to", required: true, max: 300 },
  ],
};

export const SECTION_DEFINITIONS: Record<string, SectionDefinition> = {
  hero: {
    label: "Hero",
    description: "The full-viewport opening with the WebGL scene. One per visit, on the home page.",
    fields: [
      { kind: "text", name: "eyebrow", label: "Eyebrow", max: 60 },
      { kind: "text", name: "heading", label: "Heading", required: true, max: 200 },
      {
        kind: "text",
        name: "highlight",
        label: "Highlighted words",
        hint: "Rendered in the accent colour. Must appear word for word inside the heading.",
        max: 80,
      },
      { kind: "textarea", name: "subheading", label: "Subheading", required: true, max: 600 },
      cta("ctaPrimary", "Primary button", true),
      cta("ctaSecondary", "Secondary button"),
      {
        kind: "list",
        name: "capabilities",
        label: "Capability words",
        hint: "Short factual phrases under the fold. Not statistics.",
      },
    ],
  },

  page_intro: {
    label: "Page intro",
    description: "The quieter opening of an interior page. Carries the page's only H1.",
    fields: [
      ...HEADING_FIELDS,
      {
        kind: "list",
        name: "points",
        label: "Points",
        hint: "Short factual phrases under the copy. Not statistics.",
      },
      cta("ctaPrimary", "Primary button"),
      cta("ctaSecondary", "Secondary button"),
    ],
  },

  what_we_build: {
    label: "What we build",
    description: "A bento grid of capabilities, each with an icon.",
    fields: [
      ...HEADING_FIELDS,
      {
        kind: "repeater",
        name: "items",
        label: "Tiles",
        itemLabel: "tile",
        required: true,
        fields: [
          { kind: "text", name: "title", label: "Title", required: true, max: 80 },
          { kind: "textarea", name: "body", label: "Body", required: true, max: 400 },
          { kind: "text", name: "icon", label: "Icon name", hint: "From the curated icon set.", max: 40 },
        ],
      },
    ],
  },

  services_grid: {
    label: "Services grid",
    description: "Every published service, read live. The cards themselves are not edited here.",
    fields: HEADING_FIELDS,
  },

  why_choose_us: {
    label: "Why choose us",
    description: "Numbered prose arguing for the company. No statistics we cannot defend.",
    fields: [
      ...HEADING_FIELDS,
      {
        kind: "repeater",
        name: "points",
        label: "Points",
        itemLabel: "point",
        required: true,
        fields: [
          { kind: "text", name: "title", label: "Title", required: true, max: 120 },
          { kind: "textarea", name: "body", label: "Body", required: true, max: 600 },
        ],
      },
    ],
  },

  product_promo: {
    label: "Product promo",
    description:
      "A product of our own, labelled as ours. Never presents it as client work.",
    fields: [
      ...HEADING_FIELDS,
      { kind: "text", name: "productName", label: "Product name", required: true, max: 80 },
      { kind: "textarea", name: "productTagline", label: "Product tagline", required: true, max: 400 },
      {
        kind: "repeater",
        name: "features",
        label: "Features",
        itemLabel: "feature",
        required: true,
        max: 6,
        fields: [
          { kind: "text", name: "title", label: "Title", required: true, max: 80 },
          { kind: "textarea", name: "body", label: "Body", required: true, max: 400 },
        ],
      },
      { kind: "text", name: "href", label: "Links to", required: true, max: 300 },
      { kind: "text", name: "linkLabel", label: "Link text", required: true, max: 60 },
    ],
  },

  process_steps: {
    label: "Process steps",
    description: "The seven steps, read live from the process table.",
    fields: HEADING_FIELDS,
  },

  tech_stack: {
    label: "Tech stack",
    description: "The technology list, read live.",
    fields: HEADING_FIELDS,
  },

  story: {
    label: "Story",
    description: "Narrative paragraphs with an optional factual aside. No markup is accepted.",
    fields: [
      ...HEADING_FIELDS,
      {
        kind: "repeater",
        name: "blocks",
        label: "Paragraphs",
        itemLabel: "paragraph",
        required: true,
        fields: [
          { kind: "text", name: "heading", label: "Heading", hint: "Optional. Turns the paragraph into a beat.", max: 160 },
          { kind: "textarea", name: "body", label: "Body", required: true, max: 2000 },
        ],
      },
      {
        kind: "group",
        name: "aside",
        label: "Aside",
        hint: "Pulled out beside the prose. Facts we can defend, never a statistic.",
        fields: [
          { kind: "text", name: "heading", label: "Heading", required: true, max: 120 },
          { kind: "list", name: "items", label: "Items", required: true },
        ],
      },
    ],
  },

  team: {
    label: "Team",
    description: "Published team members, read live. Renders nothing while the table is empty.",
    fields: HEADING_FIELDS,
  },

  testimonials: {
    label: "Testimonials",
    description:
      "Published testimonials, read live. Renders nothing while the table is empty.",
    fields: [
      ...HEADING_FIELDS,
      {
        kind: "number",
        name: "limit",
        label: "Maximum shown",
        hint: "Blank shows all of them, in the order set on the Testimonials screen.",
        min: 1,
        max: 60,
      },
    ],
  },

  portfolio_grid: {
    label: "Portfolio grid",
    description: "Published projects, read live, optionally filtered by type.",
    fields: [
      ...HEADING_FIELDS,
      {
        kind: "checkboxes",
        name: "types",
        label: "Types to show",
        hint: "None ticked means all of them.",
        options: [
          { value: "client", label: "Client projects" },
          { value: "demo", label: "Self-built demos" },
          { value: "inhouse", label: "Our own products" },
          { value: "previous", label: "Earlier work" },
        ],
      },
      { kind: "number", name: "limit", label: "Maximum shown", min: 1, max: 60 },
      EMPTY_STATE,
      MORE_LINK,
    ],
  },

  demo_grid: {
    label: "Live demos",
    description:
      "The demo sites that are open to anybody, read live from the estate. Nothing to type: a demo appears here the moment it is switched to “Open to anybody” on the Estate screen.",
    fields: [
      ...HEADING_FIELDS,
      {
        kind: "number",
        name: "limit",
        label: "Maximum shown",
        hint: "Blank shows every demo that is open to the public.",
        min: 1,
        max: 20,
      },
      EMPTY_STATE,
      MORE_LINK,
    ],
  },

  case_studies_grid: {
    label: "Case studies grid",
    description: "Published case studies, read live.",
    fields: [
      ...HEADING_FIELDS,
      { kind: "number", name: "limit", label: "Maximum shown", min: 1, max: 60 },
      EMPTY_STATE,
      MORE_LINK,
    ],
  },

  blog_list: {
    label: "Blog list",
    description: "Published posts, read live, with an optional featured card.",
    fields: [
      ...HEADING_FIELDS,
      { kind: "boolean", name: "showFeatured", label: "Show a featured post first" },
      { kind: "number", name: "limit", label: "Maximum shown", min: 1, max: 60 },
      EMPTY_STATE,
      MORE_LINK,
    ],
  },

  pricing_table: {
    label: "Pricing table",
    description: "Published plans, read live. Prices are edited under Pricing, not here.",
    fields: [
      ...HEADING_FIELDS,
      {
        kind: "textarea",
        name: "note",
        label: "Note under the cards",
        hint: "Where the tax line and the third-party costs belong.",
        max: 1200,
      },
      EMPTY_STATE,
    ],
  },

  feature_grid: {
    label: "Feature grid",
    description: "A scannable grid of capabilities. Describes what a thing does.",
    fields: [
      ...HEADING_FIELDS,
      {
        kind: "select",
        name: "columns",
        label: "Columns",
        hint: "The widest layout. Narrower screens always step down.",
        options: [
          { value: "2", label: "Two" },
          { value: "3", label: "Three" },
          { value: "4", label: "Four" },
        ],
      },
      {
        kind: "repeater",
        name: "features",
        label: "Features",
        itemLabel: "feature",
        required: true,
        fields: [
          { kind: "text", name: "icon", label: "Icon name", hint: "From the curated icon set.", max: 40 },
          { kind: "text", name: "title", label: "Title", required: true, max: 100 },
          { kind: "textarea", name: "body", label: "Body", required: true, max: 500 },
        ],
      },
    ],
  },

  legal_document: {
    label: "Legal document",
    description: "Numbered clauses with a contents list. The entity details come from Settings.",
    fields: [
      {
        kind: "text",
        name: "updatedOn",
        label: "Last updated",
        hint: "As YYYY-MM-DD. Shown at the top of the document.",
        max: 10,
      },
      { kind: "list", name: "intro", label: "Introduction", hint: "One entry per paragraph." },
      {
        kind: "repeater",
        name: "clauses",
        label: "Clauses",
        itemLabel: "clause",
        required: true,
        max: 60,
        fields: [
          { kind: "text", name: "heading", label: "Heading", required: true, max: 200 },
          { kind: "list", name: "body", label: "Paragraphs" },
          { kind: "list", name: "items", label: "Bulleted list" },
        ],
      },
      {
        kind: "group",
        name: "contact",
        label: "Closing block",
        fields: [
          { kind: "text", name: "heading", label: "Heading", required: true, max: 160 },
          { kind: "list", name: "body", label: "Paragraphs", required: true },
        ],
      },
    ],
  },

  contact_channels: {
    label: "Contact channels",
    description: "The short form beside whichever contact details are configured.",
    fields: [
      ...HEADING_FIELDS,
      { kind: "text", name: "formHeading", label: "Form heading", max: 120 },
      { kind: "textarea", name: "formNote", label: "Form note", max: 400 },
      { kind: "text", name: "submitLabel", label: "Submit button text", max: 60 },
      { kind: "text", name: "channelsHeading", label: "Channels heading", max: 120 },
      { kind: "text", name: "hoursHeading", label: "Working hours heading", max: 120 },
      {
        kind: "text",
        name: "whatsappContext",
        label: "What the WhatsApp message should say this is about",
        max: 80,
        hint: 'Fills the blank in the message set in Settings. Left empty the opener is generic.',
      },
      {
        kind: "group",
        name: "quoteLink",
        label: "Pointer to the quote form",
        fields: [
          { kind: "text", name: "label", label: "Link text", required: true, max: 60 },
          { kind: "text", name: "href", label: "Links to", required: true, max: 300 },
          { kind: "text", name: "note", label: "Note", max: 300 },
        ],
      },
      {
        kind: "textarea",
        name: "channelsFallback",
        label: "Shown while no contact details are set",
        max: 400,
      },
      { kind: "textarea", name: "privacyNote", label: "Privacy note", max: 600 },
    ],
  },

  faq: {
    label: "FAQ",
    description: "Questions for one scope, read live. The answers are edited under FAQs.",
    fields: [
      ...HEADING_FIELDS,
      {
        kind: "text",
        name: "scope",
        label: "Scope",
        required: true,
        hint: 'Which set to show: "home", "pricing", "contact", or a service slug.',
        max: 60,
      },
    ],
  },

  cta_band: {
    label: "Closing CTA",
    description: "The dark closing band. Inverts its own colours in both themes.",
    fields: [
      { kind: "text", name: "eyebrow", label: "Eyebrow", max: 60 },
      { kind: "text", name: "heading", label: "Heading", required: true, max: 200 },
      { kind: "textarea", name: "description", label: "Description", max: 600 },
      cta("ctaPrimary", "Primary button", true),
      {
        kind: "boolean",
        name: "showWhatsapp",
        label: "Show the WhatsApp button",
        hint: "Appears only when a WhatsApp number is set in Settings.",
      },
      { kind: "text", name: "whatsappLabel", label: "WhatsApp button text", max: 60 },
      {
        kind: "text",
        name: "whatsappContext",
        label: "What the message should say this is about",
        max: 80,
        hint: 'Fills the blank in the message set in Settings — "SEO", "the clinic demo", "a new website". Left empty the opener is generic. This is what the visitor sees already typed when WhatsApp opens, so write it the way they would say it.',
      },
    ],
  },
};

/** Every type, for the section library, in a deliberate order. */
export const SECTION_TYPES = Object.keys(SECTION_DEFINITIONS);

export function getDefinition(type: string): SectionDefinition | null {
  return SECTION_DEFINITIONS[type] ?? null;
}

/** The validator for one type, derived from the same fields the form renders. */
export function schemaForType(type: string) {
  const definition = getDefinition(type);
  return definition ? buildSchema(definition.fields) : null;
}

/** A blank content object for a newly added section. */
export function blankContent(type: string): Record<string, unknown> {
  const definition = getDefinition(type);
  return definition ? emptyContent(definition.fields) : {};
}
