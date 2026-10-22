// node --test lib/cdn.test.mjs   (Node 23+ runs the TypeScript import directly)
import assert from "node:assert/strict";
import test from "node:test";
import { bankPaths, bucketOf, cdnGet, importBankKey, open, openEntries, seal, sourceOf, toDrillQuestion, typeSlug } from "./cdn.ts";

test("type slugs are lowercase words joined by dashes", () => {
  assert.equal(typeSlug("Resolve/Explain"), "resolve-explain");
  assert.equal(typeSlug("Author's Attitude"), "author-s-attitude");
});

test("a bucket is the first two characters of the lowercase id", () => {
  assert.equal(bucketOf("3F2b0c1e-0000-4000-8000-000000000000"), "3f");
  assert.equal(bucketOf("ab"), "ab");
});

test("bank paths name the question and answer buckets and the type-list files", () => {
  assert.equal(bankPaths.questionBucket("3f2b0c1e-0000-4000-8000-000000000000"), "/bank/q/3f.json");
  assert.equal(bankPaths.answerBucket("3f2b0c1e-0000-4000-8000-000000000000"), "/bank/answers/3f.json");
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
  assert.deepEqual(await open(key, await seal(key, x, "question", "id1"), "question", "id1"), x);
});

test("opening fails for the wrong purpose, a flipped byte, or another key", async () => {
  const key = await newKey();
  const s = await seal(key, { a: 1 }, "question", "id1");
  await assert.rejects(open(key, s, "answer", "id1"));
  const bytes = Uint8Array.from(atob(s.data), (c) => c.charCodeAt(0));
  bytes[0] ^= 1;
  await assert.rejects(open(key, { ...s, data: btoa(String.fromCharCode(...bytes)) }, "question", "id1"));
  await assert.rejects(open(await newKey(), s, "question", "id1"));
});

test("a value of about 1 MB seals and opens", async () => {
  const key = await newKey();
  const x = { text: "é".repeat(500_000) };
  assert.deepEqual(await open(key, await seal(key, x, "question", "id1"), "question", "id1"), x);
});

test("an entry sealed for one id does not open as another", async () => {
  const key = await newKey();
  const s = await seal(key, { a: 1 }, "answer", "aa000000-0000-4000-8000-000000000001");
  assert.deepEqual(await open(key, s, "answer", "aa000000-0000-4000-8000-000000000001"), { a: 1 });
  await assert.rejects(open(key, s, "answer", "aa000000-0000-4000-8000-000000000002"));
});

test("a bucket round-trips: each bucket fetched once, only the asked entries opened, missing ones null", async () => {
  const key = await newKey();
  const [a1, a2, b1] = ["aa000000-0000-4000-8000-000000000001", "aa000000-0000-4000-8000-000000000002", "bb000000-0000-4000-8000-000000000001"];
  const buckets = {
    "/bank/answers/aa.json": { [a1]: await seal(key, { n: 1 }, "answer", a1), [a2]: await seal(key, { n: 2 }, "answer", a2) },
    "/bank/answers/bb.json": { [b1]: await seal(key, { n: 3 }, "answer", b1) },
  };
  const fetched = [];
  const get = async (path) => { fetched.push(path); return buckets[path] ?? null; };
  assert.deepEqual(await openEntries(key, [b1, a2, a1, "cc000000-0000-4000-8000-000000000001", "aa000000-0000-4000-8000-000000000009"], "answer", get),
    [{ n: 3 }, { n: 2 }, { n: 1 }, null, null]);
  assert.deepEqual(fetched.sort(), ["/bank/answers/aa.json", "/bank/answers/bb.json", "/bank/answers/cc.json"]);
  // An entry moved under another id doesn't open, and a question bucket can't be read as answers.
  await assert.rejects(openEntries(key, [a1], "answer", async () => ({ [a1]: buckets["/bank/answers/aa.json"][a2] })));
  await assert.rejects(openEntries(key, [a1], "question", async () => buckets["/bank/answers/aa.json"]));
  assert.deepEqual(await openEntries(key, ["__proto__"], "answer", async () => ({})), [null]);
});

test("two seals of the same value use different IVs", async () => {
  const key = await newKey();
  assert.notEqual((await seal(key, 1, "answer", "x")).iv, (await seal(key, 1, "answer", "x")).iv);
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
  const body = await seal(key, { a: 1 }, "question", "/bank/types/lr/x.json");
  let url, headers;
  globalThis.fetch = async (u, init) => { url = String(u); headers = init?.headers; return url.includes("missing") ? new Response("", { status: 404 }) : Response.json(body); };
  try {
    assert.deepEqual(await cdnGet("/bank/types/lr/x.json", { key, purpose: "question", bank: "generated" }), { a: 1 });
    assert.ok(url.endsWith("/bank/types/lr/x.json"));
    await assert.rejects(cdnGet("/bank/types/lr/y.json", { key, purpose: "question", bank: "generated" })); // sealed for another path
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
