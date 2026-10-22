import { admin, BANK_NAME, cdnQuestions } from "./bank";

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
 * Which questions comes from ops' session or results read (row-level security returns rows only for the user's own
 * session); the wording then comes from the CDN (generated) or the secret key (other), for exactly those questions.
 */
export async function sessionQuestions(rows: { position: number; question_id: string }[]) {
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
