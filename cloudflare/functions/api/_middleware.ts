// Every /api call needs a signed-in user.
import { userId, type Env } from "../../server/auth";

export const onRequest: PagesFunction<Env, any, { userId: string }> = async (context) => {
  const id = await userId(context.env, context.request);
  if (!id) return new Response("Unauthorized", { status: 401, headers: { "Cache-Control": "no-store" } });
  context.data.userId = id;
  return context.next();
};
