// POST /api/answer { questionId, chosen } -> { correct, correctAnswer, explanation }: grades a drill answer and records it.
import { admin, body, generatedAnswer, guarded, json, reply } from "../../server/auth";

export const onRequestPost = guarded<{ userId: string }>(async ({ env, request, data }) => {
  const { questionId, chosen } = (await body(request)) ?? {};
  if (typeof questionId !== "string" || typeof chosen !== "string" || !/^[A-E]$/.test(chosen)) return reply(400, "Bad request");
  // Only questions in the generated bank's index can be answered or have their answer revealed.
  const key = await generatedAnswer(env, request, questionId);
  if (!key) return reply(404, "Not found");
  const correct = chosen === key.correct_answer;
  const { error } = await admin(env).from("attempts").insert({ user_id: data.userId, question_id: questionId, chosen, correct });
  if (error) throw error;
  return json({ correct, correctAnswer: key.correct_answer, explanation: key.explanation });
});
