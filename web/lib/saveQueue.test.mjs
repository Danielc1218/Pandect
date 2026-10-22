import assert from "node:assert/strict";
import test from "node:test";
import { createSaveQueue } from "./saveQueue.ts";

test("saves immediately and coalesces rapid edits without overlapping writes", async () => {
  const writes = [];
  const releases = [];
  const save = createSaveQueue((value) => {
    writes.push(value);
    return new Promise((resolve) => releases.push(resolve));
  });
  const first = save({ theme: "dark" });
  assert.deepEqual(writes, [{ theme: "dark" }]);
  const middle = save({ theme: "dark", textScale: 1.1 });
  const last = save({ theme: "dark", textScale: 1.2 });
  assert.equal(writes.length, 1);
  releases.shift()();
  await first;
  assert.deepEqual(writes, [{ theme: "dark" }, { theme: "dark", textScale: 1.2 }]);
  let saved = false;
  last.then(() => { saved = true; });
  assert.equal(saved, false);
  releases.shift()();
  await Promise.all([middle, last]);
  assert.equal(saved, true);
});

test("a failed save rejects its callers and later changes can still save", async () => {
  const failed = Promise.withResolvers();
  const writes = [];
  const save = createSaveQueue((value) => {
    writes.push(value);
    return writes.length === 1 ? failed.promise : Promise.resolve();
  });
  const first = assert.rejects(save("first"), /offline/);
  const next = save("next");
  failed.reject(new Error("offline"));
  await Promise.all([first, next]);
  assert.deepEqual(writes, ["first", "next"]);
  await save("last");
  assert.deepEqual(writes, ["first", "next", "last"]);
});
