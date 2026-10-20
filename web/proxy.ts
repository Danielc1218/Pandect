import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Keeps the Supabase session cookie fresh, and keeps the whole site private:
// anyone who is not signed in only ever sees the log-in and sign-up pages.
// /api/revalidate is called by the import script, which has no session; it checks its own secret.
const OPEN = ["/login", "/signup", "/api/revalidate"];

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  const db = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (list) => {
        list.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        list.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });
  // getClaims refreshes an expired session like getUser did, but checks the token's signature locally
  // instead of a round trip to Supabase Auth on every request.
  const { data } = await db.auth.getClaims();
  if (!data?.claims && !OPEN.includes(request.nextUrl.pathname)) {
    // after logging in, the visitor goes on to the page they asked for
    const login = new URL("/login", request.url);
    if (request.nextUrl.pathname !== "/") login.searchParams.set("next", request.nextUrl.pathname + request.nextUrl.search);
    return NextResponse.redirect(login);
  }
  return response;
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg|images/).*)"] };
