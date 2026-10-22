// GET /api/bank/q/:id -> the question file, decrypted.
import { bankPaths } from "../../../../../web/lib/cdn";
import { guarded, openQuestionFile, UUID } from "../../../../server/auth";

export const onRequestGet = guarded(async ({ env, request, params }) => {
  const id = String(params.id);
  if (!UUID.test(id)) return new Response("Not found", { status: 404 });
  return openQuestionFile(env, request, bankPaths.question(id));
});
