import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

/**
 * Runs only for /admin. Sends signed-out visitors to the sign-in page early
 * (and refreshes the Supabase session when Supabase sign-in is used). This is
 * a convenience, not the security boundary: every admin page and server action
 * re-checks the session and admin membership against the database.
 */
export async function proxy(request: NextRequest) {
  const isLogin = request.nextUrl.pathname === "/admin/login";
  const toLogin = () => NextResponse.redirect(new URL("/admin/login", request.url));

  if (!process.env.DATABASE_URL) return isLogin ? NextResponse.next() : toLogin();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Built-in sign-in: a session cookie must at least be present.
  if (!url || !key) {
    return isLogin || request.cookies.has("jojo_session") ? NextResponse.next() : toLogin();
  }

  let response = NextResponse.next({ request });
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) response.cookies.set(name, value, options);
      },
    },
  });
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims && !isLogin) return toLogin();
  return response;
}

export const config = {
  matcher: ["/admin/:path*"],
};
