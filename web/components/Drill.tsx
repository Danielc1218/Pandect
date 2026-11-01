"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useEffectEvent, useRef, useState, useTransition, type ReactNode } from "react";
import { answer } from "@/lib/actions";
import { closeOnBackdrop } from "@/lib/dialog";
import type { Status } from "@/lib/questions";
import { choiceOrder, originalLetter, relabel, shownLetter } from "@/lib/shuffle";
import { typeset } from "@/lib/text";
import { Choices } from "./Choices";
import { usePrefs } from "./Prefs";
import { ShortcutsHelp } from "./ShortcutsHelp";
import { Mascot } from "./Mascot";

export type DrillQuestion = { id: string; stimulus: string | null; prompt: string; options: Record<string, string>; source: string };

/**
 * One drill question. `children` is the type's question list, shown in a popup; `nextHref` is the next unanswered
 * question, if any; `prevHref` and `skipHref` are its neighbors in the list.
 */
export function Drill({ question, type, number, answered, total, listHref, nextHref, prevHref, skipHref, before, children }: {
  question: DrillQuestion; type: string; number: number; answered: number; total: number; listHref: string; nextHref?: string;
  prevHref?: string; skipHref?: string; before?: Status; children: ReactNode;
}) {
  const router = useRouter();
  const list = useRef<HTMLDialogElement>(null);
  const explain = useRef<HTMLDivElement>(null);
  const next = useRef<HTMLAnchorElement>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [eliminated, setEliminated] = useState<string[]>([]);
  const [result, setResult] = useState<{ correct: boolean; correctAnswer: string; explanation: string | null } | null>(null);
  const [order] = useState(() => choiceOrder(question.options, String(Math.random())));
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
  // A failed check (a dropped connection) says so and keeps the choice, rather than replacing the page with an error.
  const [failed, setFailed] = useState(false);
  const submit = () => selected && !pending && start(async () => {
    setFailed(false);
    try { setResult(await answer(question.id, selected)); router.refresh(); } catch { setFailed(true); }
  });
  const pick = (l: string) => { setSelected(l); setEliminated((list) => list.filter((x) => x !== l)); };
  const toggle = (letter: string) => {
    setEliminated((list) => (list.includes(letter) ? list.filter((l) => l !== letter) : [...list, letter]));
    setSelected((s) => (s === letter ? null : s));
  };
  const openList = () => {
    list.current?.showModal();
    list.current?.querySelector("[aria-current='true']")?.scrollIntoView({ block: "center" }); // open at this question
  };
  // Keys: A–E or 1–5 choose, Enter submits and then moves on, ← and → step through the list. Ignored while typing,
  // with the question list open, or when a choice already used the key (its arrows move between choices).
  const onKey = useEffectEvent((e: KeyboardEvent) => {
    if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey || document.querySelector("dialog[open]") || (e.target as HTMLElement).closest("input, select, textarea, button, a")) return;
    const shown = "ABCDE"[Number(e.key) - 1] ?? (/^[a-e]$/i.test(e.key) ? e.key.toUpperCase() : null);
    const letter = shown ? originalLetter(order, shown) : null;
    if (letter && !result && question.options[letter]) { e.preventDefault(); if (e.shiftKey) toggle(letter); else pick(letter); }
    else if (e.key === "Enter") { e.preventDefault(); if (result) router.push(nextHref ?? listHref); else submit(); }
    else if (e.key === "l" || e.key === "L") { e.preventDefault(); openList(); }
    else if (e.key === "ArrowLeft" && prevHref) { e.preventDefault(); router.push(prevHref); }
    else if (e.key === "ArrowRight" && skipHref) { e.preventDefault(); router.push(skipHref); }
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
      <div className="meta"><span className="tag">{type}</span>
        {/* a question opened again says how it went last time, until it is answered anew */}
        {before && !result && <span className={`tag ${before}`}>{before === "solved" ? "Solved before" : "Missed before"}</span>}<span className="muted">Question {number} of {total} · {question.source}</span>
        {!hideTimer && <span className="stopwatch" role="timer" aria-label={`Time on this question ${clock}`} title={result ? "Time you took" : "Time on this question"}>{clock}</span>}
      </div>
      <div className="progress" role="img" aria-label={`${answered} of ${total} answered`} title={`${answered} of ${total} answered`}><span style={{ width: `${Math.round((100 * answered) / total)}%` }} /></div>
      {question.stimulus && <p>{typeset(question.stimulus)}</p>}
      <h3>{typeset(question.prompt)}</h3>
      <Choices
        options={question.options} order={order} selected={selected} eliminated={eliminated} result={result}
        onSelect={pick}
        onEliminate={toggle}
      />
      <p className="muted keys-hint"><kbd>A</kbd>–<kbd>E</kbd> choose · <kbd>Enter</kbd> {result ? "next question" : "submit"} · <kbd>←</kbd> <kbd>→</kbd> previous and skip · <kbd>Shift</kbd>+letter, <kbd>✕</kbd> or right-click crosses a choice out</p>
      <ShortcutsHelp keys={[["A–E or 1–5", "Choose an answer"], ["Shift+A–E", "Cross out a choice, or bring it back"], ["Enter", "Submit, then go to the next question"], ["↑ ↓", "Move between the choices"], ["← →", "Previous question, or skip to the next"], ["L", "Open the question list"], ["H", "Turn the highlighter on or off"], ["/", "Search the question list"]]} />
      {failed && <p className="field invalid" role="alert"><span className="hint">Your answer couldn&rsquo;t be checked. Check your connection and submit again.</span></p>}
      {result && <div ref={explain} className={`explain mascot-feedback ${result.correct ? "right" : "wrong"}`} role="status"><Mascot animation={result.correct ? "celebrate" : "thinking"} /><div className="mascot-feedback-copy"><strong>{result.correct ? `Correct: ${shownLetter(order, result.correctAnswer)}.` : `Not quite. You chose ${selected && shownLetter(order, selected)}; the answer is ${shownLetter(order, result.correctAnswer)}.`}</strong>{result.explanation && <p>{typeset(relabel(result.explanation, order))}</p>}</div></div>}
      <div className="actions spread">
        <button className="btn" onClick={openList} aria-keyshortcuts="L">Question list</button>
        {result ? (
          <Link ref={next} className="btn primary" href={nextHref ?? listHref}>{nextHref ? "Next question" : "Back to question list"}</Link>
        ) : (
          // The refresh re-reads this question's status, so the list, the bar and the next link count the new answer.
          <button className="btn primary" disabled={!selected || pending} onClick={submit}>{pending ? "Checking…" : selected ? `Submit ${shownLetter(order, selected)}` : "Choose an answer"}</button>
        )}
      </div>
      <dialog ref={list} className="modal" style={{ width: "100%", maxWidth: 760 }} aria-labelledby="question-list-title" onClick={closeOnBackdrop}>
        <div className="actions spread modal-head">
          <h2 id="question-list-title">{type}</h2>
          <form method="dialog"><button className="btn">Close</button></form>
        </div>
        {children}
      </dialog>
    </div>
  );
}
