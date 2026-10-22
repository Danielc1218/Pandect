// Checks the grading Functions against a running site, as two real test accounts. It holds no question content:
// ids come from the site and the database at run time.
// Usage (from cloudflare/): node --env-file=.env scripts/smoke.ts <origin> <email> <password> <other-email> [<other-password>]
// .env gives VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY. It writes attempts and timed sections for the two
// accounts only, and finishes the sections it starts.
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const [origin, email, password, otherEmail, otherPassword = password] = process.argv.slice(2);
if (!otherEmail) throw new Error("usage: smoke.ts <origin> <email> <password> <other-email> [<other-password>]");

let failed = 0;
const check = (name: string, ok: boolean, detail?: unknown) => {
  if (!ok) failed++;
  console.log(`${ok ? "PASS" : "FAIL"} ${name}${ok || detail === undefined ? "" : `: ${JSON.stringify(detail)}`}`);
};
/** Runs one group of checks; a throw fails it and the rest carry on. */
const step = async (name: string, run: () => Promise<void>) => {
  try { await run(); } catch (e) { check(name, false, e instanceof Error ? e.message : e); }
};

async function signIn(address: string, secret: string) {
  const db = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_PUBLISHABLE_KEY!, { auth: { persistSession: false } });
  const { data, error } = await db.auth.signInWithPassword({ email: address, password: secret });
  if (error) throw error;
  return { db, token: data.session.access_token, id: data.user.id };
}

/** One call to the site; the body is parsed as JSON when it is. */
async function call(path: string, token: string | null, body?: string | object) {
  const res = await fetch(origin + path, {
    method: body === undefined ? "GET" : "POST",
    headers: { ...(token && { Authorization: `Bearer ${token}` }), ...(body !== undefined && { "Content-Type": "application/json" }) },
    body: typeof body === "string" ? body : body && JSON.stringify(body),
  });
  const text = await res.text();
  let json: any = null;
  try { json = JSON.parse(text); } catch {}
  return { status: res.status, json, text, cache: res.headers.get("Cache-Control") };
}

const expectStatus = (name: string, r: { status: number; text: string }, status: number) =>
  check(`${name} -> ${status}`, r.status === status, { status: r.status, body: r.text.slice(0, 120) });

/** A timed random section for this account, from the generated bank, and its questions in order. */
async function startSection(db: SupabaseClient) {
  const { data: id, error } = await db.rpc("start_random_section", { p_bank: "generated", p_section_type: "Logical Reasoning", p_size: 25 });
  if (error) throw error;
  const { data: rows, error: e2 } = await db.from("session_questions").select("question_id").eq("session_id", id).order("position");
  if (e2) throw e2;
  return { id: id as string, questions: rows.map((r) => r.question_id as string) };
}

const finish = (db: SupabaseClient, id: string) =>
  db.from("test_sessions").update({ finished_at: new Date().toISOString() }).eq("id", id).is("finished_at", null);

const me = await signIn(email, password);
const other = await signIn(otherEmail, otherPassword);
const letters = ["A", "B", "C", "D", "E"];

await step("no token", async () => {
  expectStatus("POST /api/answer without a token", await call("/api/answer", null, { questionId: crypto.randomUUID(), chosen: "A" }), 401);
});

await step("drill answers", async () => {
  const list = await call("/api/bank/types/lr/flaw", me.token);
  const id: string | undefined = list.json?.[0]?.id;
  if (!id) throw new Error(`no drill question from /api/bank/types/lr/flaw (${list.status})`);

  const first = await call("/api/answer", me.token, { questionId: id, chosen: "A" });
  expectStatus("POST /api/answer", first, 200);
  check("answer response has no-store", first.cache === "no-store", first.cache);
  const right: string | undefined = first.json?.correctAnswer;
  check("answer returns correctAnswer, correct and explanation",
    letters.includes(right!) && typeof first.json?.correct === "boolean" && "explanation" in (first.json ?? {}), first.json && Object.keys(first.json));
  if (!right) return;

  const wrong = letters.find((l) => l !== right)!;
  const graded = await call("/api/answer", me.token, { questionId: id, chosen: wrong });
  check("a wrong letter -> correct: false", graded.json?.correct === false && graded.json?.correctAnswer === right, graded.json?.correct);
  const { data: row } = await me.db.from("attempts").select("chosen, correct").eq("question_id", id).is("session_id", null)
    .order("created_at", { ascending: false }).limit(1).maybeSingle();
  check("its attempts row has correct = false", row?.chosen === wrong && row?.correct === false, row);

  const good = await call("/api/answer", me.token, { questionId: id, chosen: right });
  check("the right letter -> correct: true", good.json?.correct === true, good.json?.correct);

  expectStatus("malformed JSON body", await call("/api/answer", me.token, "{not json"), 400);
  expectStatus("chosen of the wrong type", await call("/api/answer", me.token, { questionId: id, chosen: 1 }), 400);
  expectStatus("chosen outside A-E", await call("/api/answer", me.token, { questionId: id, chosen: "F" }), 400);
  expectStatus("questionId of the wrong type", await call("/api/answer", me.token, { questionId: 7, chosen: "A" }), 400);
  expectStatus("a non-UUID question id", await call("/api/answer", me.token, { questionId: "../answers/x", chosen: "A" }), 404);
  expectStatus("an unknown question id", await call("/api/answer", me.token, { questionId: crypto.randomUUID(), chosen: "A" }), 404);

  const { data: other } = await me.db.from("questions").select("id, tests!inner(bank)").eq("tests.bank", "other").limit(1).maybeSingle();
  if (!other) throw new Error("no other-bank question visible to the user");
  expectStatus("an other-bank question id", await call("/api/answer", me.token, { questionId: other.id, chosen: "A" }), 404);
});

