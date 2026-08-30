import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/types/database";
import { contentExists } from "@/lib/content/slugs";
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
 * How long the auth server gets to answer before this request gives up.
 *
 * **There was no limit here at all until 2026-08-29**, and that is a hang
 * rather than a slow page: `getUser()` is awaited on every request that carries
 * a session cookie, so if the auth server stops answering, every page a
 * signed-in person opens waits for it — public pages included, since the cookie
 * travels everywhere. Nothing renders, no loader appears, the tab just spins.
 * A Supabase project on the free tier pauses after seven days idle, which is
 * exactly the shape of failure that produces it.
 *
 * Four seconds: long enough that a slow mobile network still signs in, short
 * enough that a person watching the tab learns something before they give up.
 * Measured for comparison on this machine, warm: a public page 90–500ms, an
 * admin page 1–3s, all of it including this call.
 */
const AUTH_TIMEOUT_MS = 4_000;

/**
 * The signed-in user, or `"timeout"` — never a promise that does not settle.
 *
 * `supabase.auth.getUser()` takes no abort signal, so the race is the only way
 * to bound it. The loser is left running; it holds nothing this request needs
 * and the runtime discards it.
 */
async function userWithin(
  supabase: ReturnType<typeof createServerClient<Database, "company">>,
  ms: number,
): Promise<{ user: { id: string } | null } | "timeout"> {
  let timer: ReturnType<typeof setTimeout> | undefined;

  const expiry = new Promise<"timeout">((resolve) => {
    timer = setTimeout(() => resolve("timeout"), ms);
  });

  try {
    const settled = await Promise.race([supabase.auth.getUser(), expiry]);
    if (settled === "timeout") return "timeout";
    return { user: settled.data.user };
  } catch {
    // A refused connection is not a valid session. Treated as the timeout is,
    // so one branch below decides what a failure to verify means.
    return "timeout";
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Session refresh, and the first gate in front of `/admin`.
 *
 * **This was `middleware.ts` until 2026-08-28.** Next 16 deprecated that file
 * convention in favour of `proxy`, and printed a warning about it on every
 * build. It is a rename of the file and of the exported function; the
 * `config.matcher` below is unchanged, and so is every line of behaviour. It
 * was worth doing early rather than when it breaks, because this file is the
 * first layer of the access model and the wrong week to be discovering that is
 * an upgrade week.
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
 * Three layers, and this one is the weakest of them by design.
 */
export async function proxy(request: NextRequest) {
  const { pathname: path } = request.nextUrl;

  /*
    A record that does not exist answers 404, not 200.

    This is the third job, added 2026-08-28. `/services/anything-made-up` used
    to render the not-found page and return **200** — a soft 404, which keeps a
    dead address indexed and re-crawled for months, and which every renamed slug
    leaves behind. The page itself cannot fix it: a route-level `loading.tsx`
    flushes the shell before the page reaches `notFound()`, and a status cannot
    be changed once bytes have been sent. The loader stays, so the check moved
    here, where nothing has been sent yet.

    Rewriting to an address with no route is what produces the status. Next
    already answers a genuinely unmatched path with the styled not-found page
    **and a real 404** — that behaviour was measured, not assumed — so this
    hands the request to the one path that already does the right thing rather
    than inventing a second way to be missing.

    It costs nothing on any other request: five prefixes are checked as string
    comparisons, and everything else returns before a network call exists.
  */
  const exists = await contentExists(
    path,
    clientEnv.NEXT_PUBLIC_SUPABASE_URL,
    clientEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );

  if (!exists) {
    const url = request.nextUrl.clone();
    url.pathname = "/__not-found";
    url.search = "";
    return NextResponse.rewrite(url);
  }

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

  const isLogin = path === "/admin/login";
  const isAdmin = path.startsWith("/admin");

  const outcome = await userWithin(supabase, AUTH_TIMEOUT_MS);

  /*
    What a failure to verify means depends entirely on where it happened.

    **On a public page, nothing.** No public page reads the user; the only
    reason this call runs there is to refresh the token, and a refresh that did
    not happen costs the visitor one earlier sign-in later. Blocking the page
    on it would mean the marketing site goes down whenever the auth server is
    slow — the page has nothing to do with the session.

    **Inside the admin, everything.** The one thing that must not happen is
    treating "could not verify" as "not signed in" and redirecting to the login
    screen, because that screen needs the same auth server: the owner would be
    bounced into a loop that cannot end, with nothing on screen explaining it.
    So it says so, plainly, with a status that means the service is unavailable
    rather than the credentials are wrong.
  */
  if (outcome === "timeout") {
    if (isAdmin && !isLogin) {
      return new NextResponse(
        "The sign-in service is not responding, so this page cannot confirm who you are. Nothing has been changed. Try again in a moment.",
        { status: 503, headers: { "content-type": "text/plain; charset=utf-8" } },
      );
    }

    return response;
  }

  const { user } = outcome;

  // A cookie was present but did not verify — expired, revoked or forged.
  if (isAdmin && !isLogin && !user) {
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
