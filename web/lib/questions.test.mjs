// node --test lib/questions.test.mjs   (Node 23+ runs the TypeScript import directly)
import assert from "node:assert/strict";
import test from "node:test";
import { filterRows, latestStatus, nextUnanswered, snippet } from "./questions.ts";

test("status comes from the newest attempt at each question", () => {
  const newestFirst = [
    { question_id: "a", correct: false },
    { question_id: "b", correct: true },
    { question_id: "a", correct: true },
  ];
  assert.deepEqual(latestStatus(newestFirst), { a: "missed", b: "solved" });
  assert.deepEqual(latestStatus([]), {});
});

test("next unanswered is the first one after the current question", () => {
  const ids = ["a", "b", "c", "d"];
  assert.equal(nextUnanswered(ids, {}), "a");
  assert.equal(nextUnanswered(ids, { a: "solved" }), "b");
  assert.equal(nextUnanswered(ids, { c: "missed" }, "b"), "d");
});

test("next unanswered wraps to the start and never returns the current question", () => {
  const ids = ["a", "b", "c", "d"];
  assert.equal(nextUnanswered(ids, { d: "solved" }, "c"), "a");
  assert.equal(nextUnanswered(ids, { a: "solved", b: "solved", d: "missed" }, "c"), undefined);
  assert.equal(nextUnanswered(ids, { a: "solved", b: "solved", c: "solved", d: "solved" }), undefined);
});

test("rows filter by search words and by status", () => {
  const rows = [
    { id: "a", n: 1, source: "Test 4, section 2, question 7", snippet: "Editorial: The city council should…" },
    { id: "b", n: 2, source: "Test 9, section 1, question 3", snippet: "Some dinosaurs had feathers." },
    { id: "c", n: 3, source: "Test 9, section 4, question 12", snippet: "The mayor's argument is flawed." },
  ];
  const status = { a: "solved", c: "missed" };
  const ids = (query, show) => filterRows(rows, status, query, show).map((r) => r.id);
  assert.deepEqual(ids("", "all"), ["a", "b", "c"]);
  assert.deepEqual(ids("  DINOSAURS ", "all"), ["b"]);
  assert.deepEqual(ids("test 9", "all"), ["b", "c"]);
  assert.deepEqual(ids("9 mayor", "all"), ["c"]);       // every word must match, in the text or the source
  assert.deepEqual(ids("", "new"), ["b"]);
  assert.deepEqual(ids("", "missed"), ["c"]);
  assert.deepEqual(ids("test 9", "solved"), []);
});

test("search also covers the opening words of a row's passage", () => {
  const rows = [
    { id: "a", n: 1, source: "Test 4", snippet: "What is the main point?", passage: "Glaciers carve valleys…" },
    { id: "b", n: 2, source: "Test 4", snippet: "What is the main point?" },
  ];
  assert.deepEqual(filterRows(rows, {}, "glaciers main", "all").map((r) => r.id), ["a"]);
});

test("snippet collapses whitespace and cuts long text at a word", () => {
  assert.equal(snippet("  Short\n text. "), "Short text.");
  const long = snippet("word ".repeat(100));
  assert.ok(long.length <= 141 && long.endsWith("…") && !long.includes(" …"));
});
