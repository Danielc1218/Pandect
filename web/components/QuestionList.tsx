"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { filterRows, type QuestionRow, type Show, type Status } from "@/lib/questions";

const LABEL: Record<Status, string> = { solved: "Solved", missed: "Missed" };
const PAGE = 50;
/** `text` with each searched word marked. */
function Marked({ text, query }: { text: string; query: string }) {
  const words = query.trim().split(/\s+/).filter(Boolean).map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  if (!words.length) return text;
  return text.split(new RegExp(`(${words.join("|")})`, "gi")).map((part, i) => (i % 2 ? <mark key={i}>{part}</mark> : part));
}

const SHOWS: [Show, string][] = [["all", "All"], ["new", "Not started"], ["missed", "Missed"], ["solved", "Solved"]];

/** Every question of one drill type, with a search box and a status filter. `base` is the type's drill link. */
export function QuestionList({ rows, status, base, current }: { rows: QuestionRow[]; status: Record<string, Status>; base: string; current?: string }) {
  const id = useId();
  const [query, setQuery] = useState("");
  const search = useRef<HTMLInputElement>(null);
  // "/" jumps to the search box, as on most sites with one; only when this list is on screen and nothing is being typed.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "/" || (e.target as HTMLElement).closest("input, select, textarea") || !search.current?.checkVisibility()) return;
      e.preventDefault();
      search.current.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  const [show, setShow] = useState<Show>("all");
  const matches = filterRows(rows, status, query, show);
  // A page of rows at a time; enough to reach the current question, so the popup can show it.
  const reach = Math.ceil((matches.findIndex((r) => r.id === current) + 1) / PAGE) * PAGE;
  const [limit, setLimit] = useState(Math.max(PAGE, reach));
  const shown = matches.slice(0, limit);
  const filter = (f: () => void) => { f(); setLimit(Math.max(PAGE, reach)); };
  return (
    <div className="stack">
      <div className="actions">
        <div className="field" style={{ flex: 1, minWidth: 200 }}>
          <label htmlFor={id + "q"}>Search</label>
          <input ref={search} id={id + "q"} type="search" placeholder="Words from the question, or its source  ( / )" value={query} onChange={(e) => filter(() => setQuery(e.target.value))} />
        </div>
      </div>
      <div className="chips" role="group" aria-label="Show questions">
        {SHOWS.map(([value, text]) => (
          <button key={value} type="button" aria-pressed={show === value} onClick={() => filter(() => setShow(value))}>
            {text} <span className="count">{value === "all" ? rows.length : rows.filter((r) => (status[r.id] ?? "new") === value).length}</span>
          </button>
        ))}
      </div>
      <p className="muted" role="status">{matches.length === rows.length ? `${rows.length} questions` : `${matches.length} of ${rows.length} questions`}</p>
      {shown.length > 0 && (
        <div className="list">
          {shown.map((r) => (
            // No prefetch: a type can have hundreds of rows on screen.
            <Link key={r.id} className="row" data-status={status[r.id]} href={`${base}&q=${r.id}`} prefetch={false} aria-current={r.id === current ? "true" : undefined}>
              <span className="muted" style={{ minWidth: "4ch", textAlign: "right" }}>{r.n}</span>
              <div className="grow">
                <div className="title"><Marked text={r.snippet} query={query} /></div>
                {r.passage && <div className="muted">Passage: <Marked text={r.passage} query={query} /></div>}
                <div className="muted"><Marked text={r.source} query={query} /></div>
              </div>
              {/* stacked, so two tags do not squeeze the text on a phone */}
              <div style={{ display: "grid", gap: 4, justifyItems: "end" }}>
                {r.id === current && <span className="tag accent">Current</span>}
                {status[r.id] && <span className={`tag ${status[r.id]}`}>{LABEL[status[r.id]]}</span>}
              </div>
            </Link>
          ))}
        </div>
      )}
      {matches.length > shown.length && (
        <div className="actions">
          <button type="button" className="btn" onClick={() => setLimit((n) => n + PAGE)}>
            Show {Math.min(PAGE, matches.length - shown.length)} more
          </button>
          <span className="muted" style={{ alignSelf: "center" }}>Showing {shown.length} of {matches.length}</span>
        </div>
      )}
    </div>
  );
}
