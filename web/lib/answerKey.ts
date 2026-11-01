import "server-only";
import { admin, bankEntries } from "./bank";
import type { CdnAnswer } from "./cdn";
import { requireUser } from "./supabase";

/**
 * Answer keys. Users can't select correct_answer or explanation (the database refuses), so the server reads
 * them with the secret key, and only where the user is entitled to see them.
 */

/** One question's answer and reasoning, or null if it isn't in the bank this deployment serves. */
export async function questionAnswer(id: string) {
  // Only ids in this deployment's index get their answer opened.
  const { data: known } = await admin().from("questions").select("id, tests!inner(bank)").eq("id", id).eq("tests.bank", "generated").maybeSingle();
  return known ? (await bankEntries<CdnAnswer>([id], "answer"))[0] : null;
}

/** A finished session's answers and reasoning, for marking it; empty while the section is running or if it isn't the user's. */
export async function sessionAnswerKey(sessionId: string) {
  // The user's own client only sees their own sessions.
  const { db } = await requireUser();
  const { data: session } = await db.from("test_sessions").select("finished_at").eq("id", sessionId).maybeSingle();
  if (!session?.finished_at) return [];
  const { data, error } = await admin().from("session_questions")
    .select("position, questions!inner(id, question_type, section_type, tests!inner(bank))").eq("questions.tests.bank", "generated").eq("session_id", sessionId).order("position");
  if (error) throw error;
  const index = (data ?? []) as unknown as { position: number; questions: { id: string; question_type: string; section_type: string } }[];
  const answers = await bankEntries<CdnAnswer>(index.map((r) => r.questions.id), "answer");
  return index.map(({ position, questions: q }, i) => {
    const a = answers[i];
    if (!a) throw new Error(`answer file missing: ${q.id}`);
    return { id: q.id, number: position, question_type: q.question_type, section_type: q.section_type, correct_answer: a.correct_answer as string, explanation: a.explanation };
  });
}
