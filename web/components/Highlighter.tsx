"use client";

import { useEffect, useEffectEvent, useState } from "react";

const NAME = "user-mark";
const BOXES = ".passage, .question > p"; // the text that can be marked: passages and arguments

/** A short stable key for a block of text, so its highlights come back wherever the same text is shown. */
function keyOf(text: string) {
  let h = 5381;
  for (let i = 0; i < text.length; i++) h = ((h << 5) + h + text.charCodeAt(i)) | 0;
  return `hl:${text.length}:${(h >>> 0).toString(36)}`;
}
const load = (key: string): [number, number][] => { try { return JSON.parse(localStorage.getItem(key) ?? "[]"); } catch { return []; } };
const save = (key: string, marks: [number, number][]) => {
  try { if (marks.length) localStorage.setItem(key, JSON.stringify(marks)); else localStorage.removeItem(key); } catch {}
};

/** The character offset of (node, offset) within `box`'s text. */
function offsetIn(box: Element, node: Node, offset: number) {
  const range = document.createRange();
  range.setStart(box, 0);
  range.setEnd(node, offset);
  return range.toString().length;
}
/** A range over characters [start, end) of `box`'s text. */
function rangeIn(box: Element, start: number, end: number) {
  const walk = document.createTreeWalker(box, NodeFilter.SHOW_TEXT);
  const range = document.createRange();
  let seen = 0, began = false;
  for (let node = walk.nextNode(); node; node = walk.nextNode()) {
    const len = node.textContent!.length;
    if (!began && start <= seen + len) { range.setStart(node, start - seen); began = true; }
    if (began && end <= seen + len) { range.setEnd(node, end - seen); return range; }
    seen += len;
  }
  return null;
}

/** Puts every stored highlight of the text now on screen into the page's highlight. */
function paint() {
  const marks = CSS.highlights.get(NAME);
  if (!marks) return;
  marks.clear();
  for (const box of document.querySelectorAll(BOXES)) {
    for (const [start, end] of load(keyOf(box.textContent ?? ""))) {
      const range = rangeIn(box, start, end);
      if (range) marks.add(range);
    }
  }
}

/** Adds [start, end) to a box's highlights, merging overlaps; or, with `remove`, drops the one containing start. */
function store(box: Element, start: number, end: number, remove = false) {
  const key = keyOf(box.textContent ?? "");
  let marks = load(key);
  if (remove) marks = marks.filter(([s, e]) => !(start >= s && start < e));
  else {
    marks.push([start, end]);
    marks.sort((a, b) => a[0] - b[0]);
    marks = marks.reduce<[number, number][]>((out, m) => {
      const last = out.at(-1);
      if (last && m[0] <= last[1]) last[1] = Math.max(last[1], m[1]); else out.push([...m]);
      return out;
    }, []);
  }
  save(key, marks);
  paint();
}

/**
 * A highlighter for passages and arguments, using the CSS Custom Highlight API (the text itself is never changed).
 * While it is on: selecting text marks it (on a touch screen, through the Highlight button that appears by the
 * selection), and clicking a mark removes it. Marks are kept in this browser against the text they belong to, so
 * they come back whenever that passage or argument is shown again. Without the API (old browsers) nothing shows.
 */
