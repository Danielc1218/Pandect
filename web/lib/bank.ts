import "server-only";
import { createClient } from "@supabase/supabase-js";
import { cacheLife, cacheTag } from "next/cache";
import { bankPaths, cdnGet, cdnRaw, importBankKey, openEntries, practiceName, toDrillQuestion, type CdnQuestion, type Purpose } from "./cdn";
import type { QuestionRow } from "./questions";
import { SUPABASE_URL } from "./supabase";

/**
 * The question bank: tests, sections, passages and questions. Every signed-in user sees the same rows and
 * they change only when questions are imported, so reads are cached once for everyone ("use cache: remote"
 * is shared across server instances) under the BANK tag. The import script calls /api/revalidate
 * after an import, which expires the tag; the "days" lifetime is only a backstop for edits made by hand.
 *
 * Reads go through the secret key, which bypasses row-level security (a cached function can't read the
 * user's cookies), so this module is server-only, selects explicit columns, and never reads correct_answer (lib/answerKey.ts does, and only for answers the user is entitled to see).
 * Timed sections are per-user and are read through the user's own client in lib/sessions.ts.
 */
export const BANK = "question-bank";

/** The question bank this site serves. Every read below is limited to it. */
export type BankName = "generated";
export const BANK_NAME: BankName = "generated";

/** The secret-key client: bypasses row-level security, so only server code may use it. */
export const admin = () => createClient(SUPABASE_URL, process.env.SUPABASE_SECRET_KEY!, { auth: { persistSession: false } });

/** The bank key, imported once per server instance. Server only: BANK_KEY never reaches the browser. */
let key: Promise<CryptoKey> | undefined;
const bankKey = () => (key ??= importBankKey(process.env.BANK_KEY!));

/** One whole sealed file of the generated bank (a type list) from the CDN, decrypted here on the server. */
async function bankFile<T>(path: string): Promise<T | null> {
  return cdnGet<T>(path, { key: await bankKey(), purpose: "question" });
}

/** Generated bank entries by id, in order, null where missing: each bucket fetched once, only these entries opened. */
export async function bankEntries<T>(ids: string[], purpose: Purpose): Promise<(T | null)[]> {
  return openEntries<T>(await bankKey(), ids, purpose, cdnRaw);
}

/** A generated question by id. */
export const cdnQuestion = async (id: string) => (await bankEntries<CdnQuestion>([id], "question"))[0];

/** Generated questions, in the order given. Throws if any is missing. */
export const cdnQuestions = async (ids: string[]) => (await bankEntries<CdnQuestion>(ids, "question")).map((q, i) => {
  if (!q) throw new Error(`question file missing: ${ids[i]}`);
  return q;
});

async function rows<T>(query: PromiseLike<{ data: T[] | null; error: unknown }>): Promise<T[]> {
  const { data, error } = await query;
  if (error) throw error; // a thrown read is not cached
  return data ?? [];
}

function shared() {
  cacheTag(BANK);
  cacheLife("days");
}

export const typeCounts = () => typeCountsIn(BANK_NAME);
async function typeCountsIn(bank: BankName) {
  "use cache: remote";
  shared();
  return rows<{ section_type: string; question_type: string; total: number }>(
    admin().from("bank_type_counts").select("section_type, question_type, total").eq("bank", bank));
}

export const allTests = () => allTestsIn(BANK_NAME);
async function allTestsIn(bank: BankName) {
  "use cache: remote";
  shared();
  return (await rows<{ id: string; name: string; year: number | null }>(admin().from("tests").select("id, name, year").eq("bank", bank)))
    .map((test) => ({ ...test, name: practiceName(test.name) }));
}

export const allSections = () => allSectionsIn(BANK_NAME);
async function allSectionsIn(bank: BankName) {
  "use cache: remote";
  shared();
  return rows<{ test_id: string; section_number: number; section_type: string; questions: number; passages: number }>(
    admin().from("bank_test_sections").select("test_id, section_number, section_type, questions, passages").eq("bank", bank).order("section_number"));
}

/** Every question of one type for the drill list, in the order drills step through them. */
export const typeQuestions = (section: string, type: string) => typeQuestionsIn(BANK_NAME, section, type);
async function typeQuestionsIn(bank: BankName, section: string, type: string): Promise<QuestionRow[]> {
  "use cache: remote";
  shared();
  return ((await bankFile<QuestionRow[]>(bankPaths.typeList(section === "Reading Comprehension" ? "rc" : "lr", type))) ?? [])
    .map((question) => ({ ...question, source: practiceName(question.source) }));
}

/** One question to drill, with its passage and where it comes from. */
export const drillQuestion = (id: string) => drillQuestionIn(BANK_NAME, id);
async function drillQuestionIn(bank: BankName, id: string) {
  "use cache: remote";
  shared();
  const q = await cdnQuestion(id);
  return q && toDrillQuestion(q);
}
