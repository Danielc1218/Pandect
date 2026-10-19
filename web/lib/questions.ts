/** The question list of one drill type: each question's status, searching, and which one comes next. */

/** A question with no status has not been answered yet. */
export type Status = "missed" | "solved";
export type Show = "all" | "new" | Status;
/** `n` is the question's place in the whole list, so numbers stay put while the list is filtered. */
export type QuestionRow = { id: string; n: number; source: string; snippet: string; passage?: string };

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

/** Rows with the chosen status whose text, passage opening or source contains every word of the search. */
export function filterRows(rows: QuestionRow[], status: Record<string, Status>, query: string, show: Show) {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  return rows.filter((r) => {
    if (show !== "all" && (status[r.id] ?? "new") !== show) return false;
    const text = `${r.snippet} ${r.passage ?? ""} ${r.source}`.toLowerCase();
    return words.every((w) => text.includes(w));
  });
}

/** The opening words of a question, for its row in the list. */
export function snippet(text: string, max = 140) {
  const flat = text.replace(/\s+/g, " ").trim();
  return flat.length <= max ? flat : flat.slice(0, max).replace(/\s+\S*$/, "") + "…";
}
