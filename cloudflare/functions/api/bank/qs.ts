// GET /api/bank/qs?ids=<id>,<id>,... -> up to 25 question files, decrypted, in the order asked. One call opens a
// page of a section instead of one call per question. A missing file makes the whole call a 404.
import { bankPaths, type CdnQuestion } from "../../../../web/lib/cdn";
import { guarded, questionReply, readQuestionFile, reply, UUID } from "../../../server/auth";

const MAX = 25; // src/lib/bank.ts asks in pages of this size

export const onRequestGet = guarded(async ({ env, request }) => {
  const ids = (new URL(request.url).searchParams.get("ids") ?? "").split(",");
  if (ids.length > MAX || !ids.every((id) => UUID.test(id))) return reply(400, `ids: 1 to ${MAX} question ids`);
  const files = await Promise.all(ids.map((id) => readQuestionFile<CdnQuestion>(env, request, bankPaths.question(id))));
  return files.includes(null) ? reply(404, "Not found") : questionReply(files);
});
