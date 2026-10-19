"use client";

import { useEffect, useState } from "react";

const NAME = "user-mark";

/**
 * A highlighter for passages and arguments: while it is on, selecting text marks it. It uses the CSS Custom
 * Highlight API, so the text itself is never changed and the marks go when the question's text leaves the page.
 * Where the API is missing (older browsers) the button is not shown.
 */
export function Highlighter() {
  const [supported, setSupported] = useState(false);
  const [on, setOn] = useState(false);
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!("highlights" in CSS)) return;
    const marks = new Highlight();
    CSS.highlights.set(NAME, marks);
    setSupported(true); // eslint-disable-line react-hooks/set-state-in-effect -- known only in the browser
    return () => { CSS.highlights.delete(NAME); };
  }, []);

  useEffect(() => {
    if (!on) return;
    const mark = () => {
      const selection = getSelection();
      if (!selection || selection.isCollapsed) return;
      const range = selection.getRangeAt(0);
      const node = range.commonAncestorContainer;
      if (!(node instanceof Element ? node : node.parentElement)?.closest(".passage, .question > p")) return;
      const marks = CSS.highlights.get(NAME)!;
      marks.add(range.cloneRange());
      selection.removeAllRanges();
      setCount(marks.size);
    };
    document.addEventListener("pointerup", mark);
    document.addEventListener("keyup", mark); // a selection made with Shift and the arrow keys
    return () => { document.removeEventListener("pointerup", mark); document.removeEventListener("keyup", mark); };
  }, [on]);

  if (!supported) return null;
  return (
    <>
      <button type="button" className="btn" aria-pressed={on} onClick={() => setOn(!on)} title="While on, selecting text in the passage or argument highlights it">
        {on ? "Highlighter on" : "Highlighter"}
      </button>
      {count > 0 && (
        <button type="button" className="btn" onClick={() => { CSS.highlights.get(NAME)!.clear(); setCount(0); }}>Clear highlights</button>
      )}
    </>
  );
}
