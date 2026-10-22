// node --test lib/practiceTests.test.mjs   (Node 23+ runs the TypeScript import directly)
import assert from "node:assert/strict";
import test from "node:test";
import { isCompleteTest } from "./practiceTests.ts";

const lr = (n, questions = 25) => ({ section_number: n, questions, passages: 0 });
const rc = (passages = 4) => ({ section_number: 2, questions: 27, passages });

test("a complete test has LR sections 1 and 3 of 25 questions and an RC section 2 of 4 passages", () => {
  assert.equal(isCompleteTest([lr(1), rc(), lr(3)]), true);
  assert.equal(isCompleteTest([lr(3), lr(1), rc()]), true); // any order
});

test("anything short of that is not complete", () => {
  assert.equal(isCompleteTest([]), false);
  assert.equal(isCompleteTest([lr(1), rc()]), false);             // no section 3
  assert.equal(isCompleteTest([rc()]), false);                    // RC only
  assert.equal(isCompleteTest([lr(1), rc(), lr(3, 21)]), false);  // a short section 3
  assert.equal(isCompleteTest([lr(1, 24), rc(), lr(3)]), false);
  assert.equal(isCompleteTest([lr(1), rc(3), lr(3)]), false);     // 3 passages
  assert.equal(isCompleteTest([lr(1), rc(), lr(3), lr(4)]), false); // an extra section
});
