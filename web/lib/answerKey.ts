import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { admin, BANK_NAME, bankFile } from "./bank";
import { bankPaths, type CdnAnswer } from "./cdn";

/**
 * Answer keys. Users can't select correct_answer or explanation (the database refuses), so the server reads
 * them with the secret key, and only where the user is entitled to see them.
 */

/** One question's answer and reasoning, or null if it isn't in the bank this deployment serves. */
export async function questionAnswer(id: string) {
  if (BANK_NAME === "generated") {
    // Only ids in this deployment's index get their answer file opened.
    const { data: known } = await admin().from("questions").select("id, tests!inner(bank)").eq("id", id).eq("tests.bank", "generated").maybeSingle();
    return known ? bankFile<CdnAnswer>(bankPaths.answer(id), "answer") : null;
  }
  const { data } = await admin().from("questions").select("correct_answer, explanation, tests!inner(bank)")
    .eq("id", id).eq("tests.bank", BANK_NAME).maybeSingle();
  return data ? { correct_answer: data.correct_answer as string, explanation: data.explanation as string | null } : null;
}

/** A finished session's answers and reasoning, for marking it; empty while the section is running or if it isn't the user's. */
export async function sessionAnswerKey(db: SupabaseClient, sessionId: string) {
  // The user's own client only sees their own sessions.
  const { data: session } = await db.from("test_sessions").select("finished_at").eq("id", sessionId).maybeSingle();
  if (!session?.finished_at) return [];
  if (BANK_NAME === "generated") {
    const { data, error } = await admin().from("session_questions")
      .select("position, questions!inner(id, question_type, section_type, tests!inner(bank))").eq("questions.tests.bank", "generated").eq("session_id", sessionId).order("position");
    if (error) throw error;
    const index = (data ?? []) as unknown as { position: number; questions: { id: string; question_type: string; section_type: string } }[];
    const answers = await Promise.all(index.map((r) => bankFile<CdnAnswer>(bankPaths.answer(r.questions.id), "answer")));
    return index.map(({ position, questions: q }, i) => {
      const a = answers[i];
      if (!a) throw new Error(`answer file missing: ${q.id}`);
      return { id: q.id, number: position, question_type: q.question_type, section_type: q.section_type, correct_answer: a.correct_answer as string, explanation: a.explanation };
    });
  }
  const { data, error } = await admin().from("session_questions")
    .select("position, questions(id, question_type, section_type, correct_answer, explanation)")
    .eq("session_id", sessionId).order("position");
  if (error) throw error;
  return ((data ?? []) as unknown as { position: number; questions: Record<string, string | null> }[]).map(({ position, questions: q }) => ({
    id: q.id as string, number: position, question_type: q.question_type as string, section_type: q.section_type as string,
    correct_answer: q.correct_answer as string, explanation: q.explanation,
  }));
}
