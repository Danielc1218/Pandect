// GET /api/answer-key?session=<id>&from=<n>&to=<m> -> the answers and reasoning for positions from..to (1-based,
// inclusive, at most 25) of the caller's finished section, in the shape of web/lib/answerKey.ts's sessionAnswerKey.
// Only generated-bank questions are listed. Paged so one call stays within the plan's subrequest and CPU limits.
import type { CdnAnswer } from "../../../web/lib/cdn";
import { admin, guarded, json, readAnswers, reply, UUID } from "../../server/auth";

const PAGE = 25; // src/lib/answerKey.ts asks in pages of this size

type Row = { position: number; questions: { id: string; question_type: string; section_type: string } };

export const onRequestGet = guarded<{ userId: string }>(async ({ env, request, data }) => {
  const query = new URL(request.url).searchParams;
  const sessionId = query.get("session") ?? "";
  if (!UUID.test(sessionId)) return reply(404, "Not found");
  const [from, to] = ["from", "to"].map((k) => Number(query.get(k) ?? NaN));
  if (!Number.isInteger(from) || !Number.isInteger(to) || from < 1 || to < from || to - from >= PAGE) return reply(400, `from and to: 1 to ${PAGE} positions`);
  const db = admin(env);
  const session = await db.from("test_sessions").select("user_id, finished_at").eq("id", sessionId).maybeSingle();
  if (session.error) throw session.error;
  if (session.data?.user_id !== data.userId) return reply(403, "Forbidden");
  if (!session.data.finished_at) return reply(409, "This section is still running");
  const index = await db.from("session_questions")
    .select("position, questions!inner(id, question_type, section_type, tests!inner(bank))")
    .eq("questions.tests.bank", "generated").eq("session_id", sessionId).gte("position", from).lte("position", to).order("position");
  if (index.error) throw index.error;
  const rows = index.data as unknown as Row[];
  const answers = await readAnswers(env, request, rows.map((r) => r.questions.id)); // one fetch per bucket in the page
  if (answers.some((a) => !a)) return reply(500, "An answer file is missing");
  return json(rows.map(({ position, questions: q }, i) => {
    const a = answers[i] as CdnAnswer;
    return { id: q.id, number: position, question_type: q.question_type, section_type: q.section_type, correct_answer: a.correct_answer, explanation: a.explanation };
  }));
});
