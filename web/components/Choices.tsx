"use client";

import { typeset } from "@/lib/text";

const LETTERS = ["A", "B", "C", "D", "E"];

/** The five answer rows. Click selects; right-click or the Cross out button eliminates. With a result and no handlers it is a read-only review. */
export function Choices({
  options, selected, eliminated = [], result, onSelect, onEliminate,
}: {
  options: Record<string, string>;
  selected: string | null;
  eliminated?: string[];
  result?: { correctAnswer: string } | null;
  onSelect?: (letter: string) => void;
  onEliminate?: (letter: string) => void;
}) {
  return (
    <div className="stack" role="radiogroup" aria-label="Answer choices">
      {LETTERS.filter((l) => options[l]).map((letter) => {
        const state = result
          ? letter === result.correctAnswer ? "correct" : letter === selected ? "incorrect" : ""
          : letter === selected ? "selected" : eliminated.includes(letter) ? "eliminated" : "";
        return (
          <div
            key={letter}
            className={`choice ${state}`}
            role="radio"
            aria-checked={letter === selected}
            tabIndex={result ? -1 : 0}
            onClick={() => !result && onSelect?.(letter)}
            onKeyDown={(e) => {
              if (!result && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); e.stopPropagation(); onSelect?.(letter); }
              // Arrow keys step between the choices, as in any group of radio buttons.
              const step = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[e.key];
              if (step) {
                e.preventDefault();
                const all = [...e.currentTarget.parentElement!.querySelectorAll<HTMLElement>(".choice")];
                all[(all.indexOf(e.currentTarget) + step + all.length) % all.length].focus();
              }
            }}
            onContextMenu={(e) => { e.preventDefault(); if (!result) onEliminate?.(letter); }}
          >
            <span className="letter">{letter}</span>
            <span>{typeset(options[letter])}</span>
            {result && letter === result.correctAnswer && <span className="note">Correct answer</span>}
            {result && letter === selected && letter !== result.correctAnswer && <span className="note">Your answer</span>}
            {!result && onEliminate && (
              <button type="button" className="cross" aria-label={`Cross out ${letter}`} aria-pressed={eliminated.includes(letter)} title="Cross out"
                onClick={(e) => { e.stopPropagation(); onEliminate(letter); }} onKeyDown={(e) => e.stopPropagation()}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
