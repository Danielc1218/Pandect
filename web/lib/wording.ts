import { cdnQuestions } from "./bank";

type Wording = { id: string; stimulus: string | null; prompt: string; options: Record<string, string>; passage_id: string | null; passage: string | null };

/**
 * A session's questions as a test taker sees them, numbered by position, with the passages they point at by index.
 * Which questions comes from ops' session or results read (row-level security returns rows only for the user's own
 * session); the wording then comes from the CDN, for exactly those questions.
 */
export async function sessionQuestions(rows: { position: number; question_id: string }[]) {
  const ids = rows.map((r) => r.question_id as string);
  const qs: Wording[] = await cdnQuestions(ids);
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
