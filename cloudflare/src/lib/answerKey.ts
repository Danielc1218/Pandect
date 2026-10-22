// Browser version of web/lib/answerKey.ts. Only the grading Functions can open answer files.
import type * as web from "@/lib/answerKey";

/** Not used in the browser: web/lib/actions.ts imports it for answer and saveAnswer, which src/lib/actions.ts replaces. */
export async function questionAnswer(_id: string): ReturnType<typeof web.questionAnswer> {
  throw new Error("answers are read by the grading Functions only");
}

type Key = Awaited<ReturnType<typeof web.sessionAnswerKey>>;

const PAGE = 25; // positions per call, the most functions/api/answer-key.ts serves

/**
 * A finished session's answers and reasoning, for marking it; empty while the section is running or if it isn't the
 * user's. Asked for a page of positions at a time, so one Function call stays within the plan's limits, until a page
 * comes back short (a section has at most two).
 */
export async function sessionAnswerKey(sessionId: string): ReturnType<typeof web.sessionAnswerKey> {
  const all: Key = [];
  for (let from = 1; ; from += PAGE) {
    const res = await fetch(`/api/answer-key?session=${encodeURIComponent(sessionId)}&from=${from}&to=${from + PAGE - 1}`);
    if (res.status === 403 || res.status === 409) return [];
    if (!res.ok) throw new Error(`answer key: ${res.status}`);
    const page: Key = await res.json();
    all.push(...page);
    if (page.length < PAGE) return all;
  }
}
