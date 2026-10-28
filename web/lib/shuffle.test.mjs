// node --test lib/shuffle.test.mjs   (Node 23+ runs the TypeScript import directly)
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";
import { choiceOrder, originalLetter, relabel, shownLetter } from "./shuffle.ts";

const reversed = ["E", "D", "C", "B", "A"];

test("choice orders are seeded, reversible, and leave the other bank alone", () => {
  const options = Object.fromEntries("ABCDE".split("").map((letter) => [letter, letter]));
  const order = choiceOrder(options, "a sitting and question", "generated");
  assert.deepEqual(order, choiceOrder(options, "a sitting and question", "generated"));
  assert.deepEqual([...order].sort(), "ABCDE".split(""));
  assert.deepEqual(choiceOrder(options, "any seed", "other"), "ABCDE".split(""));
  for (const letter of "ABCDE") assert.equal(originalLetter(order, shownLetter(order, letter)), letter);
  const sparse = choiceOrder({ A: "one", C: "three" }, "any seed", "other");
  assert.deepEqual(sparse, ["A", "C"]);
  assert.equal(shownLetter(sparse, "C"), "C");
  assert.equal(originalLetter(sparse, "C"), "C");
});

test("explanation labels change once while articles, passages and logic symbols stay put", () => {
  assert.equal(relabel("A cataloged manuscript is here. (A) is possible.", reversed), "A cataloged manuscript is here. (E) is possible.");
  assert.equal(relabel("choice A, answer B, and option C", reversed), "choice E, answer D, and option C");
  assert.equal(relabel("A and C", reversed), "E and C");
  assert.equal(relabel("A, B, and D", reversed), "E, D, and B");
  assert.equal(relabel("A is possible. B is possible.", reversed), "E is possible. D is possible.");
  assert.equal(relabel("Passage A discusses passage B; the method proposed in A differs.", reversed), "Passage A discusses passage B; the method proposed in A differs.");
  assert.equal(relabel("Passage A does not reject the account defended in B. Choice B is wrong; (B) is wrong.", reversed), "Passage A does not reject the account defended in B. Choice D is wrong; (D) is wrong.");
  assert.equal(relabel("Because most A are B and most B are C, A must be C. (A) is wrong.", reversed), "Because most A are B and most B are C, A must be C. (E) is wrong.");
  assert.equal(relabel("(A) (B) (C) (D) (E)", ["B", "C", "D", "E", "A"]), "(E) (A) (B) (C) (D)");
  assert.equal(relabel("(A) First.\n\n(B) Second.\n\n(C) Third.", ["C", "A", "B", "D", "E"]), "(A) Third.\n\n(B) First.\n\n(C) Second.");
  assert.equal(relabel("Intro.\n\n(A) First.\n\n(B) Second.", reversed), "Intro.\n\n(E) First.\n\n(D) Second.");
});

const bankFile = new URL("../../generated_questions/bank_content.json", import.meta.url);
test("generated bank explanation audit", { skip: !existsSync(bankFile) && "local bank file missing" }, () => {
  const questions = JSON.parse(readFileSync(bankFile, "utf8")).questions;
  const order = ["B", "C", "D", "E", "A"];
  let parenthesized = 0, labeledExplanations = 0;
  const mappedBare = [];
  for (const [index, question] of questions.entries()) {
    const explanation = question.explanation ?? "";
    const displayed = relabel(explanation, order);
    assert.equal(displayed.length, explanation.length, `explanation ${index} changed length`);
    const before = explanation.split("\n\n"), after = displayed.split("\n\n");
    const allLabeled = before.every((paragraph) => /^\([A-E]\)/.test(paragraph));
    if (allLabeled) {
      labeledExplanations++;
      assert.deepEqual(after.map((paragraph) => paragraph[1]), [...after.map((paragraph) => paragraph[1])].sort(), `explanation ${index} paragraphs out of order`);
    }
    const aligned = allLabeled ? [...before].sort((a, b) => shownLetter(order, a[1]).localeCompare(shownLetter(order, b[1]))) : before;
    assert.equal(after.length, aligned.length, `explanation ${index} paragraph count`);
    for (const [paragraphIndex, original] of aligned.entries()) {
      const shown = after[paragraphIndex];
      assert.equal(shown.length, original.length, `explanation ${index} paragraph ${paragraphIndex} changed length`);
      for (const match of original.matchAll(/\(([A-E])\)/g)) {
        parenthesized++;
        assert.equal(shown[match.index + 1], shownLetter(order, match[1]), `explanation ${index} parenthesized token ${match.index}`);
      }
      for (const match of original.matchAll(/(?<![A-Za-z0-9])([A-E])(?![A-Za-z0-9])/g)) {
        const at = match.index;
        if (shown[at] !== match[1] && !(original[at - 1] === "(" && original[at + 1] === ")")) {
          mappedBare.push({ index, from: match[1], to: shown[at], context: original.slice(Math.max(0, at - 25), at + 35) });
        }
      }
    }
  }
  console.log(`Bank audit: ${questions.length} explanations; ${labeledExplanations} sorted by letter; ${parenthesized} parenthesized references; ${mappedBare.length} mapped bare tokens.`);
  console.log("Mapped bare tokens:", mappedBare);
});
