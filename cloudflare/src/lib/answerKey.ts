// Browser version of web/lib/answerKey.ts. Only the grading Functions can open answer files.
import type { SupabaseClient } from "@supabase/supabase-js";
import type * as web from "@/lib/answerKey";

/** Not used in the browser: web/lib/actions.ts imports it for answer and saveAnswer, which src/lib/actions.ts replaces. */
export async function questionAnswer(_id: string): ReturnType<typeof web.questionAnswer> {
  throw new Error("answers are read by the grading Functions only");
}

/** A finished session's answers and reasoning, for marking it; empty while the section is running or if it isn't the user's. */
export async function sessionAnswerKey(db: SupabaseClient, sessionId: string): ReturnType<typeof web.sessionAnswerKey> {
  const { data: { session } } = await db.auth.getSession();
  const res = await fetch(`/api/answer-key?session=${encodeURIComponent(sessionId)}`, {
    headers: session ? { Authorization: `Bearer ${session.access_token}` } : {},
  });
  if (res.status === 403 || res.status === 409) return [];
  if (!res.ok) throw new Error(`answer key: ${res.status}`);
  return res.json();
}
