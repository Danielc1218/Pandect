import type { SupabaseClient } from "@supabase/supabase-js";
import { admin, BANK_NAME, cdnQuestions } from "./bank";

/**
 * Timed sections. Each one records its own questions in session_questions, in order: a fixed practice test section
 * (filled by the database when the session is created) or a random set (start_random_section). A finished
 * session keeps its score, so the user's history survives any later change to the question bank.
 * These are per-user reads through the user's own client, so nothing here is cached across users; question wording,
 * which users can't read, comes from the CDN or the secret key once the user's client has shown the session is theirs.
 */
export const SESSION_FIELDS = "id, test_id, section_number, kind, section_type, started_at, finished_at, paused_at, paused_seconds, score_correct, score_total, tests(name)";

export type Session = {
  id: string; test_id: string | null; section_number: number | null; kind: "fixed" | "random"; section_type: string | null;
  started_at: string; finished_at: string | null; paused_at: string | null; paused_seconds: number; score_correct: number | null; score_total: number | null; tests: { name: string } | null;
};

/** What a session is called: "Practice Test 72" and "Section 2, Logical Reasoning", or a random set's equivalent. */
export function sessionLabel(s: Session) {
  return s.kind === "random"
    ? { title: "Timed section", subtitle: `${s.section_type}, random set` }
    : { title: s.tests?.name ?? s.test_id ?? "Timed section", subtitle: `Section ${s.section_number}, ${s.section_type ?? ""}` };
}

/** Where "back" goes from a session: its test's page, or the practice page for a random set. */
export const sessionHome = (s: Session) => (s.kind === "random" || !s.test_id ? "/practice" : `/practice/${s.test_id}`);

type Wording = { id: string; stimulus: string | null; prompt: string; options: Record<string, string>; passage_id: string | null; passage: string | null };

/** Other-bank questions' wording, in the order given. Users can't read wording, so this uses the secret key. */
async function otherQuestions(ids: string[]): Promise<Wording[]> {
  const { data, error } = await admin().from("questions").select("id, stimulus, prompt, options, passage_id, passages(passage_text)").in("id", ids);
  if (error) throw error;
  const byId = new Map((data ?? []).map((q) => [q.id as string, q]));
  return ids.map((id) => {
    const q = byId.get(id);
    if (!q) throw new Error(`question missing: ${id}`);
    const passage = q.passages as unknown as { passage_text: string } | null;
    return { id, stimulus: q.stimulus, prompt: q.prompt, options: q.options, passage_id: q.passage_id, passage: passage?.passage_text ?? null };
  });
}

/**
 * A session's questions as a test taker sees them, numbered by position, with the passages they point at by index.
 * Which questions comes through the user's own client (row-level security returns rows only for their own session);
 * the wording then comes from the CDN (generated) or the secret key (other), for exactly those questions.
 */
export async function sessionQuestions(db: SupabaseClient, sessionId: string) {
  const { data, error } = await db.from("session_questions").select("position, question_id").eq("session_id", sessionId).order("position");
  if (error) throw error;
  const rows = data ?? [];
  const ids = rows.map((r) => r.question_id as string);
  const qs: Wording[] = BANK_NAME === "generated" ? await cdnQuestions(ids) : await otherQuestions(ids);
  const found = rows.map(({ position }, i) => ({ position: position as number, q: qs[i] }));
  const passageIds = [...new Set(found.map((r) => r.q.passage_id).filter(Boolean))] as string[];
  return {
    passages: passageIds.map((pid) => found.find((r) => r.q.passage_id === pid)?.q.passage ?? ""),
    questions: found.map(({ position, q }) => ({
      id: q.id, number: position, stimulus: q.stimulus, prompt: q.prompt, options: q.options,
      passage: q.passage_id ? passageIds.indexOf(q.passage_id) : null,
    })),
  };
}