await step("timed sections", async () => {
  const mine = await startSection(me.db);
  const theirs = await startSection(other.db);
  const [q] = mine.questions;
  const save = (sessionId: string, questionId: string, chosen = "B") => call("/api/section-answer", me.token, { sessionId, questionId, chosen });
  // the answer key comes in pages of at most 25 positions; a random section is 25 questions, so 1-25 is all of it
  const answerKey = (sessionId: string, range = "&from=1&to=25") => call(`/api/answer-key?session=${sessionId}${range}`, me.token);

  expectStatus("section-answer on another account's session", await save(theirs.id, theirs.questions[0]), 403);
  expectStatus("answer-key on another account's session", await answerKey(theirs.id), 403);

  const saved = await save(mine.id, q);
  expectStatus("section-answer on own running session", saved, 200);
  check("section-answer returns { ok: true }", saved.json?.ok === true, saved.json);
  check("section-answer has no-store", saved.cache === "no-store", saved.cache);
  expectStatus("changing that answer", await save(mine.id, q, "C"), 200);
  const { data: choices } = await me.db.rpc("session_choices", { p_session: mine.id });
  check("session_choices has the one changed choice", choices?.length === 1 && choices[0].question_id === q && choices[0].chosen === "C", choices);
  const { data: hidden } = await me.db.from("attempts").select("correct").eq("session_id", mine.id);
  check("the grade is hidden while the section runs", hidden?.length === 0, hidden);

  expectStatus("section-answer for a question not in the section", await save(mine.id, theirs.questions.find((x) => !mine.questions.includes(x))!), 404);
  expectStatus("section-answer with a non-UUID session", await save("nope", q), 404);
  expectStatus("section-answer malformed JSON", await call("/api/section-answer", me.token, "["), 400);
  expectStatus("answer-key on own unfinished session", await answerKey(mine.id), 409);

  await finish(me.db, mine.id);
  await finish(other.db, theirs.id);
  expectStatus("section-answer on own finished session", await save(mine.id, q), 409);

  const key = await answerKey(mine.id);
  expectStatus("answer-key on own finished session", key, 200);
  check("answer-key has no-store", key.cache === "no-store", key.cache);
  const rows: any[] = Array.isArray(key.json) ? key.json : [];
  check("answer-key lists every question in order", rows.length === mine.questions.length && rows.every((r, i) => r.id === mine.questions[i]),
    { got: rows.length, want: mine.questions.length });
  check("answer-key rows have the web shape", rows.every((r) =>
    Object.keys(r).sort().join() === "correct_answer,explanation,id,number,question_type,section_type" && letters.includes(r.correct_answer) && typeof r.number === "number"),
    rows[0] && Object.keys(rows[0]));
  const { data: settled } = await me.db.from("attempts").select("chosen, correct").eq("session_id", mine.id);
  const keyed = rows.find((r) => r.id === q)?.correct_answer;
  check("the saved grade matches the key", settled?.length === 1 && settled[0].correct === (keyed === "C"), { settled, keyed });
  expectStatus("answer-key with a non-UUID session", await answerKey("nope"), 404);
  expectStatus("answer-key over 26 positions", await answerKey(mine.id, "&from=1&to=26"), 400);
  expectStatus("answer-key with no range", await answerKey(mine.id, ""), 400);
  expectStatus("answer-key with a backwards range", await answerKey(mine.id, "&from=5&to=3"), 400);
  expectStatus("answer-key from position 0", await answerKey(mine.id, "&from=0&to=3"), 400);
  const chunk = await answerKey(mine.id, "&from=3&to=5");
  const part: any[] = Array.isArray(chunk.json) ? chunk.json : [];
  check("answer-key 3-5 lists only those positions", part.map((r) => r.number).join() === "3,4,5" && part.every((r, i) => r.id === mine.questions[i + 2]),
    part.map((r) => r.number));
});

console.log(failed ? `\n${failed} check(s) failed` : "\nall checks passed");
process.exit(failed ? 1 : 0);