export function Highlighter() {
  const [supported, setSupported] = useState(false);
  const [on, setOn] = useState(false);
  const [count, setCount] = useState(0);
  const [touchAt, setTouchAt] = useState<{ x: number; y: number } | null>(null); // where the touch Highlight button goes

  useEffect(() => {
    if (!("highlights" in CSS)) return;
    CSS.highlights.set(NAME, new Highlight());
    setSupported(true); // eslint-disable-line react-hooks/set-state-in-effect -- known only in the browser
    const update = () => { paint(); setCount(CSS.highlights.get(NAME)?.size ?? 0); };
    update();
    // The question or passage on screen changes without this component remounting (a section's next question):
    // repaint whenever the page's content changes.
    let frame = 0;
    const watch = new MutationObserver(() => { cancelAnimationFrame(frame); frame = requestAnimationFrame(update); });
    watch.observe(document.body, { childList: true, subtree: true, characterData: true });
    return () => { watch.disconnect(); cancelAnimationFrame(frame); CSS.highlights.delete(NAME); };
  }, []);

  // H turns the highlighter on or off, unless something is being typed or a popup is open.
  useEffect(() => {
    if (!supported) return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.key !== "h" && e.key !== "H") || e.metaKey || e.ctrlKey || e.altKey || document.querySelector("dialog[open]") || (e.target as HTMLElement).closest("input, select, textarea")) return;
      e.preventDefault();
      setOn((v) => !v);
    };
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  }, [supported]);

  /** The current selection as a box and character offsets, when it lies inside one box. */
  const selected = () => {
    const selection = getSelection();
    if (!selection || selection.isCollapsed || !selection.rangeCount) return null;
    const range = selection.getRangeAt(0);
    const node = range.commonAncestorContainer;
    const box = (node instanceof Element ? node : node.parentElement)?.closest(BOXES);
    if (!box) return null;
    return { box, range, start: offsetIn(box, range.startContainer, range.startOffset), end: offsetIn(box, range.endContainer, range.endOffset) };
  };
  const markSelection = () => {
    const s = selected();
    if (!s || s.end <= s.start) return;
    store(s.box, s.start, s.end);
    getSelection()?.removeAllRanges();
    setTouchAt(null);
    setCount(CSS.highlights.get(NAME)?.size ?? 0);
  };
  // A pointer marks when it lets go; a touch screen offers a button by the selection instead, since the phone
  // keeps adjusting the selection (its handles) after the finger lifts.
  const release = useEffectEvent(() => { if (!matchMedia("(pointer: coarse)").matches) markSelection(); });

  useEffect(() => {
    if (!on) return;
    const coarse = matchMedia("(pointer: coarse)").matches;
    const changed = () => {
      if (!coarse) return;
      const s = selected();
      if (!s || s.end <= s.start) return setTouchAt(null);
      // under the selection, but always on screen (a long selection can run past the bottom)
      const r = s.range.getBoundingClientRect();
      setTouchAt({ x: Math.min(Math.max(r.left + r.width / 2, 56), innerWidth - 56), y: Math.min(Math.max(r.bottom + 8, 72), innerHeight - 56) });
    };
    // A click (or tap) on a mark, with nothing selected, removes it.
    const click = (e: MouseEvent) => {
      if (!getSelection()?.isCollapsed) return;
      const at = document.caretPositionFromPoint?.(e.clientX, e.clientY);
      const box = at && (at.offsetNode instanceof Element ? at.offsetNode : at.offsetNode.parentElement)?.closest(BOXES);
      if (!at || !box) return;
      const offset = offsetIn(box, at.offsetNode, at.offset);
      if (load(keyOf(box.textContent ?? "")).some(([s, end]) => offset >= s && offset < end)) {
        store(box, offset, offset, true);
        setCount(CSS.highlights.get(NAME)?.size ?? 0);
      }
    };
    document.addEventListener("pointerup", release);
    document.addEventListener("keyup", release); // a selection made with Shift and the arrow keys
    document.addEventListener("selectionchange", changed);
    addEventListener("scroll", changed, { capture: true, passive: true }); // the passage scrolls on its own too
    document.addEventListener("click", click);
    return () => {
      document.removeEventListener("pointerup", release);
      document.removeEventListener("keyup", release);
      document.removeEventListener("selectionchange", changed);
      removeEventListener("scroll", changed, { capture: true });
      document.removeEventListener("click", click);
      setTouchAt(null);
    };
  }, [on]);

  if (!supported) return null;
  const clear = () => {
    for (const box of document.querySelectorAll(BOXES)) save(keyOf(box.textContent ?? ""), []);
    paint();
    setCount(0);
  };
  return (
    <>
      <button type="button" className="btn highlighter" aria-pressed={on} onClick={() => setOn(!on)} aria-keyshortcuts="H"
        title="While on, select text in the passage or argument to highlight it; click a highlight to remove it">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M9 11l-6 6v3h9l3-3M22 12l-4.6 4.6a2 2 0 0 1-2.8 0l-5.2-5.2a2 2 0 0 1 0-2.8L14 4" />
        </svg>
        <span className="label">{on ? "Highlighter on" : "Highlighter"}</span>
      </button>
      {count > 0 && <button type="button" className="btn clear-marks" onClick={clear}>Clear highlights</button>}
      {touchAt && (
        // onPointerDown keeps the phone's selection alive until the click lands
        <button type="button" className="btn primary mark-button" style={{ left: touchAt.x, top: touchAt.y }}
          onPointerDown={(e) => e.preventDefault()} onClick={markSelection}>
          Highlight
        </button>
      )}
    </>
  );
}
