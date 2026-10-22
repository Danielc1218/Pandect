// GET /api/bank/q/:id -> the question file, decrypted.
import { bankPaths } from "../../../../../web/lib/cdn";
import { openQuestionFile, type Env } from "../../../../server/auth";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export const onRequestGet: PagesFunction<Env> = async ({ env, request, params }) => {
  const id = String(params.id);
  if (!UUID.test(id)) return new Response("Not found", { status: 404 });
  return openQuestionFile(env, request, bankPaths.question(id));
};
