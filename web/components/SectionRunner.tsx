"use client";

import Link from "next/link";
import { Fragment, useEffect, useEffectEvent, useRef, useState, useTransition } from "react";
import { finishSection, saveAnswer } from "@/lib/actions";
import { typeset } from "@/lib/text";
import { sectionMinutes } from "@/lib/timing";
import { Choices } from "./Choices";
import { Highlighter } from "./Highlighter";
import { PassageText } from "./PassageText";
import { ThemeToggle } from "./Nav";
import { usePrefs } from "./Prefs";
import { ShortcutsHelp } from "./ShortcutsHelp";

export type SectionQuestion = { id: string; number: number; stimulus: string | null; prompt: string; options: Record<string, string>; passage: number | null };

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
  const [saving, startSave] = useTransition(); // an answer on its way to the database
  const q = questions[index];
  const prefs = usePrefs(); // extended time and a hidden timer, from the settings page
  const limit = Math.round(sectionMinutes(questions.length) * prefs.extraTime * 60);
  const finish = () => start(() => finishSection(sessionId));
  // Finishing always asks first (the button sits where Next was), and offers the first blank or flagged question.
  const check = useRef<HTMLDialogElement>(null);
  const blank = questions.filter((x) => !answers[x.id]);
  const unsure = questions.filter((x) => flagged.includes(x.id));
  const askFinish = () => check.current?.showModal();
  const goTo = (id: string) => { setIndex(questions.findIndex((x) => x.id === id)); check.current?.close(); };

  useEffect(() => {
    document.body.classList.add("test");
    const tick = () => setLeft(limit - Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000)); // negative once over time
    tick();
    const timer = setInterval(tick, 1000);
    return () => { clearInterval(timer); document.body.classList.remove("test"); };
  }, [startedAt, limit]);
  // When time runs out the learner is asked once: stop here, or keep going with the clock counting up.
  // The choice is remembered for this section, so reloading or resuming does not ask again.
  const timeUp = useRef<HTMLDialogElement>(null);
  const overtimeKey = `overtime:${sessionId}`;
  const expired = left !== null && left <= 0;
  useEffect(() => {
    if (expired && !timeUp.current?.open && localStorage.getItem(overtimeKey) === null) timeUp.current?.showModal();
  }, [expired, overtimeKey]);
  const keepGoing = () => { localStorage.setItem(overtimeKey, "1"); timeUp.current?.close(); };

  const select = (letter: string) => {
    setAnswers((a) => ({ ...a, [q.id]: letter }));
    setEliminated((e) => ({ ...e, [q.id]: (e[q.id] ?? []).filter((l) => l !== letter) }));
    store(q.id, letter);
  };
  // Answers that failed to save (a dropped connection), kept to try again; the newest choice per question wins.
  const [unsaved, setUnsaved] = useState<Record<string, string>>({});
  const store = (id: string, letter: string) => startSave(async () => {
    try {
      await saveAnswer(sessionId, id, letter);
      setUnsaved((u) => (u[id] === letter ? Object.fromEntries(Object.entries(u).filter(([k]) => k !== id)) : u));
    } catch {
      setUnsaved((u) => ({ ...u, [id]: letter }));
    }
  });
  const retry = () => Object.entries(unsaved).forEach(([id, letter]) => store(id, letter));
  const failed = Object.keys(unsaved).length;
  // Closing the tab while an answer is on its way would lose it: the browser asks first.
  useEffect(() => {
    if (!saving) return;
    const ask = (e: BeforeUnloadEvent) => e.preventDefault();
    addEventListener("beforeunload", ask);
    return () => removeEventListener("beforeunload", ask);
  }, [saving]);
  const eliminate = (letter: string) =>
    setEliminated((e) => {
      const list = e[q.id] ?? [];
      return { ...e, [q.id]: list.includes(letter) ? list.filter((l) => l !== letter) : [...list, letter] };
    });
  // On a phone the question buttons are one sideways-scrolling row: keep the current one in view.
  const items = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const row = items.current, el = row?.querySelector<HTMLElement>("[aria-current]");
    if (row && el && row.scrollWidth > row.clientWidth) row.scrollLeft = el.offsetLeft - row.offsetLeft - (row.clientWidth - el.offsetWidth) / 2;
  }, [index]);
  // Moving on from far down a long question (on a phone, under the passage) starts the next one at its top.
  const card = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (card.current && card.current.getBoundingClientRect().top < 0) card.current.scrollIntoView({ block: "start" });
  }, [index]);
  const flag = () => setFlagged((f) => (f.includes(q.id) ? f.filter((x) => x !== q.id) : [...f, q.id]));
  // Keys: A–E or 1–5 answer, ← and → move between questions, F flags. Not while a dialog is open or a key was handled.
  const onKey = useEffectEvent((e: KeyboardEvent) => {
    if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey || document.querySelector("dialog[open]") || (e.target as HTMLElement).closest("input, select, textarea")) return;
    const letter = "ABCDE"[Number(e.key) - 1] ?? (/^[a-e]$/i.test(e.key) ? e.key.toUpperCase() : null);
    if (letter && q.options[letter]) (e.shiftKey ? eliminate : select)(letter);
    else if (e.key === "ArrowRight" && index < questions.length - 1) setIndex(index + 1);
    else if (e.key === "ArrowLeft" && index > 0) setIndex(index - 1);
    else if (e.key === "f" || e.key === "F") flag();
    else return;
    e.preventDefault();
  });
  useEffect(() => {
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  const low = left !== null && left <= 300;
  const shown = Math.abs(left ?? limit);
  // Hours appear once a clock passes an hour (a section left open over days counts up a long way).
  const hms = [Math.floor(shown / 3600), Math.floor(shown / 60) % 60, shown % 60];
  const time = hms[0] ? `${hms[0]}:${String(hms[1]).padStart(2, "0")}:${String(hms[2]).padStart(2, "0")}` : `${hms[1]}:${String(hms[2]).padStart(2, "0")}`;
  // A hidden timer can be peeked at, and hidden again, with the button beside it.
  const [peek, setPeek] = useState(false);
  const clock = prefs.hideTimer && !low && !peek ? "Hidden" : `${expired ? "+" : ""}${time}`;
  // The browser tab shows the clock too, so it can be watched from another tab (not while it is hidden).
  useEffect(() => {
    if (left === null) return;
    const before = document.title;
    if (clock !== "Hidden") document.title = `${clock} · ${title}`;
    return () => { document.title = before; };
  }, [clock, left, title]);

  return (
    <>
      <header className="test-bar">
        <h1 className="title">{title}</h1>
        <span className="muted">{subtitle}</span>
        <span className="spacer" />
        <span className="muted">{expired ? "Over time" : low ? "Under 5 minutes left" : "Time left"}</span>
        <span className={`timer${low ? " low" : ""}`} role="timer">{clock}</span>
        {/* a timer is not read out as it ticks, so the two moments that matter are announced */}
        {prefs.hideTimer && !low && <button type="button" className="btn" aria-pressed={peek} onClick={() => setPeek(!peek)}>{peek ? "Hide time" : "Show time"}</button>}
        <span className="sr-only" aria-live="assertive">{expired ? "Time is up." : low ? "Five minutes left." : ""}</span>
        <Highlighter />
        <ThemeToggle />
        {/* the clock runs from when the section started, so leaving does not stop it; the button says so */}
        <Link className="btn" href="/practice" title="Your answers are saved. The clock keeps running while you are away.">Save and exit</Link>
      </header>
      <div className={`reader${q.passage === null ? " single" : ""}`}>
        {q.passage !== null && (
          // keyed by passage, so a new passage starts at its top rather than where the last one was scrolled to
          <article key={q.passage} className="passage">
            <div><span className="tag">Passage {q.passage + 1} of {passages.length}</span></div>
            <PassageText text={passages[q.passage]} />
          </article>
        )}
        <div className="question" ref={card}>
          <div className="meta"><span className="muted">Question {index + 1} of {questions.length}</span>{flagged.includes(q.id) && <span className="tag accent">Flagged</span>}</div>
          <div className="progress" role="img" aria-label={`${questions.length - blank.length} of ${questions.length} answered`} title={`${questions.length - blank.length} of ${questions.length} answered`}>
            <span style={{ width: `${Math.round((100 * (questions.length - blank.length)) / questions.length)}%` }} />
          </div>
          {q.stimulus && <p>{typeset(q.stimulus)}</p>}
          <h3>{typeset(q.prompt)}</h3>
          <Choices options={q.options} selected={answers[q.id] ?? null} eliminated={eliminated[q.id] ?? []} onSelect={select} onEliminate={eliminate} />
          <p className="muted keys-hint"><kbd>A</kbd>–<kbd>E</kbd> answer · <kbd>←</kbd> <kbd>→</kbd> previous and next · <kbd>F</kbd> flag · <kbd>Shift</kbd>+letter or <kbd>✕</kbd> crosses a choice out · <kbd>?</kbd> all shortcuts</p>
          <ShortcutsHelp keys={[["A–E or 1–5", "Answer"], ["Shift+A–E", "Cross out a choice, or bring it back"], ["← →", "Previous and next question"], ["F", "Flag or unflag for review"]]} />
          <div className="actions spread">
            <button className="btn" onClick={flag} aria-pressed={flagged.includes(q.id)} aria-keyshortcuts="F">
              {flagged.includes(q.id) ? "Remove flag" : "Flag for review"}
            </button>
            <div className="actions">
              <button className="btn" disabled={index === 0} onClick={() => setIndex(index - 1)} aria-keyshortcuts="ArrowLeft">Previous</button>
              {index < questions.length - 1 ? (
                <button className="btn primary" onClick={() => setIndex(index + 1)} aria-keyshortcuts="ArrowRight">Next question</button>
              ) : (
                <button className="btn primary" disabled={pending || saving} onClick={askFinish}>Finish section</button>
              )}
            </div>
          </div>
        </div>
      </div>
      <nav className="qnav" aria-label="Questions in this section">
        <div className="qnav-items" ref={items}>
          {questions.map((item, i) => {
            const state = [i === index && "current", flagged.includes(item.id) && "flagged", answers[item.id] && "done"].filter(Boolean).join(" ");
            const label = `Question ${i + 1}${answers[item.id] ? `, answered ${answers[item.id]}` : ", unanswered"}${flagged.includes(item.id) ? ", flagged" : ""}`;
            // In Reading Comprehension each passage's questions form a group, labeled P1, P2 and so on.
            const opens = item.passage !== null && item.passage !== questions[i - 1]?.passage;
            return (
              <Fragment key={item.id}>
                {opens && <span className="qnav-group" aria-hidden="true">P{item.passage! + 1}</span>}
                <a href="#" className={state || undefined} aria-label={label} title={label} aria-current={i === index ? "true" : undefined} onClick={(e) => { e.preventDefault(); setIndex(i); }}>{i + 1}</a>
              </Fragment>
            );
          })}
        </div>
        <span className="spacer" />
        <span className="muted" aria-live="polite">
          {questions.length - blank.length} of {questions.length} answered{unsure.length ? `, ${unsure.length} flagged` : ""}
          {Object.keys(answers).length > 0 && (saving ? " · Saving…" : failed ? ` · ${failed} not saved` : " · Answers saved")}
        </span>
        {failed > 0 && !saving && <button className="btn" onClick={retry}>Try saving again</button>}
        <button className="btn primary" disabled={pending || saving} onClick={askFinish}>Finish section</button>
      </nav>
      <dialog ref={check} className="modal" aria-labelledby="finish-check-title">
        <h2 id="finish-check-title">Finish this section?</h2>
        {blank.length || unsure.length ? (
          <p>
            {[blank.length && `${blank.length} ${blank.length === 1 ? "question is" : "questions are"} unanswered`,
              unsure.length && `${unsure.length} flagged for review`].filter(Boolean).join(" and ")}.
            Unanswered questions count as wrong.
          </p>
        ) : <p>All {questions.length} questions are answered. Once you finish, your answers can&rsquo;t be changed.</p>}
        <div className="actions">
          <button className="btn primary" disabled={pending || saving} onClick={finish}>{blank.length || unsure.length ? "Finish anyway" : "Finish section"}</button>
          {blank.length > 0 && <button className="btn" onClick={() => goTo(blank[0].id)}>Go to question {questions.indexOf(blank[0]) + 1}</button>}
          {unsure.length > 0 && <button className="btn" onClick={() => goTo(unsure[0].id)}>Go to flagged question {questions.indexOf(unsure[0]) + 1}</button>}
          <button className="btn" onClick={() => check.current?.close()}>Keep working</button>
        </div>
      </dialog>
      {/* Escape would dismiss it without a choice, so it is ignored. */}
      <dialog ref={timeUp} className="modal" aria-labelledby="time-up-title" onCancel={(e) => e.preventDefault()}>
        <h2 id="time-up-title">Time is up</h2>
        <p>The {Math.floor(limit / 60)}{limit % 60 ? "\u00bd" : ""} minutes for this section have run out. You can finish now, or keep going: the clock will count up and your results will show the total time.</p>
        <div className="actions">
          <button className="btn primary" disabled={pending || saving} onClick={finish}>Finish section</button>
          <button className="btn" disabled={pending || saving} onClick={keepGoing}>Keep going</button>
        </div>
      </dialog>
    </>
  );
}
