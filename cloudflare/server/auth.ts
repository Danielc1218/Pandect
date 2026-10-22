// Who is asking, and the key that opens the bank. The bank files are public ciphertext; only Functions can open them.
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { bankPaths, importBankKey, open, type CdnAnswer, type Purpose, type Sealed } from "../../web/lib/cdn";

export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

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
  const purpose: Purpose = "question"; // only the grading routes open answers, through readAnswer
  const json = await open(await bankKey(env), sealed, purpose);
  return Response.json(json, { headers: { "Cache-Control": "private, max-age=300" } });
};

/** One question's answer file, decrypted, or null if the id isn't a UUID or there is no such file. Grading routes only. */
export const readAnswer = async (env: Env, request: Request, id: string): Promise<CdnAnswer | null> => {
  if (!UUID.test(id)) return null;
  const res = await env.ASSETS.fetch(new URL(bankPaths.answer(id), request.url));
  const sealed = res.ok ? ((await res.json().catch(() => null)) as Sealed | null) : null;
  return sealed?.iv && sealed.data ? open<CdnAnswer>(await bankKey(env), sealed, "answer") : null;
};

/** The answer to a question in the generated bank's index, or null: only those ids get their answer file opened. */
export const generatedAnswer = async (env: Env, request: Request, id: string): Promise<CdnAnswer | null> => {
  if (!UUID.test(id)) return null;
  const { data, error } = await admin(env).from("questions").select("id, tests!inner(bank)").eq("id", id).eq("tests.bank", "generated").maybeSingle();
  if (error) throw error;
  return data && readAnswer(env, request, id);
};

/** A plain-text reply that no cache keeps. */
export const reply = (status: number, text: string) => new Response(text, { status, headers: { "Cache-Control": "no-store" } });

/** A JSON reply that no cache keeps. */
export const json = (value: unknown) => Response.json(value, { headers: { "Cache-Control": "no-store" } });

/** A grading route: anything it throws becomes a plain 500, never a stack trace. */
export const guarded = <D extends Record<string, unknown>>(route: PagesFunction<Env, any, D>): PagesFunction<Env, any, D> =>
  async (context) => {
    try {
      return await route(context);
    } catch {
      return reply(500, "Something went wrong");
    }
  };

/** A JSON request body, or undefined if it isn't JSON. */
export const body = (request: Request): Promise<Record<string, unknown> | undefined> =>
  request.json().then((v) => (v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : undefined), () => undefined);
