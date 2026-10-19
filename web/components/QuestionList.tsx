"use client";

import Link from "next/link";
import { useId, useState } from "react";
import { filterRows, type QuestionRow, type Show, type Status } from "@/lib/questions";

const LABEL: Record<Status, string> = { solved: "Solved", missed: "Missed" };

/** Every question of one drill type, with a search box and a status filter. `base` is the type's drill link. */
export function QuestionList({ rows, status, base, current }: { rows: QuestionRow[]; status: Record<string, Status>; base: string; current?: string }) {
  const id = useId();
  const [query, setQuery] = useState("");
  const [show, setShow] = useState<Show>("all");
  const shown = filterRows(rows, status, query, show);
  return (
    <div className="stack">
      <div className="actions">
        <div className="field" style={{ flex: 1, minWidth: 200 }}>
          <label htmlFor={id + "q"}>Search</label>
          <input id={id + "q"} type="search" placeholder="Words from the question, or its source" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor={id + "s"}>Status</label>
          <select id={id + "s"} value={show} onChange={(e) => setShow(e.target.value as Show)}>
            <option value="all">All</option>
            <option value="new">Not started</option>
            <option value="missed">Missed</option>
            <option value="solved">Solved</option>
          </select>
        </div>
      </div>
      <p className="muted" role="status">{shown.length === rows.length ? `${rows.length} questions` : `${shown.length} of ${rows.length} questions`}</p>
      {shown.length > 0 && (
        <div className="list">
          {shown.map((r) => (
            // No prefetch: a type can have hundreds of rows on screen.
            <Link key={r.id} className="row" href={`${base}&q=${r.id}`} prefetch={false} aria-current={r.id === current ? "true" : undefined}>
              <span className="muted" style={{ minWidth: "4ch", textAlign: "right" }}>{r.n}</span>
              <div className="grow">
                <div className="title">{r.snippet}</div>
                {r.passage && <div className="muted">Passage: {r.passage}</div>}
                <div className="muted">{r.source}</div>
              </div>
              {/* stacked, so two tags do not squeeze the text on a phone */}
              <div style={{ display: "grid", gap: 4, justifyItems: "end" }}>
                {r.id === current && <span className="tag accent">Current</span>}
                {status[r.id] && <span className="tag">{LABEL[status[r.id]]}</span>}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
