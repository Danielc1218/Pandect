// node --test lib/cdn.test.mjs   (Node 23+ runs the TypeScript import directly)
import assert from "node:assert/strict";
import test from "node:test";
import { bankPaths, sourceOf, toDrillQuestion, typeSlug } from "./cdn.ts";

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
