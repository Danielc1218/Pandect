// Browser version of web/lib/bank.ts. The index tables come from Supabase as the signed-in user; question files
// come decrypted from the Pages Functions under /api/bank, which check the same session.
import { toDrillQuestion, typeSlug, type CdnQuestion } from "@/lib/cdn";
import type { QuestionRow } from "@/lib/questions";
import { supabase } from "./supabase";

export type BankName = "other" | "generated";
// Only the generated bank is ever on Cloudflare.
export const BANK_NAME: BankName = "generated";

async function rows<T>(query: PromiseLike<{ data: T[] | null; error: unknown }>): Promise<T[]> {
  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export const typeCounts = async () =>
  rows<{ section_type: string; question_type: string; total: number }>(
    (await supabase()).from("bank_type_counts").select("section_type, question_type, total").eq("bank", BANK_NAME));

export const allTests = async () =>
  rows<{ id: string; name: string; year: number | null }>((await supabase()).from("tests").select("id, name, year").eq("bank", BANK_NAME));

export const allSections = async () =>
  rows<{ test_id: string; section_number: number; section_type: string; questions: number }>(
    (await supabase()).from("bank_test_sections").select("test_id, section_number, section_type, questions").eq("bank", BANK_NAME).order("section_number"));

/** A bank Function's JSON, sent with the session's token; null on 404. */
async function api<T>(path: string): Promise<T | null> {
  const { data: { session } } = await (await supabase()).auth.getSession();
  const res = await fetch(path, { headers: session ? { Authorization: `Bearer ${session.access_token}` } : {} });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`${path}: ${res.status}`);
  return res.json();
}

/** A generated question file by id. */
export const cdnQuestion = (id: string) => api<CdnQuestion>(`/api/bank/q/${encodeURIComponent(id)}`);

const PAGE = 25; // functions/api/bank/qs.ts takes at most this many ids
const PARALLEL = 6;

/** Generated question files, in the order given: pages of 25 ids, at most 6 calls at once. Throws if any is missing. */
export async function cdnQuestions(ids: string[]): Promise<CdnQuestion[]> {
  const pages = Array.from({ length: Math.ceil(ids.length / PAGE) }, (_, i) => ids.slice(i * PAGE, (i + 1) * PAGE));
  const out: CdnQuestion[][] = [];
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(PARALLEL, pages.length) }, async () => {
    for (let i = next++; i < pages.length; i = next++) {
      const page = await api<CdnQuestion[]>(`/api/bank/qs?ids=${pages[i].join(",")}`);
      if (!page) throw new Error("question file missing");
      out[i] = page;
    }
  }));
  return out.flat();
}

/** Every question of one type for the drill list, in the order drills step through them. */
export const typeQuestions = async (section: string, type: string): Promise<QuestionRow[]> =>
  (await api<QuestionRow[]>(`/api/bank/types/${section === "Reading Comprehension" ? "rc" : "lr"}/${typeSlug(type)}`)) ?? [];

/** One question to drill, with its passage and where it comes from. */
export async function drillQuestion(id: string) {
  const q = await cdnQuestion(id);
  return q && toDrillQuestion(q);
}

/** web/lib/actions.ts imports this for answer and saveAnswer, which src/lib/actions.ts replaces with Function calls. */
export const admin = (): never => { throw new Error("the secret-key client is server-only"); };
