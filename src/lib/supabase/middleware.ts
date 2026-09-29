import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const publicPaths = new Set(["/login", "/register", "/forgot-password", "/reset-password"]);

function redirectWithSession(request: NextRequest, pathname: string, session: NextResponse) {
  const url = request.nextUrl.clone();
  url.pathname = pathname;
  url.search = "";
  const redirect = NextResponse.redirect(url);
  for (const cookie of session.cookies.getAll()) {
    redirect.cookies.set(cookie);
  }
  return redirect;
}

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key || url.includes("YOUR_PROJECT") || key.includes("YOUR_")) {
    return response;
  }

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  const { data } = await supabase.auth.getUser();
  const user = data.user;
  const { pathname } = request.nextUrl;
  // BE-011 / DO-002 / FE-013: signed share snapshot is readable without a session.
  const isSharePublic =
    pathname.startsWith("/api/share/") || pathname.startsWith("/share/");
  const isPublic =
    publicPaths.has(pathname) || pathname.startsWith("/auth/") || isSharePublic;

  if (!user && !isPublic) {
    return redirectWithSession(request, "/login", response);
  }

  if (user && publicPaths.has(pathname) && pathname !== "/reset-password") {
    return redirectWithSession(request, "/", response);
  }

  return response;
}
