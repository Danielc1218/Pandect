"use client";

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
            onKeyDown={(e) => { if (!result && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); onSelect?.(letter); } }}
            onContextMenu={(e) => { e.preventDefault(); if (!result) onEliminate?.(letter); }}
          >
            <span className="letter">{letter}</span>
            <span>{options[letter]}</span>
            {result && letter === result.correctAnswer && <span className="note">Correct answer</span>}
            {result && letter === selected && letter !== result.correctAnswer && <span className="note">Your answer</span>}
          </div>
        );
      })}
    </div>
  );
}
