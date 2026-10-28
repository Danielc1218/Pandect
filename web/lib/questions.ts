/** The question list of one drill type: each question's status, searching, and which one comes next. */

/** A question with no status has not been answered yet. */
export type Status = "missed" | "solved";
export type Show = "all" | "new" | Status;
/**
 * `n` is the question's place in the whole list, so numbers stay put while the list is filtered.
 * `text` is the full stimulus and prompt, searched but never shown; older type-list files lack it, so search falls back to `snippet`.
 */
export type QuestionRow = { id: string; n: number; source: string; snippet: string; passage?: string; text?: string };

/** Each answered question's status from its newest attempt; `attempts` must be newest first. */
export function latestStatus(attempts: { question_id: string; correct: boolean }[]) {
  const status: Record<string, Status> = {};
  for (const a of attempts) status[a.question_id] ??= a.correct ? "solved" : "missed";
  return status;
}

/** The first unanswered question after `current`, wrapping round to the start; undefined when none is left. */
export function nextUnanswered(ids: string[], status: Record<string, Status>, current?: string) {
  const at = current ? ids.indexOf(current) : -1;
  return [...ids.slice(at + 1), ...ids.slice(0, Math.max(at, 0))].find((id) => !status[id]);
}

/** Text as search compares it: lowercase, no accents, apostrophes kept only inside words, any other punctuation (dashes, commas, quotes) a space. */
const searchable = (text: string) =>
  text.toLowerCase().normalize("NFKD").replace(/\p{M}/gu, "").replace(/[‘’‛′]/g, "'")
    .replace(/(?<![\p{L}\p{N}])'|'(?![\p{L}\p{N}])/gu, " ").replace(/[^\p{L}\p{N}']+/gu, " ");

/** Rows with the chosen status whose text, passage opening or source contains every word of the search. */
export function filterRows(rows: QuestionRow[], status: Record<string, Status>, query: string, show: Show) {
  const words = searchable(query).split(" ").filter(Boolean);
  return rows.filter((r) => {
    if (show !== "all" && (status[r.id] ?? "new") !== show) return false;
    const text = searchable(`${r.text ?? r.snippet} ${r.passage ?? ""} ${r.source}`);
    return words.every((w) => text.includes(w));
  });
}

/** The opening words of a question, for its row in the list. */
export function snippet(text: string, max = 140) {
  const flat = text.replace(/\s+/g, " ").trim();
  return flat.length <= max ? flat : flat.slice(0, max).replace(/\s+\S*$/, "") + "…";
}
