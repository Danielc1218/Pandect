// Browser version of web/lib/bank.ts. The index comes through ops (functions/api/op/[name].ts); question files come
// decrypted from the Pages Functions under /api/bank. Both act as the signed-in user.
import { practiceName, toDrillQuestion, typeSlug, type CdnQuestion } from "@/lib/cdn";
import type { QuestionRow } from "@/lib/questions";
import { op } from "./run";
import { api } from "./supabase";

export type BankName = "generated";
export const BANK_NAME: BankName = "generated";

export const typeCounts = () => op("typeCounts");
export const allTests = () => op("allTests");
export const allSections = () => op("allSections");

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
  ((await api<QuestionRow[]>(`/api/bank/types/${section === "Reading Comprehension" ? "rc" : "lr"}/${typeSlug(type)}`)) ?? [])
    .map((question) => ({ ...question, source: practiceName(question.source) }));

/** One question to drill, with its passage and where it comes from. */
export async function drillQuestion(id: string) {
  const q = await cdnQuestion(id);
  return q && toDrillQuestion(q);
}

/** web/lib/actions.ts imports this for answer and saveAnswer, which src/lib/actions.ts replaces with Function calls. */
export const admin = (): never => { throw new Error("the secret-key client is server-only"); };
