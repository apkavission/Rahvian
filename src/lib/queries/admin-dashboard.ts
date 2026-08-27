import "server-only";

import { createClient } from "@/lib/supabase/server";

/**
 * Dashboard reads.
 *
 * Deliberately uncached, unlike everything in the rest of `lib/queries`. The
 * public site is cached indefinitely and cleared on write, because a visitor
 * must never wait for a query. The admin is the opposite case: the owner has
 * just changed something and needs to see that it changed. A stale dashboard
 * is not a performance win, it is a bug report.
 *
 * Every read goes through the session-bound client, so RLS decides what this
 * account may see. An editor calling the lead counters gets zero rows rather
 * than an error — which is why the caller checks the role before rendering
 * that panel at all, instead of showing an empty one.
 */

export interface ContentCounts {
  pages: number;
  services: number;
  projects: number;
  caseStudies: number;
  posts: number;
  pricingPlans: number;
  faqs: number;
  team: number;
  media: number;
}

export interface LeadCounts {
  total: number;
  new: number;
  thisWeek: number;
}

export interface RecentLead {
  id: string;
  name: string;
  email: string;
  company_name: string | null;
  status: string;
  created_at: string;
}

/** A published row with no meta description — an SEO gap worth naming. */
export interface SeoGap {
  kind: string;
  title: string;
  href: string;
}

/**
 * Tables the dashboard counts.
 *
 * Named explicitly rather than derived from the client's own parameter type:
 * the generated `from()` is overloaded per table, so `Parameters<...>[0]`
 * collapses to `never` and every call fails to typecheck. A literal union also
 * says which tables the dashboard is allowed to touch.
 */
type CountableTable =
  | "pages"
  | "services"
  | "projects"
  | "case_studies"
  | "blog_posts"
  | "pricing_plans"
  | "faqs"
  | "team_members"
  | "media";

export async function getContentCounts(): Promise<ContentCounts> {
  const supabase = await createClient();

  const count = async (table: CountableTable) => {
    const { count, error } = await supabase
      .from(table)
      .select("id", { count: "exact", head: true });
    if (error) {
      console.error(`[admin] count failed for ${table}:`, error.message);
      return 0;
    }
    return count ?? 0;
  };

  const [
    pages,
    services,
    projects,
    caseStudies,
    posts,
    pricingPlans,
    faqs,
    team,
    media,
  ] = await Promise.all([
    count("pages"),
    count("services"),
    count("projects"),
    count("case_studies"),
    count("blog_posts"),
    count("pricing_plans"),
    count("faqs"),
    count("team_members"),
    count("media"),
  ]);

  return { pages, services, projects, caseStudies, posts, pricingPlans, faqs, team, media };
}

export async function getLeadCounts(): Promise<LeadCounts> {
  const supabase = await createClient();

  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [total, fresh, thisWeek] = await Promise.all([
    supabase.from("leads").select("id", { count: "exact", head: true }),
    supabase
      .from("leads")
      .select("id", { count: "exact", head: true })
      .eq("status", "new"),
    supabase
      .from("leads")
      .select("id", { count: "exact", head: true })
      .gte("created_at", weekAgo),
  ]);

  return {
    total: total.count ?? 0,
    new: fresh.count ?? 0,
    thisWeek: thisWeek.count ?? 0,
  };
}

export async function getRecentLeads(limit = 5): Promise<RecentLead[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("leads")
    .select("id, name, email, company_name, status, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[admin] recent leads failed:", error.message);
    return [];
  }

  return data ?? [];
}

/**
 * Published content with no meta description.
 *
 * Only published rows are listed. A draft without a description is a draft; a
 * live page without one is a search result Google will write itself, usually
 * out of the first sentence it finds.
 */
export async function getSeoGaps(limit = 8): Promise<SeoGap[]> {
  const supabase = await createClient();

  const [pages, services, posts] = await Promise.all([
    supabase
      .from("pages")
      .select("slug, title")
      .eq("status", "published")
      .is("seo_description", null)
      .limit(limit),
    supabase
      .from("services")
      .select("slug, name")
      .eq("status", "published")
      .is("seo_description", null)
      .limit(limit),
    supabase
      .from("blog_posts")
      .select("slug, title")
      .eq("status", "published")
      .is("seo_description", null)
      .limit(limit),
  ]);

  const gaps: SeoGap[] = [
    ...(pages.data ?? []).map((row) => ({
      kind: "Page",
      title: row.title,
      href: `/admin/pages`,
    })),
    ...(services.data ?? []).map((row) => ({
      kind: "Service",
      title: row.name,
      href: `/admin/services`,
    })),
    ...(posts.data ?? []).map((row) => ({
      kind: "Post",
      title: row.title,
      href: `/admin/blog`,
    })),
  ];

  return gaps.slice(0, limit);
}
