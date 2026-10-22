// node --test lib/practiceTests.test.mjs   (Node 23+ runs the TypeScript import directly)
import assert from "node:assert/strict";
import test from "node:test";
import { canStartSection, isCompleteTest } from "./practiceTests.ts";

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

test("a section can be started only if it has questions, and in the generated bank only from a complete test", () => {
  const of = (test_id, sections) => sections.map((s) => ({ ...s, test_id }));
  const sections = [
    ...of("GEN-PT-01", [lr(1), rc(), lr(3)]),
    ...of("GEN-PT-15", [lr(1), rc(), lr(3, 21)]),
    ...of("OT-1", [lr(1), lr(2, 26)]),
  ];
  assert.equal(canStartSection(sections, "generated", "GEN-PT-01", 2), true);
  assert.equal(canStartSection(sections, "generated", "GEN-PT-01", 4), false); // no such section
  assert.equal(canStartSection(sections, "generated", "GEN-PT-15", 1), false); // incomplete test
  assert.equal(canStartSection(sections, "generated", "GEN-LR", 1), false);    // the old one-section tests are empty now
  assert.equal(canStartSection(sections, "other", "OT-1", 2), true);     // other-bank tests need no particular shape
  assert.equal(canStartSection(sections, "other", "OT-1", 3), false);
});
