// POST /api/section-answer { sessionId, questionId, chosen } -> { ok: true }: saves or changes one answer in the
// caller's running timed section. The grade is stored but the caller can't read it until the section is finished.
import { admin, body, generatedAnswer, guarded, json, reply, UUID } from "../../server/auth";

export const onRequestPost = guarded<{ userId: string }>(async ({ env, request, data }) => {
  const { sessionId, questionId, chosen } = (await body(request)) ?? {};
  if (typeof sessionId !== "string" || typeof questionId !== "string" || typeof chosen !== "string" || !/^[A-E]$/.test(chosen)) {
    return reply(400, "Bad request");
  }
  if (!UUID.test(sessionId) || !UUID.test(questionId)) return reply(404, "Not found");
  const db = admin(env);
  const [session, listed] = await Promise.all([
    db.from("test_sessions").select("user_id, finished_at").eq("id", sessionId).maybeSingle(),
    db.from("session_questions").select("question_id").eq("session_id", sessionId).eq("question_id", questionId).maybeSingle(),
  ]);
  if (session.error || listed.error) throw session.error ?? listed.error;
  if (session.data?.user_id !== data.userId) return reply(403, "Forbidden");
  if (session.data.finished_at) return reply(409, "This section is finished");
  const key = listed.data && (await generatedAnswer(env, request, questionId));
  if (!key) return reply(404, "Not found");
  const { error } = await db.from("attempts").upsert(
    { user_id: data.userId, session_id: sessionId, question_id: questionId, chosen, correct: chosen === key.correct_answer },
    { onConflict: "session_id,question_id" });
  if (error) throw error;
  return json({ ok: true });
});
