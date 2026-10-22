// The signed-in session. It lives in httpOnly cookies that only /api receives, so the browser's scripts never hold a
// Supabase token and never talk to Supabase; the Functions act for the user with it.
import { createClient, type Session } from "@supabase/supabase-js";
import { admin, type Env } from "./auth";

const ACCESS = "sb-access";
const REFRESH = "sb-refresh";
const REFRESH_SECONDS = 30 * 86_400; // signed in for a month after the last visit

/** A client acting as the user whose access token this is (row-level security applies), or as nobody yet. */
export const userClient = (env: Env, token?: string) =>
  createClient(env.SUPABASE_URL, env.SUPABASE_PUBLISHABLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    ...(token && { global: { headers: { Authorization: `Bearer ${token}` } } }),
  });

const cookie = (name: string, value: string, maxAge: number) => `${name}=${value}; Path=/api; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;
/** Set-Cookie values that store a session. */
export const sessionCookies = (s: Session) => [cookie(ACCESS, s.access_token, s.expires_in), cookie(REFRESH, s.refresh_token, REFRESH_SECONDS)];
/** Set-Cookie values that forget the session. */
export const clearCookies = () => [cookie(ACCESS, "", 0), cookie(REFRESH, "", 0)];

/** The response with these cookies added (a Function's response headers may be immutable). */
export function withCookies(res: Response, cookies?: string[]) {
  if (!cookies?.length) return res;
  const out = new Response(res.body, res);
  for (const c of cookies) out.headers.append("Set-Cookie", c);
  return out;
}

const readCookie = (request: Request, name: string) =>
  request.headers.get("Cookie")?.split(/;\s*/).find((c) => c.startsWith(name + "="))?.slice(name.length + 1) || undefined;

/** The claims of a valid access token, or null. The signature is checked locally against the cached JWKS. */
async function claims(env: Env, token: string) {
  try {
    const { data, error } = await admin(env).auth.getClaims(token);
    return error || !data?.claims?.sub ? null : data.claims;
  } catch {
    return null; // a malformed token can throw; that is just "not signed in"
  }
}

export type Who = { userId: string; email?: string; token: string; setCookies?: string[] };

/**
 * Who is asking, or null: from a Bearer token (scripts/smoke.ts) or the session cookies. An expired cookie session
 * is refreshed, and the new cookies are for the caller to send back.
 */
export async function who(env: Env, request: Request): Promise<Who | null> {
  const header = request.headers.get("Authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : readCookie(request, ACCESS);
  const valid = token && (await claims(env, token));
  if (valid) return { userId: valid.sub, email: valid.email as string | undefined, token: token! };
  const refresh = !header && readCookie(request, REFRESH);
  if (!refresh) return null;
  // Supabase rate-limits refreshes and sign-ins per IP, and here every user shares Cloudflare's; ask Supabase to raise them if many users arrive at once.
  const { data, error } = await userClient(env).auth.refreshSession({ refresh_token: refresh });
  if (error || !data.session) return null;
  return { userId: data.session.user.id, email: data.session.user.email, token: data.session.access_token, setCookies: sessionCookies(data.session) };
}
