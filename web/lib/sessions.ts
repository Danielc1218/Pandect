import { practiceName } from "./cdn";

/**
 * Timed sections. Each one records its own questions in session_questions, in order: a fixed practice test section
 * (filled by the database when the session is created) or a random set (start_random_section). A finished
 * session keeps its score, so the user's history survives any later change to the question bank.
 * Sessions are read per user through lib/ops.ts; their questions' wording through lib/wording.ts.
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
    : { title: practiceName(s.tests?.name ?? s.test_id ?? "Timed section"), subtitle: `Section ${s.section_number}, ${s.section_type ?? ""}` };
}

/** Where "back" goes from a session: its test's page, or the practice page for a random set. */
export const sessionHome = (s: Session) => (s.kind === "random" || !s.test_id ? "/practice" : `/practice/${s.test_id}`);
