"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { answer } from "@/lib/actions";
import { Choices } from "./Choices";

export type DrillQuestion = { id: string; stimulus: string | null; prompt: string; options: Record<string, string>; source: string };

export function Drill({ question, type, answered, total }: { question: DrillQuestion; type: string; answered: number; total: number }) {
  const router = useRouter();
  const [selected, setSelected] = useState<string | null>(null);
  const [eliminated, setEliminated] = useState<string[]>([]);
  const [result, setResult] = useState<{ correct: boolean; correctAnswer: string; explanation: string | null } | null>(null);
  const [pending, start] = useTransition();
  const toggle = (letter: string) => {
    setEliminated((list) => (list.includes(letter) ? list.filter((l) => l !== letter) : [...list, letter]));
    setSelected((s) => (s === letter ? null : s));
  };
  return (
    <div className="question" aria-busy={pending}>
      <div className="meta"><span className="tag">{type}</span><span className="muted">Question {answered + 1} of {total} · {question.source}</span></div>
      <div className="progress"><span style={{ width: `${Math.round((100 * (answered + (result ? 1 : 0))) / total)}%` }} /></div>
      {question.stimulus && <p>{question.stimulus}</p>}
      <h3>{question.prompt}</h3>
      <Choices
        options={question.options} selected={selected} eliminated={eliminated} result={result}
        onSelect={(l) => { setSelected(l); setEliminated((list) => list.filter((x) => x !== l)); }}
        onEliminate={toggle}
      />
      {result && <div className="explain" role="status"><strong>{result.correct ? "Correct." : `Not quite. The answer is ${result.correctAnswer}.`}</strong>{result.explanation && <p>{result.explanation}</p>}</div>}
      <div className="actions spread">
        <Link className="btn" href="/types">Back to question types</Link>
        {result ? (
          <button className="btn primary" disabled={pending} onClick={() => start(() => router.refresh())}>Next question</button>
        ) : (
          <button className="btn primary" disabled={!selected || pending} onClick={() => start(async () => setResult(await answer(question.id, selected!)))}>Submit answer</button>
        )}
      </div>
    </div>
  );
}
