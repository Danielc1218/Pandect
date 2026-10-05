"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { finishSection, saveAnswer } from "@/lib/actions";
import { Choices } from "./Choices";

export type SectionQuestion = { id: string; number: number; stimulus: string | null; prompt: string; options: Record<string, string>; passage: number | null };
const LIMIT = 35 * 60;

export function SectionRunner({
  sessionId, title, subtitle, startedAt, questions, passages, saved,
}: {
  sessionId: string; title: string; subtitle: string; startedAt: string;
  questions: SectionQuestion[]; passages: string[]; saved: Record<string, string>;
}) {
  const [index, setIndex] = useState(() => Math.max(0, questions.findIndex((q) => !saved[q.id])));
  const [answers, setAnswers] = useState(saved);
  const [eliminated, setEliminated] = useState<Record<string, string[]>>({});
  const [flagged, setFlagged] = useState<string[]>([]);
  const [left, setLeft] = useState<number | null>(null);
  const [pending, start] = useTransition();
  const q = questions[index];
  const finish = () => start(() => finishSection(sessionId));

  useEffect(() => {
    document.body.classList.add("test");
    const tick = () => setLeft(Math.max(0, LIMIT - Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000)));
    tick();
    const timer = setInterval(tick, 1000);
    return () => { clearInterval(timer); document.body.classList.remove("test"); };
  }, [startedAt]);
  useEffect(() => { if (left === 0) finish(); }, [left]); // eslint-disable-line react-hooks/exhaustive-deps

  const select = (letter: string) => {
    setAnswers((a) => ({ ...a, [q.id]: letter }));
    setEliminated((e) => ({ ...e, [q.id]: (e[q.id] ?? []).filter((l) => l !== letter) }));
    start(() => saveAnswer(sessionId, q.id, letter));
  };
  const eliminate = (letter: string) =>
    setEliminated((e) => {
      const list = e[q.id] ?? [];
      return { ...e, [q.id]: list.includes(letter) ? list.filter((l) => l !== letter) : [...list, letter] };
    });
  const low = left !== null && left <= 300;
  const clock = left === null ? "35:00" : `${Math.floor(left / 60)}:${String(left % 60).padStart(2, "0")}`;

  return (
    <>
      <header className="test-bar">
        <h1 className="title">{title}</h1>
        <span className="muted">{subtitle}</span>
        <span className="spacer" />
        <span className="muted">{low ? "Under 5 minutes left" : "Time left"}</span>
        <span className={`timer${low ? " low" : ""}`} role="timer">{clock}</span>
        <Link className="btn" href="/practice">Pause and exit</Link>
      </header>
      <div className={`reader${q.passage === null ? " single" : ""}`}>
        {q.passage !== null && (
          <article className="passage">
            <div><span className="tag">Passage {q.passage + 1} of {passages.length}</span></div>
            {passages[q.passage].split(/\n\s*\n/).map((p, i) => <p key={i}>{p}</p>)}
          </article>
        )}
        <div className="question">
          <div className="meta"><span className="muted">Question {index + 1} of {questions.length}</span></div>
          <div className="progress"><span style={{ width: `${Math.round((100 * Object.keys(answers).length) / questions.length)}%` }} /></div>
          {q.stimulus && <p>{q.stimulus}</p>}
          <h3>{q.prompt}</h3>
          <Choices options={q.options} selected={answers[q.id] ?? null} eliminated={eliminated[q.id] ?? []} onSelect={select} onEliminate={eliminate} />
          <div className="actions spread">
            <button className="btn" onClick={() => setFlagged((f) => (f.includes(q.id) ? f.filter((x) => x !== q.id) : [...f, q.id]))}>
              {flagged.includes(q.id) ? "Remove flag" : "Flag for review"}
            </button>
            {index < questions.length - 1 ? (
              <button className="btn primary" onClick={() => setIndex(index + 1)}>Next question</button>
            ) : (
              <button className="btn primary" disabled={pending} onClick={finish}>Finish section</button>
            )}
          </div>
        </div>
      </div>
      <nav className="qnav" aria-label="Questions in this section">
        {questions.map((item, i) => {
          const state = i === index ? "current" : flagged.includes(item.id) ? "flagged" : answers[item.id] ? "done" : "";
          const label = `Question ${i + 1}${answers[item.id] ? ", answered" : ""}${flagged.includes(item.id) ? ", flagged" : ""}`;
          return <a key={item.id} href="#" className={state || undefined} aria-label={label} aria-current={i === index ? "true" : undefined} onClick={(e) => { e.preventDefault(); setIndex(i); }}>{i + 1}</a>;
        })}
        <span className="spacer" />
        <button className="btn primary" disabled={pending} onClick={finish}>Finish section</button>
      </nav>
    </>
  );
}
