import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { admin, BANK_NAME } from "./bank";

/**
 * Answer keys. Users can't select correct_answer or explanation (the database refuses), so the server reads
 * them with the secret key, and only where the user is entitled to see them.
 */

/** One question's answer and reasoning, or null if it isn't in the bank this deployment serves. */
export async function questionAnswer(id: string) {
  const { data } = await admin().from("questions").select("correct_answer, explanation, tests!inner(bank)")
    .eq("id", id).eq("tests.bank", BANK_NAME).maybeSingle();
  return data ? { correct_answer: data.correct_answer as string, explanation: data.explanation as string | null } : null;
}

/** A finished session's answers and reasoning, for marking it; empty while the section is running or if it isn't the user's. */
export async function sessionAnswerKey(db: SupabaseClient, sessionId: string) {
  // The user's own client only sees their own sessions.
  const { data: session } = await db.from("test_sessions").select("finished_at").eq("id", sessionId).maybeSingle();
  if (!session?.finished_at) return [];
  const { data, error } = await admin().from("session_questions")
    .select("position, questions(id, question_type, section_type, correct_answer, explanation)")
    .eq("session_id", sessionId).order("position");
  if (error) throw error;
  return ((data ?? []) as unknown as { position: number; questions: Record<string, string | null> }[]).map(({ position, questions: q }) => ({
    id: q.id as string, number: position, question_type: q.question_type as string, section_type: q.section_type as string,
    correct_answer: q.correct_answer as string, explanation: q.explanation,
  }));
}
