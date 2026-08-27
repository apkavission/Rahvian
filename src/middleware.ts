import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/types/database";
import { clientEnv } from "@/lib/env";
import { DB_SCHEMA } from "@/lib/supabase/constants";

/**
 * Whether this request carries a Supabase session at all.
 *
 * Without this check every anonymous visitor to a static marketing page would
 * pay for a token verification round-trip to the auth server before the page
 * could be served. A visitor with no auth cookie has nothing to refresh and
 * cannot be signed in, so the whole client is skipped.
 */
function hasAuthCookie(request: NextRequest): boolean {
  return request.cookies.getAll().some((cookie) => cookie.name.startsWith("sb-"));
}

/**
 * Session refresh, and the first gate in front of `/admin`.
 *
 * Two jobs, and only these two.
 *
 * The first is refreshing the Supabase session. Access tokens are short-lived,
 * and a Server Component cannot set a cookie — so without a middleware pass
 * the refreshed token has nowhere to be written and the owner is signed out
 * mid-edit. `getUser()` is what performs the refresh; its return value matters
 * less than the cookies it leaves behind.
 *
 * The second is turning anonymous requests away from `/admin` before a page
 * renders. This is a routing convenience, not the authorisation boundary: it
 * cannot see the profile row, so it cannot know a role, an `is_active` flag or
 * whether the account may reach this application at all. Every admin page
 * calls `requireStaff()` for that, and every table is behind RLS underneath.
 * Three layers, and the middleware is the weakest of them by design.
 */
export async function middleware(request: NextRequest) {
  const { pathname: path } = request.nextUrl;

  if (!hasAuthCookie(request)) {
    // No session. Anywhere but the admin, there is nothing to do; inside the
    // admin, this is the anonymous case the redirect below handles.
    if (!path.startsWith("/admin") || path === "/admin/login") {
      return NextResponse.next({ request });
    }

    const url = request.nextUrl.clone();
    url.pathname = "/admin/login";
    url.searchParams.set("next", path);
    return NextResponse.redirect(url);
  }

  // Carries the request headers forward so Next's own routing metadata is not
  // dropped, and gives the Supabase client something to write cookies onto.
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database, "company">(
    clientEnv.NEXT_PUBLIC_SUPABASE_URL,
    clientEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      db: { schema: DB_SCHEMA },
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // Written to both: the request so anything downstream in this pass
          // sees the refreshed token, and the response so the browser keeps it.
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isLogin = path === "/admin/login";

  // A cookie was present but did not verify — expired, revoked or forged.
  if (path.startsWith("/admin") && !isLogin && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin/login";
    // Where they were going, so the login can return them there rather than
    // dropping everyone on the dashboard.
    url.searchParams.set("next", path);
    return NextResponse.redirect(url);
  }

  // Someone already signed in has no use for the login screen.
  if (isLogin && user) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  /*
    Everything except static assets and image files.

    The session refresh has to run on ordinary page requests, not only on
    `/admin` — a visitor who signs in and then browses the public site would
    otherwise let their token expire and find themselves signed out the moment
    they open the admin again.
  */
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|brand/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico|woff2?)$).*)",
  ],
};
