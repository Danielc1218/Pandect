// node --test lib/cdn.test.mjs   (Node 23+ runs the TypeScript import directly)
import assert from "node:assert/strict";
import test from "node:test";
import { bankPaths, cdnGet, importBankKey, open, seal, sourceOf, toDrillQuestion, typeSlug } from "./cdn.ts";

test("type slugs are lowercase words joined by dashes", () => {
  assert.equal(typeSlug("Resolve/Explain"), "resolve-explain");
  assert.equal(typeSlug("Author's Attitude"), "author-s-attitude");
});

test("bank paths name the question, answer and type-list files", () => {
  assert.equal(bankPaths.question("x"), "/bank/q/x.json");
  assert.equal(bankPaths.answer("x"), "/bank/answers/x.json");
  assert.equal(bankPaths.typeList("lr", "Resolve/Explain"), "/bank/types/lr/resolve-explain.json");
  assert.equal(bankPaths.typeList("rc", "Main Point"), "/bank/types/rc/main-point.json");
  assert.equal(bankPaths.version, "/bank/version.json");
});

test("source names the test, section and question", () => {
  assert.equal(sourceOf({ test_name: "Practice Set 3", section_number: 2, question_number: 5 }),
    "Practice Set 3, section 2, question 5");
});

test("a question file maps to the drill page's shape", () => {
  const q = {
    id: "q1", test_id: "t1", test_name: "Practice Set 3", section_type: "lr", section_number: 2, question_number: 5,
    question_type: "Resolve/Explain", stimulus: "Some text.", prompt: "Which one?", options: { A: "a", B: "b" },
    passage_id: null, passage: "Glaciers carve valleys.",
  };
  assert.deepEqual(toDrillQuestion(q), {
    id: "q1", stimulus: "Some text.", prompt: "Which one?", options: { A: "a", B: "b" },
    source: "Practice Set 3, section 2, question 5", testId: "t1", passage: "Glaciers carve valleys.",
  });
});

const newKey = () => importBankKey(btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32)))));

test("a sealed value opens with the same key and purpose", async () => {
  const key = await newKey();
  const x = { a: [1, "two", null], b: { c: "é" } };
  assert.deepEqual(await open(key, await seal(key, x, "question"), "question"), x);
});

test("opening fails for the wrong purpose, a flipped byte, or another key", async () => {
  const key = await newKey();
  const s = await seal(key, { a: 1 }, "question");
  await assert.rejects(open(key, s, "answer"));
  const bytes = Uint8Array.from(atob(s.data), (c) => c.charCodeAt(0));
  bytes[0] ^= 1;
  await assert.rejects(open(key, { ...s, data: btoa(String.fromCharCode(...bytes)) }, "question"));
  await assert.rejects(open(await newKey(), s, "question"));
});

test("two seals of the same value use different IVs", async () => {
  const key = await newKey();
  assert.notEqual((await seal(key, 1, "answer")).iv, (await seal(key, 1, "answer")).iv);
});

test("cdnGet refuses the other bank before any fetch", async () => {
  const realFetch = globalThis.fetch;
  globalThis.fetch = () => { throw new Error("fetch must not be called"); };
  try {
    await assert.rejects(cdnGet("/bank/q/x.json", { key: await newKey(), purpose: "question", bank: "other" }),
      { message: "the other bank never reads Cloudflare" });
  } finally { globalThis.fetch = realFetch; }
});

test("cdnGet opens a sealed file, and a 404 is null", async () => {
  const realFetch = globalThis.fetch;
  const key = await newKey();
  const body = await seal(key, { a: 1 }, "question");
  let url, headers;
  globalThis.fetch = async (u, init) => { url = String(u); headers = init?.headers; return url.includes("missing") ? new Response("", { status: 404 }) : Response.json(body); };
  try {
    assert.deepEqual(await cdnGet("/bank/q/x.json", { key, purpose: "question", bank: "generated" }), { a: 1 });
    assert.ok(url.endsWith("/bank/q/x.json"));
    assert.equal(headers, undefined);
    assert.equal(await cdnGet("/bank/q/missing.json", { key, purpose: "question", bank: "generated" }), null);
  } finally { globalThis.fetch = realFetch; }
});

test("cdnGet throws on other failures", async () => {
  const realFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response("", { status: 500 });
  try {
    await assert.rejects(cdnGet("/bank/q/x.json", { key: await newKey(), purpose: "question", bank: "generated" }));
  } finally { globalThis.fetch = realFetch; }
});

test("cdnGet throws on a 200 that is not a bank file", async () => {
  const realFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response("<!doctype html>", { headers: { "content-type": "text/html" } });
  try { await assert.rejects(cdnGet("/bank/q/x.json", { key: await newKey(), purpose: "question", bank: "generated" }), { message: "/bank/q/x.json: not a bank file" }); }
  finally { globalThis.fetch = realFetch; }
});
