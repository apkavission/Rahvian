#!/usr/bin/env node
/**
 * Seed the company site with its initial content.
 *
 *   npm run db:seed
 *
 * Idempotent: safe to re-run. Rows keyed by slug are upserted; the collections
 * that have no natural key (navigation, page sections) are replaced wholesale.
 *
 * This is real, shippable copy — not lorem ipsum. Everything here is editable
 * from the admin panel afterwards; seeding only means the site is never empty.
 *
 * Nothing in this file claims a client, a testimonial, a statistic or an award
 * we do not have. Where honest content does not exist yet, the section is left
 * out rather than invented.
 */

import { readFileSync, statSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SCHEMA = "company";

// --- connection -------------------------------------------------------------

function loadEnv() {
  const env = {};
  try {
    for (const line of readFileSync(resolve(ROOT, ".env.local"), "utf8").split(/\r?\n/)) {
      const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
      if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  } catch {
    /* CI passes them directly */
  }
  return { ...env, ...process.env };
}

const env = loadEnv();
const BASE = env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = env.SUPABASE_SERVICE_ROLE_KEY;

if (!BASE || !KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

/**
 * Minimal PostgREST client covering exactly the operations this script uses.
 *
 * Deliberately not `@supabase/supabase-js`: that package constructs a realtime
 * client on import, which requires a native WebSocket and therefore Node 22+.
 * A seed script has no business failing on a Node version, and needs none of
 * the features that dependency brings.
 *
 * The application itself still uses the official client — this shim exists
 * only for build-time scripts.
 */
function from(table) {
  const q = { table, params: [], method: "GET", body: null, prefer: [], select: null, single: false };

  const api = {
    select(columns = "*") {
      q.select = columns;
      return api;
    },
    insert(body) {
      q.method = "POST";
      q.body = body;
      return api;
    },
    upsert(body, options) {
      q.method = "POST";
      q.body = body;
      q.prefer.push("resolution=merge-duplicates");
      if (options?.onConflict) q.params.push(["on_conflict", options.onConflict]);
      return api;
    },
    update(body) {
      q.method = "PATCH";
      q.body = body;
      return api;
    },
    delete() {
      q.method = "DELETE";
      return api;
    },
    eq(column, value) {
      q.params.push([column, `eq.${value}`]);
      return api;
    },
    neq(column, value) {
      q.params.push([column, `neq.${value}`]);
      return api;
    },
    gt(column, value) {
      q.params.push([column, `gt.${value}`]);
      return api;
    },
    single() {
      q.single = true;
      return api;
    },
    // Thenable, so call sites read like the official client.
    then(onFulfilled, onRejected) {
      return execute(q).then(onFulfilled, onRejected);
    },
  };

  return api;
}

/**
 * PostgREST rejects a bulk insert whose objects do not share an identical key
 * set ("All object keys must match"). Rows here legitimately differ — a nav
 * child has `parent_id` and a top-level item does not; a fixed-price service
 * has `price_from` and a custom-quote one does not.
 *
 * Filling the union of keys with null is correct for exactly those cases,
 * because every column that varies between rows is nullable. A NOT NULL column
 * must still be present on every row, and will fail loudly if it is not —
 * which is the behaviour we want rather than a silent default.
 */
function normalizeKeys(rows) {
  if (!Array.isArray(rows) || rows.length < 2) return rows;

  const keys = new Set();
  for (const row of rows) for (const key of Object.keys(row)) keys.add(key);

  return rows.map((row) =>
    Object.fromEntries([...keys].map((key) => [key, row[key] ?? null])),
  );
}

async function execute(q) {
  if (q.body !== null) q.body = normalizeKeys(q.body);

  const params = new URLSearchParams(q.params);
  if (q.select) params.set("select", q.select);

  const query = params.toString();
  const headers = {
    apikey: KEY,
    Authorization: `Bearer ${KEY}`,
    "Accept-Profile": SCHEMA,
    "Content-Profile": SCHEMA,
  };

  if (q.body !== null) headers["Content-Type"] = "application/json";
  if (q.select) q.prefer.push("return=representation");
  if (q.prefer.length) headers.Prefer = q.prefer.join(",");
  if (q.single) headers.Accept = "application/vnd.pgrst.object+json";

  const response = await fetch(`${BASE}/rest/v1/${q.table}${query ? `?${query}` : ""}`, {
    method: q.method,
    headers,
    body: q.body === null ? undefined : JSON.stringify(q.body),
  });

  const text = await response.text();
  const payload = text ? JSON.parse(text) : null;

  if (!response.ok) {
    const detail = payload?.message ?? `HTTP ${response.status}`;
    return { data: null, error: { message: `${detail}${payload?.hint ? ` — ${payload.hint}` : ""}` } };
  }

  return { data: payload, error: null };
}

const db = { from };

let failed = false;

async function step(label, fn) {
  process.stdout.write(`  ${label.padEnd(34)}`);
  try {
    const count = await fn();
    console.log(`ok${count === undefined ? "" : ` (${count})`}`);
  } catch (error) {
    failed = true;
    console.log("FAILED");
    console.error(`      ${error.message}`);
  }
}

function check({ error }) {
  if (error) throw new Error(error.message);
}

// ---------------------------------------------------------------------------
// Site settings
// ---------------------------------------------------------------------------

async function seedSiteSettings() {
  check(
    await db
      .from("site_settings")
      .update({
        // Brand for the services business. The legal entity stays Apka Saathi
        // Private Limited and is named separately wherever it matters —
        // contracts, invoices, the footer — so a visitor always knows who they
        // would actually be contracting with.
        company_name: "Apka Vission",
        legal_name: "Apka Saathi Private Limited",
        tagline: "Your Vision. We Make It Happen.",
        country: "India",
        default_mode: "system",
        allow_mode_toggle: true,
        three_d_enabled: true,
        motion_level: "full",
        working_hours: [
          { day: "monday", open: "10:00", close: "19:00", closed: false },
          { day: "tuesday", open: "10:00", close: "19:00", closed: false },
          { day: "wednesday", open: "10:00", close: "19:00", closed: false },
          { day: "thursday", open: "10:00", close: "19:00", closed: false },
          { day: "friday", open: "10:00", close: "19:00", closed: false },
          { day: "saturday", open: "10:00", close: "16:00", closed: false },
          { day: "sunday", open: null, close: null, closed: true },
        ],
      })
      .eq("id", 1),
  );
}

// ---------------------------------------------------------------------------
// Brand media
// ---------------------------------------------------------------------------

/**
 * The logo files, and the settings rows that point at them.
 *
 * These four live in `public/brand/` rather than object storage. They are part
 * of the application shell — the header paints them on the first frame of
 * every page — so a second origin on that path buys nothing and costs a DNS
 * lookup and a connection. Everything an editor uploads later still goes to
 * R2; `public_url` is simply already absolute-from-root for these.
 *
 * `r2_key` is the natural key, so re-running this updates in place.
 *
 * Dimensions are the trimmed viewBox of each file. They exist so the header
 * can reserve the right box before the SVG arrives — a logo that resizes on
 * load shifts the whole navigation bar.
 */
const BRAND_MEDIA = [
  {
    r2_key: "brand/symbol-light.svg",
    public_url: "/brand/symbol-light.svg",
    filename: "symbol-light.svg",
    width: 1022,
    height: 566,
    alt_text: "Apka Vission",
    caption: "Symbol only — light backgrounds. Header, avatars, app icon.",
  },
  {
    r2_key: "brand/symbol-dark.svg",
    public_url: "/brand/symbol-dark.svg",
    filename: "symbol-dark.svg",
    width: 1022,
    height: 566,
    alt_text: "Apka Vission",
    caption: "Symbol only — dark backgrounds.",
  },
  {
    r2_key: "brand/logo-light.svg",
    public_url: "/brand/logo-light.svg",
    filename: "logo-light.svg",
    width: 1246,
    height: 764,
    alt_text: "Apka Vission — Your Vision. We Make It Happen.",
    caption:
      "Full lockup with wordmark and tagline — light backgrounds. Needs roughly 380px of width before the tagline is legible, so it belongs in a hero, a document or a signature, never in the header.",
  },
  {
    r2_key: "brand/logo-dark.svg",
    public_url: "/brand/logo-dark.svg",
    filename: "logo-dark.svg",
    width: 1246,
    height: 764,
    alt_text: "Apka Vission — Your Vision. We Make It Happen.",
    caption: "Full lockup with wordmark and tagline — dark backgrounds.",
  },
];

async function seedBrandMedia() {
  const rows = BRAND_MEDIA.map((asset) => ({
    ...asset,
    mime_type: "image/svg+xml",
    size_bytes: statSync(resolve(ROOT, "public", asset.public_url.slice(1))).size,
    folder: "brand",
  }));

  // Asking for the representation back means the ids arrive with the write,
  // rather than costing a second read to look up what we just inserted.
  const { data, error } = await db
    .from("media")
    .upsert(rows, { onConflict: "r2_key" })
    .select("id,r2_key");
  check({ error });

  const id = Object.fromEntries(data.map((row) => [row.r2_key, row.id]));

  // Light and dark are paired both ways round: the app shell reads the two
  // settings columns, while anything that only holds one media id (a page
  // section, say) can still find the counterpart through `dark_variant_id`.
  check(
    await db
      .from("media")
      .update({ dark_variant_id: id["brand/symbol-dark.svg"] })
      .eq("r2_key", "brand/symbol-light.svg"),
  );
  check(
    await db
      .from("media")
      .update({ dark_variant_id: id["brand/logo-dark.svg"] })
      .eq("r2_key", "brand/logo-light.svg"),
  );

  // The settings columns carry the *symbol*, not the full lockup: they drive
  // the header and footer, where the tagline would be three pixels tall.
  check(
    await db
      .from("site_settings")
      .update({
        logo_light_id: id["brand/symbol-light.svg"],
        logo_dark_id: id["brand/symbol-dark.svg"],
      })
      .eq("id", 1),
  );

  return rows.length;
}

// ---------------------------------------------------------------------------
// Navigation
// ---------------------------------------------------------------------------

const SERVICE_LINKS = [
  ["Website Development", "/services/web-development"],
  ["Web Application Development", "/services/web-application-development"],
  ["Mobile App Development", "/services/mobile-app-development"],
  ["Custom Software Development", "/services/custom-software-development"],
  ["AI Development & Automation", "/services/ai-development"],
  ["SEO", "/services/seo"],
  ["Digital Marketing", "/services/digital-marketing"],
];

async function seedNavigation() {
  // No natural key, so replace the whole set rather than reconcile it.
  check(await db.from("nav_items").delete().neq("id", "00000000-0000-0000-0000-000000000000"));

  const { data: services, error } = await db
    .from("nav_items")
    .insert({ location: "header", label: "Services", href: "/services", sort_order: 1 })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  const rows = [
    ...SERVICE_LINKS.map(([label, href], i) => ({
      location: "header",
      label,
      href,
      parent_id: services.id,
      sort_order: i + 1,
    })),
    { location: "header", label: "Portfolio", href: "/portfolio", sort_order: 2 },
    { location: "header", label: "Our Product", href: "/products/apka-saathi", sort_order: 3 },
    { location: "header", label: "Pricing", href: "/pricing", sort_order: 4 },
    { location: "header", label: "Blog", href: "/blog", sort_order: 5 },
    { location: "header", label: "Contact", href: "/contact", sort_order: 6 },

    ...SERVICE_LINKS.map(([label, href], i) => ({
      location: "footer_primary",
      label,
      href,
      sort_order: i + 1,
    })),

    { location: "footer_secondary", label: "About Us", href: "/about", sort_order: 1 },
    { location: "footer_secondary", label: "Portfolio", href: "/portfolio", sort_order: 2 },
    { location: "footer_secondary", label: "Case Studies", href: "/case-studies", sort_order: 3 },
    { location: "footer_secondary", label: "Our Product", href: "/products/apka-saathi", sort_order: 4 },
    { location: "footer_secondary", label: "Blog", href: "/blog", sort_order: 5 },
    { location: "footer_secondary", label: "Contact", href: "/contact", sort_order: 6 },

    { location: "footer_legal", label: "Privacy Policy", href: "/privacy-policy", sort_order: 1 },
    { location: "footer_legal", label: "Terms & Conditions", href: "/terms-and-conditions", sort_order: 2 },
  ];

  check(await db.from("nav_items").insert(rows));
  return rows.length + 1;
}

// ---------------------------------------------------------------------------
// Technologies — only what we genuinely work with
// ---------------------------------------------------------------------------

const TECHNOLOGIES = [
  ["React", "frontend"], ["Next.js", "frontend"], ["TypeScript", "frontend"],
  ["Tailwind CSS", "frontend"], ["Three.js", "frontend"],
  ["Node.js", "backend"], ["NestJS", "backend"], ["Express", "backend"],
  ["Supabase", "backend"],
  ["PostgreSQL", "database"], ["MySQL", "database"], ["MongoDB", "database"],
  ["Redis", "database"],
  ["React Native", "mobile"], ["Expo", "mobile"],
  ["Gemini", "ai"], ["LLM APIs", "ai"], ["OCR", "ai"],
  ["Cloudflare", "infrastructure"], ["Cloudflare R2", "infrastructure"],
  ["Vercel", "infrastructure"], ["Docker", "infrastructure"],
];

const slugify = (s) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

async function seedTechnologies() {
  const rows = TECHNOLOGIES.map(([name, category], i) => ({
    name,
    slug: slugify(name),
    category,
    sort_order: i + 1,
    is_active: true,
  }));
  check(await db.from("technologies").upsert(rows, { onConflict: "slug" }));
  return rows.length;
}

// ---------------------------------------------------------------------------
// Process
// ---------------------------------------------------------------------------

const PROCESS = [
  ["Discovery", "We start by understanding the business problem, not the feature list. What is slow, manual, or losing you money?", "search"],
  ["Proposal", "A written scope with a fixed price or a clear rate, what is included, what is not, and how long it will take.", "file-text"],
  ["Design", "Screens and flows agreed before a line of code is written, so changes cost minutes instead of weeks.", "pen-tool"],
  ["Development", "Built in short cycles. You see working software as it comes together, not at the end.", "code"],
  ["Testing", "Functionality, performance, mobile behaviour and security checked before anything reaches your users.", "check-circle"],
  ["Launch", "Deployment, domain, analytics, search setup, and a handover so your team knows how everything works.", "rocket"],
  ["Support", "We stay available after launch. Software that nobody maintains stops being an asset.", "life-buoy"],
];

async function seedProcess() {
  check(await db.from("process_steps").delete().gt("step_number", 0));
  const rows = PROCESS.map(([title, description, icon], i) => ({
    step_number: i + 1,
    title,
    description,
    icon,
    is_active: true,
  }));
  check(await db.from("process_steps").insert(rows));
  return rows.length;
}

// ---------------------------------------------------------------------------
// Services
// ---------------------------------------------------------------------------

const SERVICES = [
  {
    slug: "web-development",
    name: "Website Development",
    short_name: "Websites",
    icon: "globe",
    summary:
      "Fast, responsive business websites that load quickly, rank well and turn visitors into enquiries.",
    hero_heading: "Websites built to be found, and built to convert",
    hero_subheading:
      "A website is not a brochure. It is the first thing a customer judges you by, and often the only salesperson working at midnight.",
    included_items: [
      "Business and corporate websites",
      "Landing pages built around a single conversion",
      "E-commerce storefronts",
      "Content-managed websites you can edit yourself",
      "Responsive layouts, mobile first",
      "Technical SEO from day one",
      "Core Web Vitals within Google's thresholds",
    ],
    audience: [
      "Businesses whose current site is slow, dated or unmanageable",
      "Companies with no website at all",
      "Shops moving online for the first time",
    ],
    approach: [
      "Content and structure planned before design",
      "Every page server-rendered so search engines see the full content",
      "Images optimised and served from a CDN",
      "An admin panel so you never pay a developer to change a phone number",
    ],
    price_from: 35000,
    price_note: "Typical business website. Final quote depends on scope.",
    is_custom_quote: false,
    sort_order: 1,
    seo_title: "Website Development Company in India",
    seo_description:
      "Custom business website development — fast, responsive, SEO-ready, with an admin panel so you can manage content yourself.",
  },
  {
    slug: "web-application-development",
    name: "Web Application Development",
    short_name: "Web Apps",
    icon: "layout-dashboard",
    summary:
      "Dashboards, portals and internal tools that replace the spreadsheets your business has outgrown.",
    hero_heading: "When a spreadsheet stops being enough",
    hero_subheading:
      "Most businesses do not need more software. They need one system that replaces the six places their data currently lives.",
    included_items: [
      "Custom web applications",
      "SaaS products",
      "Admin dashboards and reporting",
      "CRM systems",
      "Customer and vendor portals",
      "Internal business tools",
      "Role-based access control",
    ],
    audience: [
      "Teams running operations out of Excel and WhatsApp",
      "Businesses with a process no off-the-shelf tool fits",
      "Founders building a SaaS product",
    ],
    approach: [
      "We map your actual workflow before designing screens",
      "Permissions modelled properly, so people see only what they should",
      "Built to handle real data volume, not just a demo",
      "Exportable data — you are never locked in",
    ],
    price_from: 90000,
    price_note: "Varies significantly with workflow complexity.",
    is_custom_quote: false,
    sort_order: 2,
    seo_title: "Web Application Development Services",
    seo_description:
      "Custom web applications, dashboards, CRM and business portals built around how your business actually works.",
  },
  {
    slug: "mobile-app-development",
    name: "Mobile App Development",
    short_name: "Mobile Apps",
    icon: "smartphone",
    summary:
      "Android and iOS apps from a single codebase, so you are not paying twice for the same product.",
    hero_heading: "One app, both platforms",
    hero_subheading:
      "Cross-platform development means Android and iOS share the same code — roughly half the cost, and one team to talk to.",
    included_items: [
      "Android applications",
      "iOS applications",
      "Cross-platform apps with React Native",
      "Push notifications",
      "Offline support where it matters",
      "Play Store and App Store submission",
      "Ongoing maintenance and updates",
    ],
    audience: [
      "Businesses whose customers expect an app",
      "Products that need camera, location or notifications",
      "Teams needing a field or delivery app",
    ],
    approach: [
      "Native behaviour where users expect it, shared code everywhere else",
      "Store submission handled for you, including the parts that get rejected",
      "Built so updates do not require a store review every time",
    ],
    is_custom_quote: true,
    price_note: "Scope varies too widely for a meaningful starting price.",
    sort_order: 3,
    seo_title: "Mobile App Development Company",
    seo_description:
      "Android and iOS app development with React Native — one codebase, both platforms, store submission included.",
  },
  {
    slug: "custom-software-development",
    name: "Custom Software Development",
    short_name: "Custom Software",
    icon: "settings-2",
    summary:
      "Software shaped around your business, for the processes no ready-made product handles properly.",
    hero_heading: "Software that fits the business, not the other way round",
    hero_subheading:
      "Ready-made software makes you change how you work. Custom software does the opposite — and after a few years, usually costs less than the subscriptions it replaces.",
    included_items: [
      "Business management systems",
      "CRM and ERP-style systems",
      "Inventory and stock management",
      "Booking and scheduling systems",
      "Billing and reporting",
      "Workflow automation",
      "Integration with tools you already use",
    ],
    audience: [
      "Businesses paying for several tools that still do not fit",
      "Operations that depend on one person's spreadsheet",
      "Companies whose process is their competitive advantage",
    ],
    approach: [
      "Start with the one process costing the most time, prove value, then expand",
      "You own the source code outright on delivery",
      "Documented, so another developer could pick it up",
    ],
    is_custom_quote: true,
    price_note: "Quoted after a scoping conversation.",
    sort_order: 4,
    seo_title: "Custom Software Development Company in India",
    seo_description:
      "Custom business software — CRM, inventory, booking and management systems built around your existing process.",
  },
  {
    slug: "ai-development",
    name: "AI Development & Automation",
    short_name: "AI & Automation",
    icon: "sparkles",
    summary:
      "Practical AI that removes manual work — document processing, support automation and workflows that run themselves.",
    hero_heading: "AI that does a job, not a demo",
    hero_subheading:
      "The useful question is not what AI can do. It is which repetitive task in your business is costing hours every week — and whether it can be automated reliably.",
    included_items: [
      "AI integrations into existing systems",
      "Support and enquiry chatbots",
      "OCR and document data extraction",
      "AI-assisted workflows",
      "LLM API integration",
      "Business process automation",
    ],
    audience: [
      "Businesses typing data from documents into systems by hand",
      "Teams answering the same questions repeatedly",
      "Operations with a slow, manual approval chain",
    ],
    approach: [
      "We automate a task with a measurable cost, not the most impressive one",
      "A human stays in the loop wherever a mistake would be expensive",
      "Built on our own experience — Apka Saathi runs OCR and AI in production",
    ],
    is_custom_quote: true,
    price_note: "Depends entirely on the process being automated.",
    sort_order: 5,
    seo_title: "AI Development and Business Automation Services",
    seo_description:
      "AI integration, OCR document processing, chatbots and workflow automation for businesses.",
  },
  {
    slug: "seo",
    name: "SEO",
    short_name: "SEO",
    icon: "trending-up",
    summary:
      "Technical and on-page SEO that makes your site findable — measured against real search data, not vanity reports.",
    hero_heading: "Being found by people already looking for you",
    hero_subheading:
      "Search traffic is the cheapest customer acquisition there is. It is also the slowest, which is why honesty about timelines matters more than promises.",
    included_items: [
      "Technical SEO audits and fixes",
      "On-page optimisation",
      "Local SEO and Google Business Profile",
      "Keyword research grounded in real search volume",
      "Search Console and analytics setup",
      "Core Web Vitals and performance work",
      "Structured data",
    ],
    audience: [
      "Businesses invisible for the terms their customers search",
      "Sites that were never set up for search",
      "Local businesses competing in one city",
    ],
    approach: [
      "Technical foundation first — content cannot rank on a broken site",
      "Reporting against Search Console, not a made-up score",
      "No guaranteed rankings. Anyone guaranteeing them is guessing",
    ],
    price_from: 15000,
    price_note: "Monthly retainer. One-off audits quoted separately.",
    is_custom_quote: false,
    sort_order: 6,
    seo_title: "SEO Services for Businesses in India",
    seo_description:
      "Technical SEO, on-page optimisation and local SEO, reported against real Search Console data.",
  },
  {
    slug: "digital-marketing",
    name: "Digital Marketing",
    short_name: "Marketing",
    icon: "megaphone",
    summary:
      "Paid and organic campaigns built to generate enquiries, measured by cost per lead rather than impressions.",
    hero_heading: "Marketing measured in enquiries, not impressions",
    hero_subheading:
      "Reach is easy to buy and easy to report. What matters is what a genuine enquiry costs you, and whether that number is improving.",
    included_items: [
      "Google Ads",
      "Meta Ads",
      "Social media marketing",
      "Content strategy",
      "Landing pages built for the campaign",
      "Conversion tracking and attribution",
    ],
    audience: [
      "Businesses spending on ads without knowing what works",
      "Companies launching a new product or location",
      "Teams with traffic that does not convert",
    ],
    approach: [
      "Tracking configured before spending begins — otherwise the data is worthless",
      "Landing page and campaign designed together",
      "Small budget first to find what works, then scale",
    ],
    is_custom_quote: true,
    price_note: "Management fee plus your ad spend, quoted per campaign.",
    sort_order: 7,
    seo_title: "Digital Marketing Services",
    seo_description:
      "Google Ads, Meta Ads and content marketing with proper conversion tracking and cost-per-lead reporting.",
  },
];

async function seedServices() {
  const rows = SERVICES.map((s) => ({ ...s, status: "published" }));
  check(await db.from("services").upsert(rows, { onConflict: "slug" }));
  return rows.length;
}

// ---------------------------------------------------------------------------
// FAQs
// ---------------------------------------------------------------------------

const FAQS = [
  [
    "How much does a website or application cost?",
    "A business website typically starts around ₹35,000 and a custom application around ₹90,000, but the honest answer is that it depends on scope. We give a written fixed quote after one scoping conversation, so you are never surprised by the invoice.",
    ["home", "pricing"],
  ],
  [
    "How long does a project take?",
    "A business website is usually three to five weeks. A custom application is typically eight to sixteen weeks depending on how many workflows it covers. We give a dated timeline in the proposal and tell you immediately if anything is slipping.",
    ["home", "pricing"],
  ],
  [
    "Who owns the code?",
    "You do, completely, on final delivery. You receive the full source code and can take it to any developer. We do not hold your software hostage.",
    ["home", "pricing"],
  ],
  [
    "Why do some services say custom quote instead of a price?",
    "Because a starting figure for them would be misleading rather than helpful. A mobile app, a custom system or an automation project varies so much with scope that any number we published would be wrong for most of the people reading it. One scoping conversation gets you a real figure instead.",
    ["pricing"],
  ],
  [
    "What is not included in the price?",
    "Third-party costs, which stay in your name and are billed at cost with no margin: domain, hosting, paid services, app store fees and advertising spend. Content writing and photography are separate unless the scope names them. Everything else that is in the written scope is in the price.",
    ["pricing"],
  ],
  [
    "How do payments work?",
    "The proposal sets out the schedule before anything starts — usually a payment to begin, one or more at agreed stages, and the balance on delivery. Prices are exclusive of taxes, which are shown separately on the invoice. Nothing is invoiced that was not in the written scope.",
    ["pricing"],
  ],
  [
    "What if the project needs more than we agreed?",
    "We quote it separately before doing it, and you decide. A fixed price only means something if additions are handled as additions rather than appearing on the final invoice as a surprise.",
    ["pricing"],
  ],
  [
    "Can we edit the content ourselves?",
    "Yes. Everything we build comes with an admin panel — text, images, menus, pages, blog posts. You should never have to pay a developer to change a phone number.",
    ["home"],
  ],
  [
    "What happens after launch?",
    "Bugs in what we built are fixed free for the warranty period. Beyond that we offer monthly maintenance, or you can call us as needed. We do not disappear after handover.",
    ["home"],
  ],
  [
    "Will you sign an NDA?",
    "Yes, before any detailed discussion if you prefer. Your business information and your data stay confidential.",
    ["home", "contact"],
  ],
  [
    "How quickly will you reply?",
    "Within one working day, and usually sooner. The reply comes from the person who would work on your project, not from a scheduler asking you to pick a slot.",
    ["contact"],
  ],
  [
    "What should I put in the first message?",
    "What you are trying to fix, roughly when you need it, and anything already decided — an existing site, a system it has to talk to, a budget you cannot exceed. Two or three sentences is enough to start.",
    ["contact"],
  ],
  [
    "Do you work with businesses outside your city?",
    "Yes. The work happens over calls and shared documents, so where you are changes neither the price nor the timeline.",
    ["contact"],
  ],
  [
    "Do you take small jobs?",
    "Yes, when we can do them properly. If a job would be better handled by a freelancer, or is not worth doing at all, we will say so rather than take it.",
    ["contact"],
  ],
];

async function seedFaqs() {
  check(await db.from("faqs").delete().neq("id", "00000000-0000-0000-0000-000000000000"));
  const rows = FAQS.map(([question, answer, scope], i) => ({
    question,
    answer,
    scope,
    sort_order: i + 1,
    is_active: true,
  }));
  check(await db.from("faqs").insert(rows));
  return rows.length;
}

// ---------------------------------------------------------------------------
// Home page and its sections
//
// The order of this array is the order of the page. Everything here is
// editable from the admin panel afterwards — seeding only means the site is
// never empty and never shows placeholder text to a real visitor.
// ---------------------------------------------------------------------------

const HOME_SECTIONS = [
  {
    type: "hero",
    background_variant: "default",
    content: {
      eyebrow: "Apka Vission — by Apka Saathi Private Limited",
      heading: "Your Vision. We Make It Happen.",
      highlight: "We Make It Happen.",
      subheading:
        "We build websites, mobile apps and custom software for businesses that have outgrown spreadsheets, templates and workarounds.",
      ctaPrimary: { label: "Start Your Project", href: "/request-a-quote" },
      ctaSecondary: { label: "View Our Work", href: "/portfolio" },
      capabilities: [
        "Websites",
        "Web applications",
        "Mobile apps",
        "Custom software",
        "AI & automation",
      ],
    },
  },
  {
    type: "what_we_build",
    background_variant: "muted",
    content: {
      eyebrow: "What we build",
      heading: "Software that does a job",
      description:
        "Not a list of technologies. A list of problems, and what it looks like when they are solved.",
      items: [
        {
          title: "Business websites",
          icon: "globe",
          body: "A site that loads fast, ranks for what your customers actually search, and asks for the enquiry. Edited by you, not by an invoice.",
        },
        {
          title: "Web applications",
          icon: "layout-dashboard",
          body: "Dashboards, portals and internal tools that replace the six places your data currently lives.",
        },
        {
          title: "Mobile apps",
          icon: "smartphone",
          body: "Android and iOS from one codebase. Roughly half the cost of building twice, and one team to talk to.",
        },
        {
          title: "Custom software",
          icon: "settings-2",
          body: "CRM, inventory, bookings and billing, shaped around how you already work instead of forcing you to change it. The source code is yours.",
        },
        {
          title: "AI and automation",
          icon: "sparkles",
          body: "Document data extraction, support automation, workflows that run themselves. We automate the task costing you hours every week, not the one that demonstrates well.",
        },
        {
          title: "Search and growth",
          icon: "trending-up",
          body: "Technical SEO, local search and paid campaigns, reported against real Search Console data rather than a made-up score.",
        },
      ],
    },
  },
  {
    type: "services_grid",
    background_variant: "default",
    content: {
      eyebrow: "Services",
      heading: "Seven ways we can help",
      description:
        "Most projects begin with one of these. Most end up touching two or three.",
    },
  },
  {
    type: "why_choose_us",
    background_variant: "default",
    content: {
      eyebrow: "Why us",
      heading: "Why businesses choose us over a cheaper quote",
      description:
        "There is always someone who will do it for less. Here is what you get instead.",
      points: [
        {
          title: "You talk to the person building it",
          body: "No account manager relaying messages to a team you never meet. The developer writing your code is in the conversation from the first call.",
        },
        {
          title: "Custom, not a template with your logo on it",
          body: "We start from how your business actually works. Nothing we ship is a purchased theme with the colours swapped and your name inserted.",
        },
        {
          title: "You own everything",
          body: "Full source code on delivery, documented well enough that any developer could pick it up. If you ever want to work with someone else, you can.",
        },
        {
          title: "We are still here after launch",
          body: "Software rarely fails because of bugs. It fails from neglect. We stay available afterwards, and we put that in writing before you pay anything.",
        },
      ],
    },
  },
  {
    type: "product_promo",
    background_variant: "muted",
    content: {
      eyebrow: "Our product",
      heading: "We build for ourselves too",
      description:
        "Apka Saathi is our own software, running in production with real users. What we learned building it goes into what we build for you.",
      productName: "Apka Saathi",
      productTagline:
        "An AI-powered personal assistant that reads your documents, remembers what expires when, and tells you before it does.",
      features: [
        {
          title: "Document reminders",
          body: "Insurance, licences, warranties and subscriptions tracked and surfaced before the deadline, not after it.",
        },
        {
          title: "OCR extraction",
          body: "Point a camera at a document and the dates, numbers and names are read straight out of it.",
        },
        {
          title: "Built and maintained by us",
          body: "Not a concept. A live product with users, updates and support — held to the same standard as client work.",
        },
      ],
      href: "/products/apka-saathi",
      linkLabel: "See how it works",
    },
  },
  {
    type: "process_steps",
    background_variant: "muted",
    content: {
      eyebrow: "How we work",
      heading: "How a project actually runs",
      description:
        "Seven steps, a written scope before anything starts, and no invoice you were not expecting.",
    },
  },
  {
    type: "tech_stack",
    background_variant: "default",
    content: {
      eyebrow: "Stack",
      heading: "The tools we build with",
      description:
        "Chosen because they suit the job and will still be maintained in five years — not because they are new.",
    },
  },
  {
    type: "faq",
    background_variant: "default",
    content: {
      eyebrow: "FAQ",
      heading: "The questions worth asking",
      description:
        "The ones we would ask if we were the ones hiring a development company.",
      scope: "home",
    },
  },
  {
    type: "cta_band",
    background_variant: "contrast",
    content: {
      eyebrow: "Next step",
      heading: "Tell us what you are trying to build.",
      description:
        "One conversation, then a written scope and a fixed price. No obligation, and no sequence of sales emails afterwards.",
      ctaPrimary: { label: "Start Your Project", href: "/request-a-quote" },
      showWhatsapp: true,
      whatsappLabel: "Message on WhatsApp",
    },
  },
];

// ---------------------------------------------------------------------------
// Services index page
// ---------------------------------------------------------------------------

/**
 * The /services landing page.
 *
 * It holds an introduction and a closing ask; the seven cards in the middle
 * come from `company.services` through the `services_grid` section, so adding
 * an eighth service publishes it here without touching this file.
 */
const SERVICES_SECTIONS = [
  {
    type: "hero",
    background_variant: "default",
    content: {
      eyebrow: "Services",
      heading: "Seven services. One team. Written scope on every one.",
      highlight: "Written scope on every one.",
      subheading:
        "Most software goes wrong before a line is written — in what nobody agreed. Every engagement here starts with a document that says what you get, what it costs and when it lands.",
      ctaPrimary: { label: "Start Your Project", href: "/request-a-quote" },
      ctaSecondary: { label: "How we work", href: "/process" },
    },
  },
  {
    type: "services_grid",
    background_variant: "default",
    content: {
      eyebrow: "What we do",
      heading: "Pick the one that sounds like your problem",
      description:
        "Not sure which applies? Most projects touch two or three. Describe the problem and we will tell you which of these it needs.",
    },
  },
  {
    type: "process_steps",
    background_variant: "muted",
    content: {
      eyebrow: "How it runs",
      heading: "The same seven steps, whichever service you pick",
      description:
        "You always know which step you are on and what you are waiting for.",
    },
  },
  {
    type: "cta_band",
    background_variant: "contrast",
    content: {
      heading: "Tell us what is not working",
      description:
        "A short description is enough to start. We will come back with a scope, a price and a timeline — not a sales call.",
      ctaPrimary: { label: "Start Your Project", href: "/request-a-quote" },
      showWhatsapp: true,
      whatsappLabel: "Ask on WhatsApp",
    },
  },
];


/**
 * Upsert a page and replace its section set.
 *
 * Sections have no natural key — a heading is not an identity — so they are
 * replaced wholesale rather than merged. That keeps the seed idempotent: the
 * order and content in this file are always exactly what ends up in the
 * database, with no orphans left behind from an earlier run.
 */
async function seedPage(meta, sections) {
  const { data: page, error } = await db
    .from("pages")
    .upsert(meta, { onConflict: "slug" })
    .select("id")
    .single();

  if (error) throw new Error(error.message);

  check(await db.from("page_sections").delete().eq("page_id", page.id));

  const rows = sections.map((section, index) => ({
    page_id: page.id,
    type: section.type,
    sort_order: index + 1,
    is_active: true,
    content: section.content,
    background_variant: section.background_variant,
  }));

  check(await db.from("page_sections").insert(rows));
  return rows.length;
}

const HOME_PAGE = {
  slug: "home",
  title: "Home",
  status: "published",
  // A code route depends on this row, so deletion is blocked by trigger.
  is_system: true,
  schema_type: "WebPage",
  seo_title: "Apka Vission — Website, App & Custom Software Development",
  seo_description:
    "We build websites, mobile apps, custom software and AI-powered solutions for businesses and startups. Written scope, fixed price, and you own the code.",
};

const SERVICES_PAGE = {
  slug: "services",
  title: "Services",
  status: "published",
  is_system: true,
  schema_type: "CollectionPage",
  seo_title: "Software Development Services",
  seo_description:
    "Websites, web applications, mobile apps, custom software, AI automation, digital marketing and ongoing support — seven services, each with a written scope and a fixed price.",
};

const seedHomePage = () => seedPage(HOME_PAGE, HOME_SECTIONS);
const seedServicesPage = () => seedPage(SERVICES_PAGE, SERVICES_SECTIONS);

// ---------------------------------------------------------------------------
// About
// ---------------------------------------------------------------------------

const ABOUT_SECTIONS = [
  {
    type: "page_intro",
    background_variant: "default",
    content: {
      eyebrow: "About us",
      heading: "A small team, deliberately",
      description:
        "Apka Vission is the services arm of Apka Saathi Private Limited. We build websites, applications and custom software for Indian businesses — with the scope written down first, a fixed price attached to it, and the source code handed over at the end.",
      points: ["Written scope", "Fixed price", "You own the code"],
      ctaPrimary: { label: "Start Your Project", href: "/request-a-quote" },
      ctaSecondary: { label: "See what we do", href: "/services" },
    },
  },
  {
    type: "story",
    background_variant: "muted",
    content: {
      eyebrow: "Why we exist",
      heading: "The same three complaints, over and over",
      description:
        "Nearly every business that talks to us has been burned in one of these ways. The company is arranged to make them difficult to repeat.",
      blocks: [
        {
          heading: "A quote is not a scope",
          body: "A number in a WhatsApp message commits nobody to anything. Halfway through, the price moves, and the only record of what was agreed is somebody's memory. We write the scope down before anything is built, and the price is attached to that document.",
        },
        {
          heading: "The handover that never comes",
          body: "Plenty of agencies keep the code, the hosting account and the domain, so leaving them means starting again. You get the source code, the accounts and the credentials on final delivery, documented well enough that any developer could carry on from there.",
        },
        {
          heading: "Silence after launch",
          body: "Software rarely dies of bugs. It dies of neglect. What happens after launch — what is fixed at no cost, what is chargeable, how quickly we reply — is written into the proposal rather than left to goodwill.",
        },
      ],
      aside: {
        heading: "What we will not do",
        items: [
          "Sell you a purchased template with your logo dropped into it.",
          "Quote a price before we understand the work.",
          "Put a demo on this site and let it look like a client paid for it.",
          "Charge you to change a phone number on your own website.",
        ],
      },
    },
  },
  {
    type: "why_choose_us",
    background_variant: "default",
    content: {
      eyebrow: "How we work",
      heading: "Four habits we do not break",
      description:
        "None of these are difficult. They are simply what we would want if we were the ones paying.",
      points: [
        {
          title: "You talk to the person building it",
          body: "No account manager relaying messages to a team you never meet. The developer writing your code is in the conversation from the first call to the handover.",
        },
        {
          title: "Decisions go in writing",
          body: "Scope, price, timeline and what happens after launch are documented before work starts. If something changes, that document changes and you see it.",
        },
        {
          title: "Built to be handed over",
          body: "Readable code, documented setup, accounts in your name. We build as though someone else will maintain it, because one day someone might.",
        },
        {
          title: "We say when we do not know",
          body: "If something is outside what we do well, or the job would be better handled by somebody else, we say so. A project taken on to fill a month helps nobody.",
        },
      ],
    },
  },
  {
    type: "process_steps",
    background_variant: "muted",
    content: {
      eyebrow: "The process",
      heading: "What working with us looks like",
      description:
        "The same seven steps on every project, whichever service you started with.",
    },
  },
  {
    type: "team",
    background_variant: "default",
    content: {
      eyebrow: "The team",
      heading: "The people who would build it",
      description:
        "Everyone listed here works on the projects. There is no separate delivery team you have not met.",
    },
  },
  {
    type: "cta_band",
    background_variant: "contrast",
    content: {
      heading: "Start with a conversation",
      description:
        "Tell us what you are trying to fix. You get a scope, a timeline and a price back — not a call booking link.",
      ctaPrimary: { label: "Start Your Project", href: "/request-a-quote" },
      showWhatsapp: true,
      whatsappLabel: "Ask on WhatsApp",
    },
  },
];

// ---------------------------------------------------------------------------
// Contact
// ---------------------------------------------------------------------------

const CONTACT_SECTIONS = [
  {
    type: "page_intro",
    background_variant: "default",
    content: {
      eyebrow: "Contact",
      heading: "Tell us what you need",
      description:
        "A question, a rough idea or a finished brief — all three are fine. We reply within one working day, and the reply comes from the person who would do the work.",
      points: ["One working day", "No booking link", "NDA on request"],
    },
  },
  {
    type: "contact_channels",
    background_variant: "default",
    content: {
      eyebrow: "Get in touch",
      heading: "Send us a message",
      formHeading: "Write to us",
      formNote:
        "Four fields and a message. If you already know what you want built, the quote form asks the fuller set of questions and comes back with a price.",
      submitLabel: "Send message",
      channelsHeading: "Other ways to reach us",
      channelsFallback:
        "Our phone number and mailbox on the company domain are being set up. Until they are listed here, this form is the reliable route — it reaches us immediately.",
      hoursHeading: "When we are open",
      quoteLink: {
        label: "Request a quote instead",
        href: "/request-a-quote",
        note: "A longer form covering scope, budget and timing, so the first reply can include a price.",
      },
      privacyNote:
        "We use your details only to answer this enquiry. We do not sell them and we do not add you to a mailing list.",
    },
  },
  {
    type: "faq",
    background_variant: "muted",
    content: {
      eyebrow: "Before you write",
      heading: "Asked before the first message",
      description:
        "If your question is here, you have the answer without waiting for a reply.",
      scope: "contact",
    },
  },
];

// ---------------------------------------------------------------------------
// Portfolio
// ---------------------------------------------------------------------------

const PORTFOLIO_SECTIONS = [
  {
    type: "page_intro",
    background_variant: "default",
    content: {
      eyebrow: "Portfolio",
      heading: "Work we can show you",
      description:
        "Every item on this page is labelled for what it is — a client project, a demo we built ourselves, or our own product. Nothing here is presented as something it is not.",
      ctaPrimary: { label: "Start Your Project", href: "/request-a-quote" },
      ctaSecondary: { label: "See our services", href: "/services" },
    },
  },
  {
    type: "portfolio_grid",
    background_variant: "default",
    content: {
      eyebrow: "Selected work",
      heading: "Projects",
      description:
        "Client work appears here once it is live and the client has agreed to be named. Demos carry a demo label wherever they appear.",
      empty: {
        heading: "Nothing published here yet",
        body: "We publish client work only when it is live and the client has agreed to be named, and we do not fill the gap with invented case studies. Until there is something real to show, the most useful thing we can give you is how we work: what each service covers, what it costs, and how a project runs from first call to handover.",
        cta: { label: "See what we do", href: "/services" },
      },
    },
  },
  {
    type: "cta_band",
    background_variant: "contrast",
    content: {
      heading: "Have something in mind?",
      description:
        "Tell us what you are trying to build. You get a written scope, a fixed price and a timeline before any code is written.",
      ctaPrimary: { label: "Start Your Project", href: "/request-a-quote" },
      showWhatsapp: true,
      whatsappLabel: "Ask on WhatsApp",
    },
  },
];

const ABOUT_PAGE = {
  slug: "about",
  title: "About",
  status: "published",
  is_system: true,
  schema_type: "AboutPage",
  seo_title: "About Apka Vission",
  seo_description:
    "Apka Vission is the services arm of Apka Saathi Private Limited — websites, applications and custom software built to a written scope, at a fixed price, with the source code handed over.",
};

const CONTACT_PAGE = {
  slug: "contact",
  title: "Contact",
  status: "published",
  is_system: true,
  schema_type: "ContactPage",
  seo_title: "Contact us",
  seo_description:
    "Send us a message and we reply within one working day — with a scope, a timeline and a price rather than a call booking link.",
};

const PORTFOLIO_PAGE = {
  slug: "portfolio",
  title: "Portfolio",
  status: "published",
  is_system: true,
  schema_type: "CollectionPage",
  seo_title: "Portfolio",
  seo_description:
    "Client projects, demos we built ourselves and our own products — each labelled for exactly what it is.",
};

const seedAboutPage = () => seedPage(ABOUT_PAGE, ABOUT_SECTIONS);
const seedContactPage = () => seedPage(CONTACT_PAGE, CONTACT_SECTIONS);
const seedPortfolioPage = () => seedPage(PORTFOLIO_PAGE, PORTFOLIO_SECTIONS);


// ---------------------------------------------------------------------------
// Pricing plans
//
// A starting price is the single most volatile piece of content on a services
// site, and the one an owner most often needs to change without a developer.
// Every figure here matches the service it corresponds to; a plan that cannot
// honestly name a floor says "custom quote" rather than quoting one anyway.
// ---------------------------------------------------------------------------

const PRICING_PLANS = [
  {
    slug: "starter-website",
    name: "Starter Website",
    tagline: "A small, fast site that says who you are and how to reach you.",
    price_from: 25000,
    price_note: "Up to five pages. Final quote depends on scope.",
    is_custom_quote: false,
    features: [
      "Up to five pages, structured around what you want a visitor to do",
      "Mobile-first layout, checked on real phones rather than a simulator",
      "Admin panel for text, images and menus",
      "Enquiry form, with messages emailed to you as they arrive",
      "Technical SEO, sitemap and social preview cards",
      "Source code handed over on final delivery",
    ],
    is_highlighted: false,
    cta_label: "Request a Quote",
    cta_href: "/request-a-quote?service=web-development",
    sort_order: 1,
  },
  {
    slug: "business-website",
    name: "Business Website",
    tagline: "The full site, with the content managed by you afterwards.",
    price_from: 35000,
    price_note: "Typical business website. Final quote depends on scope.",
    is_custom_quote: false,
    features: [
      "Everything in Starter Website",
      "Page and section builder, so you can rearrange pages yourself",
      "Blog, portfolio or case studies, whichever the business needs",
      "Service pages written around the terms your customers search",
      "Analytics and Search Console connected at launch",
      "Bugs in what we built fixed free during the warranty period",
    ],
    is_highlighted: true,
    cta_label: "Request a Quote",
    cta_href: "/request-a-quote?service=web-development",
    sort_order: 2,
  },
  {
    slug: "web-application",
    name: "Web Application",
    tagline: "Software that runs your workflow, not a brochure with a login.",
    price_from: 90000,
    price_note: "Varies significantly with workflow complexity.",
    is_custom_quote: false,
    features: [
      "Accounts, roles and permissions",
      "The workflows your business actually runs on, modelled properly",
      "Dashboards and reports built from your own data",
      "Integrations with the systems you already use",
      "Written scope agreed before development starts",
      "Source code and database handed over on final delivery",
    ],
    is_highlighted: false,
    cta_label: "Request a Quote",
    cta_href: "/request-a-quote?service=web-application-development",
    sort_order: 3,
  },
  {
    slug: "mobile-app",
    name: "Mobile App",
    tagline: "One codebase, both platforms, published under your account.",
    price_from: null,
    price_note: "Scope varies too widely for a meaningful starting price.",
    is_custom_quote: true,
    features: [
      "Android and iOS from a single codebase",
      "Published under your own developer accounts, which you keep",
      "Offline behaviour and push notifications where they earn their place",
      "The backend the app needs, built alongside it",
      "Store listing prepared and submitted with you",
    ],
    is_highlighted: false,
    cta_label: "Discuss Your App",
    cta_href: "/request-a-quote?service=mobile-app-development",
    sort_order: 4,
  },
  {
    slug: "custom-software",
    name: "Custom Software & AI",
    tagline: "For the process no off-the-shelf product fits.",
    price_from: null,
    price_note: "Quoted after a scoping conversation.",
    is_custom_quote: true,
    features: [
      "Scoping first — the conversation that decides whether to build at all",
      "Internal tools, ERP-style systems and automation",
      "AI where it removes real work, not where it makes a good demonstration",
      "Built to be maintained by someone other than us",
      "Documentation and handover as part of delivery",
    ],
    is_highlighted: false,
    cta_label: "Book a Scoping Call",
    cta_href: "/request-a-quote?service=custom-software-development",
    sort_order: 5,
  },
  {
    slug: "seo-and-marketing",
    name: "SEO & Marketing",
    tagline: "Monthly work on being found, reported in plain numbers.",
    price_from: 15000,
    price_note: "Monthly retainer. One-off audits quoted separately.",
    is_custom_quote: false,
    features: [
      "Technical fixes first, because content cannot outrank a broken site",
      "Keyword and competitor research for your actual market",
      "On-page work and content planning",
      "Google Business Profile and local listings",
      "A monthly report of what changed and what it did",
      "Cancel with a month's notice — no annual lock-in",
    ],
    is_highlighted: false,
    cta_label: "Request a Quote",
    cta_href: "/request-a-quote?service=seo",
    sort_order: 6,
  },
];

async function seedPricing() {
  const rows = PRICING_PLANS.map((plan) => ({
    ...plan,
    currency: "INR",
    status: "published",
  }));
  check(await db.from("pricing_plans").upsert(rows, { onConflict: "slug" }));
  return rows.length;
}

// ---------------------------------------------------------------------------
// Blog categories
//
// Taxonomy only — no posts are seeded. A category is a shelf; seeding a shelf
// claims nothing, whereas seeding an article would claim we had written it.
// ---------------------------------------------------------------------------

const BLOG_CATEGORIES = [
  {
    slug: "building-software",
    name: "Building Software",
    description: "How things are actually built, and why we make the choices we make.",
    sort_order: 1,
  },
  {
    slug: "for-business-owners",
    name: "For Business Owners",
    description: "Plain-language answers to the questions that come up before a project starts.",
    sort_order: 2,
  },
  {
    slug: "getting-found",
    name: "Getting Found",
    description: "Search, speed and the parts of marketing that are really engineering.",
    sort_order: 3,
  },
  {
    slug: "behind-the-work",
    name: "Behind the Work",
    description: "What we are building, what broke, and what we learned from it.",
    sort_order: 4,
  },
];

async function seedBlogCategories() {
  check(await db.from("blog_categories").upsert(BLOG_CATEGORIES, { onConflict: "slug" }));
  return BLOG_CATEGORIES.length;
}

// ---------------------------------------------------------------------------
// Pricing page
// ---------------------------------------------------------------------------

const PRICING_SECTIONS = [
  {
    type: "page_intro",
    background_variant: "default",
    content: {
      eyebrow: "Pricing",
      heading: "What it costs, before you have to ask",
      description:
        "Most development companies make you sit through a call to hear a number. These are the numbers. They are starting points rather than final prices, because the honest answer depends on scope — but you should know the order of magnitude before you spend an hour of your day on us.",
      points: ["Written scope", "Fixed price", "No invoice you did not expect"],
      ctaPrimary: { label: "Request a Quote", href: "/request-a-quote" },
      ctaSecondary: { label: "See what we do", href: "/services" },
    },
  },
  {
    type: "pricing_table",
    background_variant: "default",
    content: {
      eyebrow: "Starting points",
      heading: "Six ways a project usually starts",
      description:
        "Every quote we send is fixed and written down. Where a starting price would be misleading, the plan says custom quote rather than naming a figure we would have to walk back.",
      note: "Prices are exclusive of taxes, which are shown separately on the invoice. Third-party costs — domain, hosting, paid services, app store fees, advertising spend — are billed at cost and named in the proposal before you commit. Nothing is added to an invoice that was not in the written scope.",
      empty: {
        heading: "Pricing is being updated",
        body: "The plans are not showing at the moment. Tell us what you are trying to build and we will send a written scope and a fixed price for it, which is what these cards would have led to anyway.",
        cta: { label: "Request a Quote", href: "/request-a-quote" },
      },
    },
  },
  {
    type: "story",
    background_variant: "muted",
    content: {
      eyebrow: "How we quote",
      heading: "Where the number comes from",
      description:
        "A fixed price is only fair if both sides know exactly what it covers. This is how we get there.",
      blocks: [
        {
          heading: "One scoping conversation, then a written scope",
          body: "We ask what you are trying to fix, who uses it, and what has to be true for it to be worth doing. That conversation becomes a written scope: every screen, every workflow, everything explicitly not included. You approve that document before any price is attached to it.",
        },
        {
          heading: "The price is attached to the scope, not to hours",
          body: "You get one figure for the work in that document, with a payment schedule set out in the proposal. If we estimate badly, that is our problem to absorb. If you add something the scope did not cover, we quote it separately before doing it rather than adding it to the final invoice.",
        },
        {
          heading: "What moves a price",
          body: "The number of distinct workflows, how many roles need different permissions, integrations with systems we do not control, and content — a site with ninety pages of copy that does not exist yet is a different project from one with nine. Design complexity moves it far less than people expect.",
        },
      ],
      aside: {
        heading: "Never in the price",
        items: [
          "Domain, hosting and third-party service fees, which stay in your name",
          "Advertising spend, which you pay directly",
          "Content writing and photography, unless the scope names them",
          "Work outside the written scope, which is quoted before it is started",
        ],
      },
    },
  },
  {
    type: "process_steps",
    background_variant: "default",
    content: {
      eyebrow: "What you are buying",
      heading: "How a project actually runs",
      description:
        "The same seven steps whichever plan you start from, so you know what happens after the invoice is paid.",
    },
  },
  {
    type: "faq",
    background_variant: "default",
    content: {
      eyebrow: "FAQ",
      heading: "The money questions",
      description:
        "Asked by nearly everyone, so they are answered here rather than in the fourth email.",
      scope: "pricing",
    },
  },
  {
    type: "cta_band",
    background_variant: "contrast",
    content: {
      eyebrow: "Next step",
      heading: "Get a fixed price for your project.",
      description:
        "Tell us what you are building. You get a written scope, a fixed price and a dated timeline before any code is written — and no sequence of sales emails afterwards.",
      ctaPrimary: { label: "Request a Quote", href: "/request-a-quote" },
      showWhatsapp: true,
      whatsappLabel: "Ask on WhatsApp",
    },
  },
];

const PRICING_PAGE = {
  slug: "pricing",
  title: "Pricing",
  status: "published",
  is_system: true,
  schema_type: "WebPage",
  seo_title: "Website & Software Development Pricing in India",
  seo_description:
    "Starting prices for websites, web applications, mobile apps, custom software and monthly SEO — with a written scope and a fixed quote before any work begins.",
};

const seedPricingPage = () => seedPage(PRICING_PAGE, PRICING_SECTIONS);

// ---------------------------------------------------------------------------
// Blog index
// ---------------------------------------------------------------------------

const BLOG_SECTIONS = [
  {
    type: "page_intro",
    background_variant: "default",
    content: {
      eyebrow: "Writing",
      heading: "Notes from the build",
      description:
        "What we learn while building, written down in the hope it saves someone else the same afternoon. No listicles, no reposted press releases, and nothing published to hit a schedule.",
      ctaPrimary: { label: "Start Your Project", href: "/request-a-quote" },
      ctaSecondary: { label: "See what we do", href: "/services" },
    },
  },
  {
    type: "blog_list",
    background_variant: "default",
    content: {
      eyebrow: "Articles",
      heading: "Latest posts",
      showFeatured: true,
      empty: {
        heading: "Nothing published here yet",
        body: "We would rather have an empty blog than a full one nobody needed. The first posts will be the things we get asked most often — what a project actually costs, why a site is slow, and what to check before signing with any development company. Until then, the service pages carry the same answers in less detail.",
        cta: { label: "See what we do", href: "/services" },
      },
    },
  },
  {
    type: "cta_band",
    background_variant: "contrast",
    content: {
      heading: "Have a question we have not written about?",
      description:
        "Ask it directly. You will get an answer from the person who would build the thing, not from a form letter.",
      ctaPrimary: { label: "Ask us", href: "/contact" },
      showWhatsapp: true,
      whatsappLabel: "Ask on WhatsApp",
    },
  },
];

const BLOG_PAGE = {
  slug: "blog",
  title: "Blog",
  status: "published",
  is_system: true,
  schema_type: "Blog",
  seo_title: "Blog",
  seo_description:
    "Notes on building websites, applications and custom software — written for the people paying for them as much as for the people building them.",
};

const seedBlogPage = () => seedPage(BLOG_PAGE, BLOG_SECTIONS);

// ---------------------------------------------------------------------------
// Case studies index
// ---------------------------------------------------------------------------

const CASE_STUDIES_SECTIONS = [
  {
    type: "page_intro",
    background_variant: "default",
    content: {
      eyebrow: "Case studies",
      heading: "The whole project, written up",
      description:
        "What the business needed, what we built, what it cost in time, and what happened afterwards — including the parts that did not go to plan. A case study goes up only once the work is live and the client has agreed to be named.",
      ctaPrimary: { label: "Start Your Project", href: "/request-a-quote" },
      ctaSecondary: { label: "See the portfolio", href: "/portfolio" },
    },
  },
  {
    type: "case_studies_grid",
    background_variant: "default",
    content: {
      eyebrow: "Written up",
      heading: "Projects in detail",
      description:
        "Longer than a portfolio entry, because the interesting part of a project is rarely the screenshot.",
      empty: {
        heading: "Nothing published here yet",
        body: "We write a case study after a project is live and the client has agreed to be named, and we do not measure outcomes we cannot show you the source of. Nothing here is a placeholder for work that exists — there is simply none to publish yet. The portfolio lists what we have built so far, each item labelled for exactly what it is.",
        cta: { label: "See the portfolio", href: "/portfolio" },
      },
    },
  },
  {
    type: "cta_band",
    background_variant: "contrast",
    content: {
      heading: "Want to be the first one written up?",
      description:
        "Tell us what you are trying to build. Written scope, fixed price, and the code is yours at the end.",
      ctaPrimary: { label: "Start Your Project", href: "/request-a-quote" },
      showWhatsapp: true,
      whatsappLabel: "Ask on WhatsApp",
    },
  },
];

const CASE_STUDIES_PAGE = {
  slug: "case-studies",
  title: "Case Studies",
  status: "published",
  is_system: true,
  schema_type: "CollectionPage",
  seo_title: "Case Studies",
  seo_description:
    "Full write-ups of the projects we have delivered — the problem, the build, the stack and the outcome, published only with the client's agreement.",
};

const seedCaseStudiesPage = () => seedPage(CASE_STUDIES_PAGE, CASE_STUDIES_SECTIONS);

// ---------------------------------------------------------------------------
// Apka Saathi — our own product
//
// The URL is /products/apka-saathi; the slug is one segment because `pages`
// constrains it to one, deliberately, so a route in code and a row in the
// database can never disagree about what a slash means.
// ---------------------------------------------------------------------------

const PRODUCT_SECTIONS = [
  {
    type: "page_intro",
    background_variant: "default",
    content: {
      eyebrow: "Our product",
      heading: "Apka Saathi",
      description:
        "An assistant for the paperwork nobody enjoys: insurance, licences, warranties and subscriptions, read out of the documents themselves and surfaced before they expire rather than after. We built it, we run it, and we maintain it — it is not client work and it is not a concept.",
      points: ["Built in-house", "Maintained by us", "Not client work"],
      ctaPrimary: { label: "Want something like this?", href: "/request-a-quote" },
      ctaSecondary: { label: "See our services", href: "/services" },
    },
  },
  {
    type: "feature_grid",
    background_variant: "muted",
    content: {
      eyebrow: "What it does",
      heading: "Four things, done properly",
      description:
        "Deliberately narrow. A reminder app that also does notes, budgets and chat is four half-built products.",
      columns: 4,
      features: [
        {
          icon: "file-text",
          title: "Document reminders",
          body: "Insurance, licences, warranties and subscriptions tracked with their real expiry dates, and surfaced before the deadline instead of after it.",
        },
        {
          icon: "search",
          title: "Reads the document",
          body: "Point a camera at a policy or a bill and the dates, numbers and names are extracted from it, so nothing depends on someone typing them in correctly.",
        },
        {
          icon: "sparkles",
          title: "Answers about your own papers",
          body: "Ask what a document actually says or when something is due, and get an answer drawn from your own files rather than a general one.",
        },
        {
          icon: "check-circle",
          title: "A reminder engine you can trust",
          body: "Notice periods rather than a single alarm on the day, because renewing an insurance policy is not a same-morning task.",
        },
      ],
    },
  },
  {
    type: "story",
    background_variant: "default",
    content: {
      eyebrow: "How it works",
      heading: "Add a document, forget about it",
      description:
        "The whole design goal is that the thing you have to remember is nothing.",
      blocks: [
        {
          heading: "You add the document",
          body: "Photograph it or upload the file. Nothing has to be typed in, and nothing has to be filed into the right folder first.",
        },
        {
          heading: "It reads what matters out of it",
          body: "Dates, policy and account numbers, names and amounts are extracted from the document itself. You confirm what it found, correct anything it got wrong, and that correction is what it stores.",
        },
        {
          heading: "It tells you in time to act",
          body: "Reminders are set from the notice period the document actually needs, not from a fixed number of days, so a renewal reaches you while there is still time to compare options.",
        },
      ],
      aside: {
        heading: "Why it is on a services website",
        items: [
          "It is the same standard of work we do for clients, on something we cannot walk away from",
          "Everything we learned building it — OCR, reminders, background jobs — goes into what we build for you",
          "It is labelled as ours everywhere it appears, and never presented as a client project",
        ],
      },
    },
  },
  {
    type: "cta_band",
    background_variant: "contrast",
    content: {
      eyebrow: "For your business",
      heading: "Want something like this, for your work?",
      description:
        "Document reading, reminders and automation are ordinary requirements in most businesses. Tell us the process you are trying to get off paper and we will scope it.",
      ctaPrimary: { label: "Discuss Your Project", href: "/request-a-quote" },
      showWhatsapp: true,
      whatsappLabel: "Ask on WhatsApp",
    },
  },
];

const PRODUCT_PAGE = {
  slug: "products-apka-saathi",
  title: "Apka Saathi",
  status: "published",
  is_system: true,
  schema_type: "SoftwareApplication",
  seo_title: "Apka Saathi — Document Reminders & AI Assistant",
  seo_description:
    "Apka Saathi is our own software: it reads your documents, tracks what expires when, and reminds you in time to act. Built, run and maintained in-house.",
};

const seedProductPage = () => seedPage(PRODUCT_PAGE, PRODUCT_SECTIONS);

// ---------------------------------------------------------------------------
// Privacy policy
//
// Written from what the application actually does, clause by clause, and not
// from a template. Every statement below is checkable against the code: the
// hashed IP, the stored user agent, our own SMTP server, the Mumbai database
// region, the theme preference in local storage.
//
// The company's own details are not written into these clauses. The section
// reads them from site_settings, so the registered address and identifiers are
// stated in one place and cannot drift between the two legal documents.
// ---------------------------------------------------------------------------

const PRIVACY_SECTIONS = [
  {
    type: "page_intro",
    background_variant: "default",
    content: {
      eyebrow: "Legal",
      heading: "Privacy policy",
      description:
        "What this website collects, why, where it is kept and how to have it removed. Written to be read rather than to be survived.",
    },
  },
  {
    type: "legal_document",
    background_variant: "default",
    content: {
      updatedOn: "2026-08-27",
      intro: [
        "This policy covers this website and the enquiry forms on it. Apka Vission is the operating brand of Apka Saathi Private Limited, and the company is the data fiduciary for everything described below.",
        "Work delivered to a client is governed by that project's own agreement, which sets out how data inside the delivered system is handled. Where the two differ, the project agreement governs the project.",
      ],
      clauses: [
        {
          heading: "What we collect when you use the forms",
          body: [
            "The enquiry and quote forms ask for what we need in order to reply usefully, and nothing else.",
          ],
          items: [
            "Your name, email address and — if you give one — a phone or WhatsApp number",
            "Your company name, the service you are asking about, and any budget or timeline you indicate",
            "What you write in the message field, which is the part that actually matters",
            "How you would prefer to be contacted",
          ],
        },
        {
          heading: "What the server records by itself",
          body: [
            "A small amount of technical information is recorded with every submission, purely to keep the forms usable and to know where enquiries come from.",
            "Your IP address is never stored. It is combined with a secret value and hashed, and only that hash is kept — enough to count submissions from one source and stop a flood, and useless to anyone who obtains the table.",
          ],
          items: [
            "A salted hash of your IP address, and a salted hash of your email address, both used only for rate limiting",
            "Your browser's user agent string and the page that referred you",
            "Campaign parameters (utm_source and similar) when you arrive from a link that carries them",
          ],
        },
        {
          heading: "Cookies and browser storage",
          body: [
            "This website sets no advertising cookies and no third-party tracking cookies.",
            "If you switch between the light and dark themes, that choice is saved in your browser's local storage so the site does not flip back on your next visit. It never leaves your device and we cannot read it.",
          ],
        },
        {
          heading: "Why we use it",
          body: [
            "Every use below is one you would expect from having contacted a company about a project.",
          ],
          items: [
            "To reply to your enquiry, and to prepare a scope and a quote for it",
            "To keep a record of the conversation so a later email is not answered by someone with no context",
            "To stop the public forms being flooded, which is the only purpose the hashes serve",
            "To understand which pages and campaigns bring genuine enquiries",
          ],
        },
        {
          heading: "We do not use it for marketing you did not ask for",
          body: [
            "Submitting a form does not subscribe you to anything. We do not sell, rent or trade personal information, and we do not pass it to advertising networks or data brokers.",
            "If a conversation ends, it ends. There is no sequence of follow-up emails afterwards.",
          ],
        },
        {
          heading: "Who else can see it",
          body: [
            "We keep the number of companies involved deliberately small, and we do not use a third-party email sending service — our own mail server sends the notifications, so lead data is not handed to another vendor to deliver.",
          ],
          items: [
            "Our database and authentication provider, Supabase, on servers in the Mumbai region",
            "Our hosting provider, Vercel, which serves the website itself",
            "Cloudflare R2, where images and files shown on the site are stored",
            "Our own SMTP mail server, which delivers the notification and the acknowledgement you receive",
          ],
        },
        {
          heading: "Where it is kept",
          body: [
            "The database is hosted in the Mumbai (ap-south-1) region, so enquiry data stays in India at rest.",
            "Email is different by nature: a message travels through the mail infrastructure of both the sender and the recipient, which may be outside India. That is true of any email to any company, and we mention it because a policy that claimed otherwise would be wrong.",
          ],
        },
        {
          heading: "How long we keep it",
          body: [
            "Enquiries are kept while there is a business reason to keep them — an active conversation, a live project, or a record we are required to retain for tax or contractual purposes.",
            "The rate-limiting records are short-lived and hold no readable personal data. When an enquiry no longer has a reason to exist, it is deleted rather than archived indefinitely.",
          ],
        },
        {
          heading: "Your rights",
          body: [
            "You can ask us to do any of the following, and you do not have to give a reason.",
          ],
          items: [
            "Tell you what we hold about you",
            "Correct anything that is wrong",
            "Delete it, unless we are required to keep it",
            "Withdraw a consent you gave, which stops any further use from that point",
          ],
        },
        {
          heading: "How we protect it",
          body: [
            "Every connection to this site and to the database is encrypted in transit. Access to enquiry data is restricted at the database itself by row-level security rather than only in application code, so a mistake in a screen cannot expose a table.",
            "No system is perfect and any claim of absolute security would be dishonest. What we can say is that the number of people and services with access is kept as small as the work allows.",
          ],
        },
        {
          heading: "Children",
          body: [
            "This website is for businesses and is not directed at children. We do not knowingly collect information from anyone under eighteen. If you believe a child has sent us something, tell us and we will remove it.",
          ],
        },
        {
          heading: "Changes to this policy",
          body: [
            "When the business changes how it handles data, this page changes with it and the date at the top is updated. It is a live document rather than a file signed once and forgotten, which is why every clause here is editable without a developer.",
          ],
        },
      ],
      contact: {
        heading: "Questions, corrections and complaints",
        body: [
          "Write to us at the address below and say what you want done. A request to see, correct or delete your information is acted on rather than argued with.",
          "If you are not satisfied with how we have handled a request, you may raise it with the Data Protection Board under the Digital Personal Data Protection Act, 2023.",
        ],
      },
    },
  },
];

const PRIVACY_PAGE = {
  slug: "privacy-policy",
  title: "Privacy Policy",
  status: "published",
  is_system: true,
  schema_type: "WebPage",
  seo_title: "Privacy Policy",
  seo_description:
    "What this website collects, why, where it is stored and how to have it removed — written from what the application actually does.",
};

const seedPrivacyPage = () => seedPage(PRIVACY_PAGE, PRIVACY_SECTIONS);

// ---------------------------------------------------------------------------
// Terms and conditions
// ---------------------------------------------------------------------------

const TERMS_SECTIONS = [
  {
    type: "page_intro",
    background_variant: "default",
    content: {
      eyebrow: "Legal",
      heading: "Terms and conditions",
      description:
        "The terms for using this website, and the terms a project runs on. Short, because the parts that matter are in the proposal you actually sign.",
    },
  },
  {
    type: "legal_document",
    background_variant: "default",
    content: {
      updatedOn: "2026-08-27",
      intro: [
        "These terms govern the use of this website and set out how we engage on work. Apka Vission is the operating brand of Apka Saathi Private Limited, and the company is the contracting party.",
        "Every project is governed by its own written proposal and scope. Where these terms and a signed proposal differ, the proposal governs that project — a website footer cannot bind an engagement, and pretending otherwise helps nobody.",
      ],
      clauses: [
        {
          heading: "Using this website",
          body: [
            "You may read, print and share anything on this site. You may not copy its content to present as your own, scrape it at a volume that degrades it for others, or attempt to gain access to systems behind it.",
            "The text, design, code and images on this site belong to us, except where they are clearly attributed to someone else.",
          ],
        },
        {
          heading: "What the prices on this site are",
          body: [
            "The figures on the pricing page and the service pages are starting points, published so you can judge the order of magnitude before contacting us. They are not offers and they are not quotes.",
            "A quote is a written document, prepared after a scoping conversation, naming exactly what is included. Only that document is binding, and only for the period it states.",
          ],
        },
        {
          heading: "How an engagement starts",
          body: [
            "Work begins when you approve a written scope and the proposal attached to it. The proposal names the deliverables, the timeline, the payment schedule and anything explicitly excluded.",
            "Nothing outside that scope is started without a separate written agreement on what it adds to the price and the timeline. This is the whole reason the scope exists.",
          ],
        },
        {
          heading: "What we need from you",
          body: [
            "A project runs on decisions and content as much as on code. Delays in providing either move the timeline, and we will say so at the time rather than at the end.",
          ],
          items: [
            "Content, images and access to any existing systems, at the points the plan asks for them",
            "One person empowered to make decisions and to sign off completed stages",
            "Confirmation that you own or are licensed to use anything you send us",
          ],
        },
        {
          heading: "Payment",
          body: [
            "The payment schedule is set out in the proposal and is agreed before work starts. Invoices are payable by the date on the invoice.",
            "Prices are exclusive of taxes, which are shown separately. Third-party costs — domain, hosting, paid services, app store fees, advertising spend — are yours, billed at cost with no margin added, and named in the proposal before you commit.",
          ],
        },
        {
          heading: "Ownership of what we build",
          body: [
            "On final delivery and full payment, the source code and the deliverables for your project are yours. You receive the code and can take it to any developer.",
            "Two exceptions, stated plainly: the third-party components and open-source libraries used in the build stay under their own licences, and the general knowledge, techniques and reusable internal tooling we brought to the project remain ours to use again.",
          ],
        },
        {
          heading: "Accounts and services in your name",
          body: [
            "Domains, hosting, app store accounts and paid third-party services are registered in your name wherever possible, and the credentials are yours. We do not hold a business hostage through an account it cannot access.",
          ],
        },
        {
          heading: "After launch",
          body: [
            "Defects in what we built are fixed free during the warranty period named in your proposal. That covers our work behaving differently from the agreed scope.",
            "It does not cover new features, changes you decide on afterwards, or breakage caused by someone else editing the code or by a third-party service changing. Those are quoted as new work, and maintenance is available monthly if you would rather not think about it.",
          ],
        },
        {
          heading: "Showing the work",
          body: [
            "We may describe a project publicly and name you as a client only after it is live and you have agreed to be named. If you would rather we did not, say so and we will not — and nothing already published stays up against your wishes.",
            "Work built for ourselves is always labelled as ours. We never present a demo or an internal product as a client engagement.",
          ],
        },
        {
          heading: "Confidentiality",
          body: [
            "Anything you tell us about your business in the course of an enquiry or a project is treated as confidential, whether or not an NDA has been signed. We will sign one before a detailed discussion if you prefer.",
          ],
        },
        {
          heading: "Limits of our liability",
          body: [
            "We are liable for delivering the work described in your scope. We are not liable for indirect or consequential losses — lost profits, lost data on systems we do not operate, or business interruption caused by a third-party service.",
            "Where liability cannot be excluded by law, it is limited to the fees paid for the project the claim relates to. This is the ordinary position for development work at this scale, and it is stated here rather than buried.",
          ],
        },
        {
          heading: "Ending an engagement",
          body: [
            "Either side may end a project in writing. You pay for work completed and for anything committed on your behalf up to that point; we hand over what has been built and paid for, in a usable state.",
          ],
        },
        {
          heading: "Governing law",
          body: [
            "These terms are governed by the laws of India, and the courts of India have jurisdiction over any dispute arising from them.",
          ],
        },
        {
          heading: "Changes to these terms",
          body: [
            "These terms may change as the business does, and the date at the top shows when they last did. A change here does not alter the terms of a proposal already signed.",
          ],
        },
      ],
      contact: {
        heading: "Who you are contracting with",
        body: [
          "Questions about these terms, or about a proposal, go to the address below and are answered by a person.",
        ],
      },
    },
  },
];

const TERMS_PAGE = {
  slug: "terms-and-conditions",
  title: "Terms & Conditions",
  status: "published",
  is_system: true,
  schema_type: "WebPage",
  seo_title: "Terms & Conditions",
  seo_description:
    "Terms for using this website and for how a project runs — scope, payment, ownership of the code, warranty and liability.",
};

const seedTermsPage = () => seedPage(TERMS_PAGE, TERMS_SECTIONS);

// ---------------------------------------------------------------------------
// SEO defaults
// ---------------------------------------------------------------------------

async function seedSeoDefaults() {
  check(
    await db
      .from("seo_defaults")
      .update({
        // The column defaults name the legal entity, which is right on a
        // contract and wrong in a browser tab. The public brand is Apka
        // Vission; Apka Saathi Private Limited is named in the footer, the
        // legal pages and the Organization document below.
        title_template: "%s | Apka Vission",
        default_title:
          "Apka Vission — Website, App & Custom Software Development",
        default_description:
          "Apka Vission builds modern websites, mobile apps, custom software and AI-powered digital solutions for businesses and startups. Your Vision. We Make It Happen.",
        /*
          Deliberately empty.

          This column overrides the generated Organization graph outright, by
          design — an admin editing it is saying the generated version is wrong
          for them. Seeding it with values that `site_settings` already holds
          looked harmless and was not: it froze the graph, so an owner filling
          in a phone number, an address, a CIN or a social profile in Settings
          saw none of it reach search engines, with nothing to indicate why.

          Empty means "generate it from the settings", which is right for every
          company that has not asked for something the builder cannot express.
        */
        organization_schema: {},
        // Kept on until the domain is live, so nothing is indexed prematurely.
        site_noindex: true,
      })
      .eq("id", 1),
  );
}

// ---------------------------------------------------------------------------

console.log("\nSeeding company content\n");

await step("site settings", seedSiteSettings);
await step("brand media", seedBrandMedia);
await step("seo defaults", seedSeoDefaults);
await step("navigation", seedNavigation);
await step("technologies", seedTechnologies);
await step("process steps", seedProcess);
await step("services", seedServices);
await step("pricing plans", seedPricing);
await step("blog categories", seedBlogCategories);
await step("faqs", seedFaqs);
await step("home page + sections", seedHomePage);
await step("services page + sections", seedServicesPage);
await step("about page + sections", seedAboutPage);
await step("contact page + sections", seedContactPage);
await step("portfolio page + sections", seedPortfolioPage);
await step("pricing page + sections", seedPricingPage);
await step("blog page + sections", seedBlogPage);
await step("case studies page + sections", seedCaseStudiesPage);
await step("product page + sections", seedProductPage);
await step("privacy policy + sections", seedPrivacyPage);
await step("terms page + sections", seedTermsPage);

/**
 * Clear the caches the seed just invalidated.
 *
 * Every read in the application is cached under a tag with no expiry, so a
 * database write alone changes nothing a visitor can see. In the application
 * the admin panel calls `revalidateTag` in-process; a script outside that
 * process has to ask the running server to do it.
 *
 * A server that is not running is not an error — there is simply no cache to
 * clear yet, and the next start will read fresh.
 */
async function revalidate() {
  const target = env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const secret = env.REVALIDATE_SECRET;

  if (!secret) {
    console.log("  (REVALIDATE_SECRET not set — skipping cache invalidation)");
    return;
  }

  const tags = [
    "site-settings",
    "seo-defaults",
    "navigation",
    "technologies",
    "process",
    "services",
    "faqs",
    "pages",
    "projects",
    "team",
    "pricing",
    "blog",
    "case-studies",
    "page:home",
    "page:services",
    "page:about",
    "page:contact",
    "page:portfolio",
    "page:pricing",
    "page:blog",
    "page:case-studies",
    "page:products-apka-saathi",
    "page:privacy-policy",
    "page:terms-and-conditions",
  ];

  try {
    const response = await fetch(`${target}/api/revalidate`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-revalidate-secret": secret },
      body: JSON.stringify({ tags }),
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return tags.length;
  } catch {
    console.log("  (no server reachable — caches will be cold on next start)");
  }
}

await step("revalidate caches", revalidate);

console.log(failed ? "\nCompleted with errors.\n" : "\nDone.\n");
process.exit(failed ? 1 : 0);
