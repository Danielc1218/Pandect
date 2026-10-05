"use client";

import { useState, type ReactNode } from "react";
import { useSlide } from "./Nav";

/** Tabs with one highlight that slides to the chosen tab. `children[i]` is the panel for `labels[i]`. */
export function Tabs({ labels, children, label }: { labels: string[]; children: ReactNode[]; label: string }) {
  const [current, setCurrent] = useState(0);
  const { ref, style } = useSlide<HTMLDivElement>(current);
  return (
    <>
      <div ref={ref} className={`tabs${style ? " has-ind" : ""}`} role="tablist" aria-label={label}>
        {style && <span className="nav-ind" style={style} />}
        {labels.map((text, i) => (
          <button key={text} type="button" role="tab" aria-selected={i === current} className={i === current ? "active" : undefined} onClick={() => setCurrent(i)}>
            {text}
          </button>
        ))}
      </div>
      <div role="tabpanel" className="stack">{children[current]}</div>
    </>
  );
}
