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
 * user's cookies), so this module is server-only and selects explicit columns: a question is never sent
 * with its correct_answer, which only answerKey() reads.
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

/** A timed section's questions in order, and its passages, which each question points at by index. */
export const sectionQuestions = (testId: string, sectionNumber: number) => sectionQuestionsIn(BANK_NAME, testId, sectionNumber);
async function sectionQuestionsIn(bank: BankName, testId: string, sectionNumber: number) {
  "use cache: remote";
  shared();
  const list = await rows(db().from("questions")
    .select("id, question_number, section_type, stimulus, prompt, options, passage_id, passages(passage_text), tests!inner(bank)")
    .eq("tests.bank", bank).eq("test_id", testId).eq("section_number", sectionNumber).order("question_number"));
  const passageIds = [...new Set(list.map((q) => q.passage_id).filter(Boolean))] as string[];
  return {
    sectionType: (list[0]?.section_type ?? "") as string,
    passages: passageIds.map((pid) => (list.find((q) => q.passage_id === pid)?.passages as unknown as { passage_text: string } | null)?.passage_text ?? ""),
    questions: list.map((q) => ({
      id: q.id as string, number: q.question_number as number, stimulus: q.stimulus as string | null, prompt: q.prompt as string,
      options: q.options as Record<string, string>, passage: q.passage_id ? passageIds.indexOf(q.passage_id) : null,
    })),
  };
}

/** A section's answers, for marking it once it is finished. */
export const answerKey = (testId: string, sectionNumber: number) => answerKeyIn(BANK_NAME, testId, sectionNumber);
async function answerKeyIn(bank: BankName, testId: string, sectionNumber: number) {
  "use cache: remote";
  shared();
  return rows<{ id: string; question_number: number; question_type: string; section_type: string; correct_answer: string }>(
    db().from("questions").select("id, question_number, question_type, section_type, correct_answer, tests!inner(bank)")
      .eq("tests.bank", bank).eq("test_id", testId).eq("section_number", sectionNumber).order("question_number"));
}
