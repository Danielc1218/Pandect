// node --test lib/prefs.test.mjs   (Node 23+ runs the TypeScript import directly)
import assert from "node:assert/strict";
import test from "node:test";
import { changed, contrast, DEFAULT_PREFS, sanitize } from "./prefs.ts";

test("sanitize keeps valid values and replaces or drops everything else", () => {
  assert.deepEqual(sanitize(null), DEFAULT_PREFS);
  assert.deepEqual(sanitize("x"), DEFAULT_PREFS);
  const p = sanitize({
    textScale: 9, lineHeight: "1.8", letterSpacing: -1, font: "comic", passageFont: "serif", accent: "#ABCDEF",
    extraTime: 1.5, hideTimer: "yes", underlineLinks: true, evil: "<script>", tint: "sepia",
  });
  assert.equal(p.textScale, 1.6);          // clamped to the range
  assert.equal(p.lineHeight, 1.8);         // numeric strings are fine
  assert.equal(p.letterSpacing, 0);
  assert.equal(p.font, "inter");           // not an allowed font
  assert.equal(p.passageFont, "serif");
  assert.equal(p.accent, "#abcdef");
  assert.equal(p.extraTime, 1.5);
  assert.equal(p.hideTimer, false);        // not a boolean
  assert.ok(!("underlineLinks" in p));      // a setting that no longer exists is dropped
  assert.equal(p.tint, "#eadbbd");         // a tint once stored by name keeps its color
  assert.ok(!("evil" in p));
  assert.equal(sanitize({ accent: "red; background: url(x)" }).accent, "");
  assert.equal(sanitize({ extraTime: 3 }).extraTime, 1);
  assert.equal(sanitize({ tint: "url(x)" }).tint, "");
  // saved colors: valid ones only, lower case, no repeats, at most eight
  const saved = sanitize({ savedTints: ["#AAAAAA", "#aaaaaa", "red", 7, ...Array.from({ length: 10 }, (_, i) => `#00000${i}`)] }).savedTints;
  assert.deepEqual(saved.slice(0, 2), ["#aaaaaa", "#000000"]);
  assert.equal(saved.length, 8);
});

test("only changes from the defaults are stored", () => {
  assert.deepEqual(changed(DEFAULT_PREFS), {});
  assert.deepEqual(changed({ ...DEFAULT_PREFS, savedAccents: [] }), {}); // an empty list is no change
  assert.deepEqual(changed({ ...DEFAULT_PREFS, textScale: 1.2, motion: "reduce" }), { textScale: 1.2, motion: "reduce" });
});

test("contrast follows WCAG", () => {
  assert.equal(Math.round(contrast("#000000", "#ffffff")), 21);
  assert.equal(contrast("#777777", "#777777"), 1);
  assert.ok(Math.abs(contrast("#1e6b43", "#fbfcfb") - 6.5) < 0.3);
});
