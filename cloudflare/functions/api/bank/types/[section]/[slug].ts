// GET /api/bank/types/:section/:slug -> the drill list for one question type, decrypted.
import { openQuestionFile, type Env } from "../../../../../server/auth";

export const onRequestGet: PagesFunction<Env> = async ({ env, request, params }) => {
  const { section, slug } = params as { section: string; slug: string };
  if (!/^(lr|rc)$/.test(section) || !/^[a-z0-9-]+$/.test(slug)) return new Response("Not found", { status: 404 });
  return openQuestionFile(env, request, `/bank/types/${section}/${slug}.json`);
};
