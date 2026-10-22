// Every /api call but signing in needs a signed-in user; a cookie-authenticated POST must come from this site's own pages.
import { reply, type Env } from "../../server/auth";
import { clearCookies, who, withCookies } from "../../server/session";

export const onRequest: PagesFunction<Env, any, { userId: string; email?: string; token: string }> = async (context) => {
  const { request, env } = context;
  const url = new URL(request.url);
  // The session cookies are SameSite=Lax; checking Origin as well keeps another site's form from posting with them.
  const unsafe = request.method !== "GET" && request.method !== "HEAD";
  if (unsafe && !request.headers.has("Authorization") && request.headers.get("Origin") !== url.origin) return reply(403, "Forbidden");
  if (url.pathname.startsWith("/api/auth/")) return context.next();
  const me = await who(env, request);
  if (!me) return withCookies(reply(401, "Unauthorized"), clearCookies());
  context.data.userId = me.userId;
  context.data.email = me.email;
  context.data.token = me.token;
  return withCookies(await context.next(), me.setCookies);
};
