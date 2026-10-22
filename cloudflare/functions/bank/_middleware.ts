// Gate for every /bank/* file. The files stay static; this only decides who may read them.
import { isServer, userId, type Env } from "../../server/auth";

export const onRequest: PagesFunction<Env> = async ({ request, env, next }) => {
  const server = isServer(env, request);
  const path = new URL(request.url).pathname;
  let allowed: boolean;
  if (path.startsWith("/bank/answers/")) {
    // Answers: server only. Everyone else is told the file doesn't exist.
    if (!server) return new Response("Not found", { status: 404 });
    allowed = true;
  } else {
    allowed = server || (await userId(env, request)) !== null;
  }
  if (!allowed) return new Response("Unauthorized", { status: 401 });
  const res = await next();
  // Browsers may keep it for a while; shared caches never.
  const out = new Response(res.body, res);
  out.headers.set("Cache-Control", "private, max-age=300");
  return out;
};
