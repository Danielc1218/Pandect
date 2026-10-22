// Who is asking, and the key that opens the bank. The bank files are public ciphertext; only Functions can open them.
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { importBankKey, open, openEntries, type CdnAnswer, type CdnQuestion, type Purpose, type Sealed } from "../../web/lib/cdn";

export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export type Env = { SUPABASE_URL: string; SUPABASE_PUBLISHABLE_KEY: string; SUPABASE_SECRET_KEY: string; BANK_KEY: string; ASSETS: Fetcher };

/** A Supabase client with the server key. It never stores a session. */
export const admin = (env: Env): SupabaseClient =>
  createClient(env.SUPABASE_URL, env.SUPABASE_SECRET_KEY, { auth: { persistSession: false, autoRefreshToken: false } });

let key: Promise<CryptoKey> | undefined;
/** The bank key, imported once per isolate. */
export const bankKey = (env: Env): Promise<CryptoKey> => (key ??= importBankKey(env.BANK_KEY));

/** One bank file from the static assets as stored, or null. A missing file may come back as the site's fallback page, so anything that isn't JSON is missing too. Callers pass only paths they built. */
const assetJson = async (env: Env, request: Request, path: string): Promise<unknown> => {
  const res = await env.ASSETS.fetch(new URL(path, request.url));
  return res.ok ? res.json().catch(() => null) : null;
};

/** Bank entries by id, decrypted, in the order given, null where missing: each bucket fetched once, only these entries opened. */
const readEntries = async <T>(env: Env, request: Request, ids: string[], purpose: Purpose) =>
  openEntries<T>(await bankKey(env), ids, purpose, (path) => assetJson(env, request, path));

/** Question files are private to signed-in users, so a browser may keep them briefly but no shared cache may. */
export const questionReply = (value: unknown) => Response.json(value, { headers: { "Cache-Control": "private, max-age=300" } });

/** Questions by id, decrypted, null where missing. Only the grading routes open answers, through readAnswers. */
export const readQuestions = (env: Env, request: Request, ids: string[]) => readEntries<CdnQuestion>(env, request, ids, "question");

/** One whole question-purpose file (a type list), sealed under its path, as a reply, or a 404. */
export const openQuestionFile = async (env: Env, request: Request, path: string): Promise<Response> => {
  const sealed = (await assetJson(env, request, path)) as Sealed | null;
  return sealed?.iv && sealed.data ? questionReply(await open(await bankKey(env), sealed, "question", path)) : new Response("Not found", { status: 404 });
};

/** Answers by id, decrypted, null where missing. Grading routes only; callers pass ids from the index or checked against UUID. */
export const readAnswers = (env: Env, request: Request, ids: string[]) => readEntries<CdnAnswer>(env, request, ids, "answer");

/** One question's answer, decrypted, or null if the id isn't a UUID or the bank has no answer for it. Grading routes only. */
export const readAnswer = async (env: Env, request: Request, id: string): Promise<CdnAnswer | null> =>
  UUID.test(id) ? (await readAnswers(env, request, [id]))[0] : null;

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

/** A Function route: anything it throws becomes a plain 500, never a stack trace. */
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
