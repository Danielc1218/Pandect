// Stand-in for web/lib/answerKey.ts until answers are graded on Cloudflare: same names, so imports build.
import type { SupabaseClient } from "@supabase/supabase-js";

const notPorted = (): never => { throw new Error("not ported yet"); };

export async function questionAnswer(_id: string) { return notPorted(); }
export async function sessionAnswerKey(_db: SupabaseClient, _sessionId: string) { return notPorted(); }
