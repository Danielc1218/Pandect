// GET /api/answer-key?session=<id> -> the answers and reasoning for the caller's finished section, in the shape of
// web/lib/answerKey.ts's sessionAnswerKey. Only generated-bank questions are listed.
import type { CdnAnswer } from "../../../web/lib/cdn";
import { admin, guarded, json, readAnswer, reply, UUID } from "../../server/auth";

type Row = { position: number; questions: { id: string; question_type: string; section_type: string } };

export const onRequestGet = guarded<{ userId: string }>(async ({ env, request, data }) => {
  const sessionId = new URL(request.url).searchParams.get("session") ?? "";
  if (!UUID.test(sessionId)) return reply(404, "Not found");
  const db = admin(env);
  const session = await db.from("test_sessions").select("user_id, finished_at").eq("id", sessionId).maybeSingle();
  if (session.error) throw session.error;
  if (session.data?.user_id !== data.userId) return reply(403, "Forbidden");
  if (!session.data.finished_at) return reply(409, "This section is still running");
  const index = await db.from("session_questions")
    .select("position, questions!inner(id, question_type, section_type, tests!inner(bank))")
    .eq("questions.tests.bank", "generated").eq("session_id", sessionId).order("position");
  if (index.error) throw index.error;
  const rows = index.data as unknown as Row[];
  const answers = await Promise.all(rows.map((r) => readAnswer(env, request, r.questions.id)));
  if (answers.some((a) => !a)) return reply(500, "An answer file is missing");
  return json(rows.map(({ position, questions: q }, i) => {
    const a = answers[i] as CdnAnswer;
    return { id: q.id, number: position, question_type: q.question_type, section_type: q.section_type, correct_answer: a.correct_answer, explanation: a.explanation };
  }));
});
