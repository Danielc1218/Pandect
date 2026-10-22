// Who is asking, and the key that opens the bank. The bank files are public ciphertext; only Functions can open them.
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { importBankKey, open, type Purpose, type Sealed } from "../../web/lib/cdn";

export type Env = { SUPABASE_URL: string; SUPABASE_SECRET_KEY: string; BANK_KEY: string; ASSETS: Fetcher };

/** A Supabase client with the server key. It never stores a session. */
export const admin = (env: Env): SupabaseClient =>
  createClient(env.SUPABASE_URL, env.SUPABASE_SECRET_KEY, { auth: { persistSession: false, autoRefreshToken: false } });

/** The user id from a valid Supabase access token, or null. The signature is checked locally against the cached JWKS. */
export const userId = async (env: Env, request: Request): Promise<string | null> => {
  try {
    const header = request.headers.get("Authorization") ?? "";
    if (!header.startsWith("Bearer ")) return null;
    const { data, error } = await admin(env).auth.getClaims(header.slice(7));
    return error || !data?.claims?.sub ? null : data.claims.sub;
  } catch {
    return null; // a malformed token can throw; that is just "not signed in"
  }
};

let key: Promise<CryptoKey> | undefined;
/** The bank key, imported once per isolate. */
export const bankKey = (env: Env): Promise<CryptoKey> => (key ??= importBankKey(env.BANK_KEY));

/** Fetch one sealed bank file from the static assets and return it decrypted, or a 404. Callers pass only paths they built. */
export const openQuestionFile = async (env: Env, request: Request, path: string): Promise<Response> => {
  const res = await env.ASSETS.fetch(new URL(path, request.url));
  // A missing file may come back as the site's fallback page, so anything that isn't sealed JSON is a 404 too.
  const sealed = res.ok ? ((await res.json().catch(() => null)) as Sealed | null) : null;
  if (!sealed?.iv || !sealed.data) return new Response("Not found", { status: 404 });
  const purpose: Purpose = "question"; // no route ever opens an answer
  const json = await open(await bankKey(env), sealed, purpose);
  return Response.json(json, { headers: { "Cache-Control": "private, max-age=300" } });
};
