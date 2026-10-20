"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useSlide } from "./Nav";

/** Tabs with one highlight that slides to the chosen tab. `children[i]` is the panel for `labels[i]`; `initial` opens first. */
export function Tabs({ labels, children, label, initial = 0 }: { labels: string[]; children: ReactNode[]; label: string; initial?: number }) {
  const [current, setTab] = useState(initial);
  // The chosen tab is remembered for this browser tab, per page and tab list, so coming back keeps it.
  const key = `tab:${label}`;
  const setCurrent = (i: number) => { setTab(i); try { sessionStorage.setItem(key + location.pathname, String(i)); } catch {} };
  useEffect(() => {
    let saved = 0;
    try { saved = Number(sessionStorage.getItem(key + location.pathname)) || 0; } catch {}
    if (saved > 0 && saved < labels.length) setTab(saved); // eslint-disable-line react-hooks/set-state-in-effect -- storage is read only in the browser
  }, [key, labels.length]);
  const { ref, style } = useSlide<HTMLDivElement>(current);
  return (
    <>
      <div ref={ref} className={`tabs${style ? " has-ind" : ""}`} role="tablist" aria-label={label}>
        {style && <span className="nav-ind" style={style} />}
        {labels.map((text, i) => (
          <button key={text} type="button" role="tab" aria-selected={i === current} tabIndex={i === current ? 0 : -1}
            className={i === current ? "active" : undefined} onClick={() => setCurrent(i)}
            onKeyDown={(e) => {
              // Arrow keys, Home and End move between tabs, as in any tab list; focus follows.
              const to = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: labels.length - 1 }[e.key];
              if (to === undefined) return;
              e.preventDefault();
              const next = (to + labels.length) % labels.length;
              setCurrent(next);
              (e.currentTarget.parentElement!.querySelectorAll<HTMLElement>("[role=tab]")[next]).focus();
            }}>
            {text}
          </button>
        ))}
      </div>
      <div role="tabpanel" className="stack">{children[current]}</div>
    </>
  );
}
