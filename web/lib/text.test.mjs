// node --test lib/text.test.mjs
import assert from "node:assert/strict";
import test from "node:test";
import { typeset } from "./text.ts";

test("a spaced double hyphen becomes an em dash; other hyphens stay", () => {
  assert.equal(typeset("deliver -- short journeys"), "deliver—short journeys");
  assert.equal(typeset("runner-up, well-known"), "runner-up, well-known");
});
