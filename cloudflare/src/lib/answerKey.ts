// Browser version of web/lib/answerKey.ts. Only the grading Functions can open answer files.
import type { SupabaseClient } from "@supabase/supabase-js";
import type * as web from "@/lib/answerKey";

/** Not used in the browser: web/lib/actions.ts imports it for answer and saveAnswer, which src/lib/actions.ts replaces. */
export async function questionAnswer(_id: string): ReturnType<typeof web.questionAnswer> {
  throw new Error("answers are read by the grading Functions only");
}

type Key = Awaited<ReturnType<typeof web.sessionAnswerKey>>;

const PAGE = 25; // positions per call, the most functions/api/answer-key.ts serves
const AT_ONCE = 6;

/**
 * A finished session's answers and reasoning, for marking it; empty while the section is running or if it isn't the
 * user's. Asked for in pages of positions, a few at a time, so one Function call stays within the plan's limits.
 */
export async function sessionAnswerKey(db: SupabaseClient, sessionId: string): ReturnType<typeof web.sessionAnswerKey> {
  const [{ data: { session } }, last] = await Promise.all([
    db.auth.getSession(),
    db.from("session_questions").select("position").eq("session_id", sessionId).order("position", { ascending: false }).limit(1).maybeSingle(),
  ]);
  if (last.error) throw last.error;
  const pages = Math.ceil((last.data?.position ?? 0) / PAGE); // none for someone else's session (row-level security)
  const results: (Key | null)[] = [];
  const fetchPage = async (i: number): Promise<Key | null> => {
    const range = `from=${i * PAGE + 1}&to=${(i + 1) * PAGE}`;
    const res = await fetch(`/api/answer-key?session=${encodeURIComponent(sessionId)}&${range}`, {
      headers: session ? { Authorization: `Bearer ${session.access_token}` } : {},
    });
    if (res.status === 403 || res.status === 409) return null;
    if (!res.ok) throw new Error(`answer key: ${res.status}`);
    return res.json();
  };
  let next = 0;
  const worker = async () => { while (next < pages) { const i = next++; results[i] = await fetchPage(i); } };
  await Promise.all(Array.from({ length: Math.min(AT_ONCE, pages) }, worker));
  return results.includes(null) ? [] : (results as Key[]).flat();
}
