"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useEffectEvent, useRef, useState, useTransition, type ReactNode } from "react";
import { answer } from "@/lib/actions";
import { typeset } from "@/lib/text";
import { Choices } from "./Choices";
import { usePrefs } from "./Prefs";

/** `sourceHref` is the practice test the question comes from, when the bank has fixed tests. */
export type DrillQuestion = { id: string; stimulus: string | null; prompt: string; options: Record<string, string>; source: string; sourceHref?: string };

/** One drill question. `children` is the type's question list, shown in a popup; `nextHref` is the next unanswered question, if any. */
export function Drill({ question, type, number, answered, total, listHref, nextHref, children }: {
  question: DrillQuestion; type: string; number: number; answered: number; total: number; listHref: string; nextHref?: string; children: ReactNode;
}) {
  const router = useRouter();
  const list = useRef<HTMLDialogElement>(null);
  const explain = useRef<HTMLDivElement>(null);
  const next = useRef<HTMLAnchorElement>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [eliminated, setEliminated] = useState<string[]>([]);
  const [result, setResult] = useState<{ correct: boolean; correctAnswer: string; explanation: string | null } | null>(null);
  const [pending, start] = useTransition();
  // A stopwatch for this question, stopped by the answer; hidden with the timer setting.
  const { hideTimer } = usePrefs();
  const [startedAt] = useState(() => Date.now());
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    if (result) return;
    const tick = setInterval(() => setSeconds(Math.floor((Date.now() - startedAt) / 1000)), 1000);
    return () => clearInterval(tick);
  }, [result, startedAt]);
  const clock = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
  const submit = () => selected && !pending && start(async () => { setResult(await answer(question.id, selected)); router.refresh(); });
  const pick = (l: string) => { setSelected(l); setEliminated((list) => list.filter((x) => x !== l)); };
  const toggle = (letter: string) => {
    setEliminated((list) => (list.includes(letter) ? list.filter((l) => l !== letter) : [...list, letter]));
    setSelected((s) => (s === letter ? null : s));
  };
  // Keys: A–E or 1–5 choose, Enter submits and then moves on. Ignored while typing or with the question list open.
  const onKey = useEffectEvent((e: KeyboardEvent) => {
    if (e.metaKey || e.ctrlKey || e.altKey || list.current?.open || (e.target as HTMLElement).closest("input, select, textarea, button, a")) return;
    const letter = "ABCDE"[Number(e.key) - 1] ?? (/^[a-e]$/i.test(e.key) ? e.key.toUpperCase() : null);
    if (letter && !result && question.options[letter]) { e.preventDefault(); if (e.shiftKey) toggle(letter); else pick(letter); }
    else if (e.key === "Enter") { e.preventDefault(); if (result) router.push(nextHref ?? listHref); else submit(); }
  });
  // Once answered, bring the explanation into view and put focus on the way forward.
  useEffect(() => {
    if (!result) return;
    explain.current?.scrollIntoView({ block: "nearest", behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
    next.current?.focus({ preventScroll: true });
  }, [result]);
  useEffect(() => {
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  return (
    <div className="question" aria-busy={pending}>
      <div className="meta"><span className="tag">{type}</span><span className="muted">Question {number} of {total} · {question.sourceHref ? <Link href={question.sourceHref}>{question.source}</Link> : question.source}</span>
        {!hideTimer && <span className="stopwatch" role="timer" aria-label={`Time on this question ${clock}`} title={result ? "Time you took" : "Time on this question"}>{clock}</span>}
      </div>
      <div className="progress"><span style={{ width: `${Math.round((100 * answered) / total)}%` }} /></div>
      {question.stimulus && <p>{typeset(question.stimulus)}</p>}
      <h3>{typeset(question.prompt)}</h3>
      <Choices
        options={question.options} selected={selected} eliminated={eliminated} result={result}
        onSelect={pick}
        onEliminate={toggle}
      />
      <p className="muted keys-hint"><kbd>A</kbd>–<kbd>E</kbd> choose · <kbd>Enter</kbd> {result ? "next question" : "submit"} · <kbd>Shift</kbd>+letter, <kbd>✕</kbd> or right-click crosses a choice out</p>
      {result && <div ref={explain} className={`explain ${result.correct ? "right" : "wrong"}`} role="status"><strong>{result.correct ? `Correct: ${result.correctAnswer}.` : `Not quite. You chose ${selected}; the answer is ${result.correctAnswer}.`}</strong>{result.explanation && <p>{typeset(result.explanation)}</p>}</div>}
      <div className="actions spread">
        <button className="btn" onClick={() => {
          list.current?.showModal();
          list.current?.querySelector("[aria-current='true']")?.scrollIntoView({ block: "center" }); // open at this question
        }}>Question list</button>
        {result ? (
          <Link ref={next} className="btn primary" href={nextHref ?? listHref}>{nextHref ? "Next question" : "Back to question list"}</Link>
        ) : (
          // The refresh re-reads this question's status, so the list, the bar and the next link count the new answer.
          <button className="btn primary" disabled={!selected || pending} onClick={submit}>{pending ? "Checking…" : selected ? `Submit ${selected}` : "Choose an answer"}</button>
        )}
      </div>
      {/* a click on the dimmed backdrop (outside the box) closes it */}
      <dialog ref={list} className="modal" style={{ width: "100%", maxWidth: 760 }} aria-labelledby="question-list-title"
        onClick={(e) => {
          const box = e.currentTarget.getBoundingClientRect();
          if (e.clientX < box.left || e.clientX > box.right || e.clientY < box.top || e.clientY > box.bottom) e.currentTarget.close();
        }}>
        <div className="actions spread">
          <h2 id="question-list-title">{type}</h2>
          <form method="dialog"><button className="btn">Close</button></form>
        </div>
        {children}
      </dialog>
    </div>
  );
}
