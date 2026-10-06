import "server-only";
import { createClient } from "@supabase/supabase-js";
import { cacheLife, cacheTag } from "next/cache";
import { SUPABASE_URL } from "./supabase";

/**
 * The question bank: tests, sections, passages and questions. Every signed-in user sees the same rows and
 * they change only when questions are imported, so reads are cached once for everyone ("use cache: remote"
 * is shared across server instances) under the BANK tag. The import script calls /api/revalidate
 * after an import, which expires the tag; the "days" lifetime is only a backstop for edits made by hand.
 *
 * Reads go through the secret key, which bypasses row-level security (a cached function can't read the
 * user's cookies), so this module is server-only, selects explicit columns, and never reads correct_answer.
 * Timed sections are per-user and are read through the user's own client in lib/sessions.ts.
 */
export const BANK = "question-bank";

/**
 * THE QUESTION BANK SWITCH. Set QUESTION_BANK in web/.env.local (never committed) or in the host's
 * environment settings, then restart or redeploy:
 *   QUESTION_BANK=other        another bank in the same database
 *   anything else, or unset    questions written by scripts/generate_questions.py
 * It is read on the server only, so nobody using the site can change it. Every read below is limited to
 * the chosen bank, and the bank is an argument of each cached read so the two never share a cache entry.
 */
export type BankName = "other" | "generated";
export const BANK_NAME: BankName = process.env.QUESTION_BANK === "other" ? "other" : "generated";

const db = () => createClient(SUPABASE_URL, process.env.SUPABASE_SECRET_KEY!, { auth: { persistSession: false } });

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
    db().from("bank_type_counts").select("section_type, question_type, total").eq("bank", bank));
}

export const allTests = () => allTestsIn(BANK_NAME);
async function allTestsIn(bank: BankName) {
  "use cache: remote";
  shared();
  return rows<{ id: string; name: string; year: number | null }>(db().from("tests").select("id, name, year").eq("bank", bank));
}

export const allSections = () => allSectionsIn(BANK_NAME);
async function allSectionsIn(bank: BankName) {
  "use cache: remote";
  shared();
  return rows<{ test_id: string; section_number: number; section_type: string; questions: number }>(
    db().from("bank_test_sections").select("test_id, section_number, section_type, questions").eq("bank", bank).order("section_number"));
}

/** One question to drill, with its passage and where it comes from. */
export const drillQuestion = (id: string) => drillQuestionIn(BANK_NAME, id);
async function drillQuestionIn(bank: BankName, id: string) {
  "use cache: remote";
  shared();
  const [q] = await rows(db().from("questions")
    .select("id, stimulus, prompt, options, section_number, question_number, tests!inner(name), passages(passage_text)").eq("id", id).eq("tests.bank", bank));
  if (!q) return null;
  const test = q.tests as unknown as { name: string };
  const passage = q.passages as unknown as { passage_text: string } | null;
  return {
    id: q.id as string, stimulus: q.stimulus as string | null, prompt: q.prompt as string, options: q.options as Record<string, string>,
    source: `${test.name}, section ${q.section_number}, question ${q.question_number}`, passage: passage?.passage_text ?? null,
  };
}
