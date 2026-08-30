"use server";

import { canReach } from "@/lib/auth/menu";
import { getStaffSession } from "@/lib/auth/session";
import {
  MIN_QUERY,
  PER_SOURCE,
  safeQuery,
  SOURCES,
  text,
  type SearchHit,
} from "@/lib/search/sources";
import { createClient } from "@/lib/supabase/server";

/**
 * Find records the signed-in person may reach.
 *
 * A Server Action rather than a query module, and this is the one place that
 * rule bends: everywhere else on this panel a read is done by the Server
 * Component that renders it, because "a list of options is a read, not an
 * action". The palette is typed into by a person in a browser, so a client has
 * to be able to ask — and a Server Action is the only way a client asks the
 * database anything here. It writes nothing and invalidates nothing.
 *
 * **The menu decides which tables are searched at all**, and it is re-resolved
 * on the server for every call. Never passed in from the palette: a posted
 * request could name anything, and an editor who cannot open the enquiries
 * screen must not be able to read a lead's name out of a search box. RLS
 * refuses most of it underneath, but "most" is not the standard — which
 * screens a person may reach is a question this codebase answers in exactly
 * one place.
 *
 * Every allowed source is queried in parallel and each contributes at most
 * five rows. A source that fails is skipped rather than failing the search: a
 * palette that returns nothing because one table was slow is worse than one
 * that returns most of the answer.
 */
export async function searchAdmin(query: string): Promise<SearchHit[]> {
  const session = await getStaffSession();
  if (!session) return [];

  const term = safeQuery(query);
  if (term.length < MIN_QUERY) return [];

  const allowed = SOURCES.filter((source) =>
    canReach(session.profile, session.role, source.menu),
  );

  if (allowed.length === 0) return [];

  const supabase = await createClient();

  const results = await Promise.all(
    allowed.map(async (source) => {
      const filter = source.match.map((column) => `${column}.ilike.%${term}%`).join(",");

      /*
        `select` takes a string the generated client cannot check against a
        table it only knows as a union, so the builder is narrowed once here
        rather than at each of the three calls. The column list still comes
        from `SOURCES`, beside the mapper that reads those columns back, which
        is what actually keeps the two in step.
      */
      const query = supabase.from(source.table) as unknown as {
        select: (columns: string) => {
          or: (filter: string) => {
            limit: (count: number) => Promise<{
              data: unknown[] | null;
              error: { message: string } | null;
            }>;
          };
        };
      };

      const { data, error } = await query
        .select(source.select)
        .or(filter)
        .limit(PER_SOURCE);

      if (error) {
        console.error(`[search] ${source.table} failed:`, error.message);
        return [];
      }

      return (data ?? []).map((row) => {
        const record = row as unknown as Record<string, unknown>;
        const described = source.row(record);

        return {
          id: `${source.table}:${text(record.id)}`,
          menu: source.menu,
          ...described,
        } satisfies SearchHit;
      });
    }),
  );

  // Rows with no name are dropped rather than shown as a blank line: every
  // table here has a required name column, so one is a row mid-migration or a
  // select that stopped matching its mapper.
  return results.flat().filter((hit) => hit.label.trim() !== "");
}
