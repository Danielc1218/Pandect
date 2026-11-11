// POST /api/auth/login | signup | logout, GET /api/auth/me. The session is set here in httpOnly cookies (server/session.ts),
// so the browser never holds a Supabase token or talks to Supabase. The middleware lets these through without a session.
import { logInWith, signUpWith } from "../../../../web/lib/authCore";
import { admin, body, guarded, json, reply } from "../../../server/auth";
import { clearCookies, sessionCookies, userClient, who, withCookies } from "../../../server/session";

export const onRequestPost = guarded(async ({ env, request, params }) => {
  if (params.action === "logout") {
    const me = await who(env, request);
    if (me) await admin(env).auth.admin.signOut(me.token).catch(() => {}); // ends the refresh token too
    return withCookies(json({ redirect: "/" }), clearCookies());
  }
  if (params.action !== "login" && params.action !== "signup") return reply(404, "Not found");
  const form = (await body(request)) ?? {};
  const db = userClient(env);
  const field = (name: string) => (typeof form[name] === "string" ? (form[name] as string) : "");
  const result = params.action === "login" ? await logInWith(db, field) : await signUpWith(db, field, new URL(request.url).origin);
  if (!("redirect" in result)) return json(result);
  const { data } = await db.auth.getSession(); // the client keeps the new session in memory
  return withCookies(json(result), data.session ? sessionCookies(data.session) : undefined);
});

/** Who is signed in: { id, email }, or null. Refreshes an expired session on the way. */
export const onRequestGet = guarded(async ({ env, request, params }) => {
  if (params.action !== "me") return reply(404, "Not found");
  const me = await who(env, request);
  if (!me) return withCookies(json(null), clearCookies());
  return withCookies(json({ id: me.userId, email: me.email }), me.setCookies);
});
