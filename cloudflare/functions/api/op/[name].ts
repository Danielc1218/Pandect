// POST /api/op/<name> with a JSON array of arguments -> web/lib/ops.ts's result. Every read and write the pages make
// runs here as the signed-in user, so the browser sees only the operation's name and what the page shows.
import { dbBank, ops, type Ctx } from "../../../../web/lib/ops";
import { guarded, json, reply } from "../../../server/auth";
import { userClient } from "../../../server/session";

export const onRequestPost = guarded<{ userId: string; email?: string; token: string }>(async ({ env, request, params, data }) => {
  const name = String(params.name);
  if (!Object.hasOwn(ops, name)) return reply(404, "Not found");
  const args: unknown = await request.json().catch(() => null);
  if (!Array.isArray(args)) return reply(400, "Bad request");
  const db = userClient(env, data.token);
  // Only the generated bank is ever on Cloudflare.
  const ctx: Ctx = { db, user: { id: data.userId, email: data.email }, bank: dbBank(db, "generated") };
  const run = ops[name as keyof typeof ops] as (ctx: Ctx, ...args: unknown[]) => Promise<unknown>;
  return json((await run(ctx, ...args)) ?? null);
});
