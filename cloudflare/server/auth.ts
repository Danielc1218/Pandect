// Who is asking? Two kinds of caller: our own server (shared secret) and signed-in users (Supabase token).
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export type Env = { SUPABASE_URL: string; SUPABASE_SECRET_KEY: string; BANK_SECRET: string };

/** A Supabase client with the server key. It never stores a session. */
export const admin = (env: Env): SupabaseClient =>
  createClient(env.SUPABASE_URL, env.SUPABASE_SECRET_KEY, { auth: { persistSession: false, autoRefreshToken: false } });

const bearer = (request: Request) => request.headers.get("Authorization") ?? "";

/** True when the caller sent the server secret. Compared in constant time. */
export const isServer = (env: Env, request: Request): boolean => {
  if (!env.BANK_SECRET) return false;
  const a = new TextEncoder().encode(bearer(request));
  const b = new TextEncoder().encode(`Bearer ${env.BANK_SECRET}`);
  return a.length === b.length && crypto.subtle.timingSafeEqual(a, b);
};

/** The user id from a valid Supabase access token, or null. The signature is checked locally against the cached JWKS. */
export const userId = async (env: Env, request: Request): Promise<string | null> => {
  const header = bearer(request);
  if (!header.startsWith("Bearer ")) return null;
  const { data, error } = await admin(env).auth.getClaims(header.slice(7));
  return error || !data?.claims?.sub ? null : data.claims.sub;
};
