import type { ReactNode } from "react";

/** Placeholder blocks shaped like the real page, shown by the loading.tsx files while a page's data loads. */
export const Bar = ({ w = "100%", h = 16 }: { w?: number | string; h?: number }) => <span className="sk" style={{ width: w, height: h }} />;

export function Skeleton({ children }: { children: ReactNode }) {
  return (
    <div className="skeleton" aria-busy="true">
      <span className="sr-only" role="status">Loading…</span>
      {children}
    </div>
  );
}

// A real <h1> around the bar, so the placeholder takes exactly the heading's height.
export const SkTitle = ({ w = "40%" }: { w?: string }) => <h1 aria-hidden="true"><span className="sk inline" style={{ width: w }}>&nbsp;</span></h1>;

export function SkStats({ n = 4 }: { n?: number }) {
  return (
    <div className="stats">
      {Array.from({ length: n }, (_, i) => (
        <div key={i} className="stat"><Bar w="45%" h={30} /><Bar w="75%" h={14} /></div>
      ))}
    </div>
  );
}

export function SkList({ rows = 5 }: { rows?: number }) {
  return (
    <div className="list">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="row">
          <div className="grow"><Bar w="45%" h={18} /><Bar w="30%" h={15} /></div>
          <Bar w={64} />
        </div>
      ))}
    </div>
  );
}

export function SkPanel({ lines = 3 }: { lines?: number }) {
  return (
    <div className="panel">
      <Bar w="50%" h={22} />
      {Array.from({ length: lines }, (_, i) => <Bar key={i} w={i % 2 ? "70%" : "90%"} />)}
    </div>
  );
}

export function SkQuestion() {
  return (
    <div className="question">
      <Bar w="50%" h={14} />
      <Bar h={8} />
      <Bar /><Bar /><Bar w="80%" />
      <Bar w="60%" h={22} />
      {Array.from({ length: 5 }, (_, i) => <Bar key={i} h={44} />)}
    </div>
  );
}
