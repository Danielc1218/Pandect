"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useEffectEvent, useRef, useState, useTransition, type ReactNode } from "react";
import { answer } from "@/lib/actions";
import { typeset } from "@/lib/text";
import { Choices } from "./Choices";

export type DrillQuestion = { id: string; stimulus: string | null; prompt: string; options: Record<string, string>; source: string };

/** One drill question. `children` is the type's question list, shown in a popup; `nextHref` is the next unanswered question, if any. */
export function Drill({ question, type, number, answered, total, listHref, nextHref, children }: {
  question: DrillQuestion; type: string; number: number; answered: number; total: number; listHref: string; nextHref?: string; children: ReactNode;
}) {
  const router = useRouter();
  const list = useRef<HTMLDialogElement>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [eliminated, setEliminated] = useState<string[]>([]);
  const [result, setResult] = useState<{ correct: boolean; correctAnswer: string; explanation: string | null } | null>(null);
  const [pending, start] = useTransition();
  const submit = () => selected && !pending && start(async () => { setResult(await answer(question.id, selected)); router.refresh(); });
  const pick = (l: string) => { setSelected(l); setEliminated((list) => list.filter((x) => x !== l)); };
  // Keys: A–E or 1–5 choose, Enter submits and then moves on. Ignored while typing or with the question list open.
  const onKey = useEffectEvent((e: KeyboardEvent) => {
    if (e.metaKey || e.ctrlKey || e.altKey || list.current?.open || (e.target as HTMLElement).closest("input, select, textarea, button, a")) return;
    const letter = "ABCDE"[Number(e.key) - 1] ?? (/^[a-e]$/i.test(e.key) ? e.key.toUpperCase() : null);
    if (letter && !result && question.options[letter]) { e.preventDefault(); pick(letter); }
    else if (e.key === "Enter") { e.preventDefault(); if (result) router.push(nextHref ?? listHref); else submit(); }
  });
  useEffect(() => {
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  const toggle = (letter: string) => {
    setEliminated((list) => (list.includes(letter) ? list.filter((l) => l !== letter) : [...list, letter]));
    setSelected((s) => (s === letter ? null : s));
  };
  return (
    <div className="question" aria-busy={pending}>
      <div className="meta"><span className="tag">{type}</span><span className="muted">Question {number} of {total} · {question.source}</span></div>
      <div className="progress"><span style={{ width: `${Math.round((100 * answered) / total)}%` }} /></div>
      {question.stimulus && <p>{typeset(question.stimulus)}</p>}
      <h3>{typeset(question.prompt)}</h3>
      <Choices
        options={question.options} selected={selected} eliminated={eliminated} result={result}
        onSelect={pick}
        onEliminate={toggle}
      />
      <p className="muted keys-hint"><kbd>A</kbd>–<kbd>E</kbd> choose · <kbd>Enter</kbd> {result ? "next question" : "submit"} · right-click a choice to cross it out</p>
      {result && <div className="explain" role="status"><strong>{result.correct ? "Correct." : `Not quite. The answer is ${result.correctAnswer}.`}</strong>{result.explanation && <p>{typeset(result.explanation)}</p>}</div>}
      <div className="actions spread">
        <button className="btn" onClick={() => list.current?.showModal()}>Question list</button>
        {result ? (
          <Link className="btn primary" href={nextHref ?? listHref}>{nextHref ? "Next question" : "Back to question list"}</Link>
        ) : (
          // The refresh re-reads this question's status, so the list, the bar and the next link count the new answer.
          <button className="btn primary" disabled={!selected || pending} onClick={submit}>Submit answer</button>
        )}
      </div>
      <dialog ref={list} className="modal" style={{ width: "100%", maxWidth: 760 }} aria-labelledby="question-list-title">
        <div className="actions spread">
          <h2 id="question-list-title">{type}</h2>
          <form method="dialog"><button className="btn">Close</button></form>
        </div>
        {children}
      </dialog>
    </div>
  );
}
