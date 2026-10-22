// GET /api/bank/q/:id -> one question from its bucket, decrypted.
import { guarded, questionReply, readQuestions, UUID } from "../../../../server/auth";

export const onRequestGet = guarded(async ({ env, request, params }) => {
  const id = String(params.id);
  if (!UUID.test(id)) return new Response("Not found", { status: 404 });
  const [q] = await readQuestions(env, request, [id]);
  return q ? questionReply(q) : new Response("Not found", { status: 404 });
});
