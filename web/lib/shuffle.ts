const LETTERS = ["A", "B", "C", "D", "E"];

/** Original choice letters, in the order their text should be shown. */
export function choiceOrder(options: Record<string, string>, seed: string, bank: "generated" | "other"): string[] {
  const order = LETTERS.filter((letter) => options[letter]);
  if (bank !== "generated") return order;
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i++) hash = Math.imul(hash ^ seed.charCodeAt(i), 16777619);
  const random = () => {
    hash += 0x6D2B79F5;
    let n = hash;
    n = Math.imul(n ^ (n >>> 15), n | 1);
    n ^= n + Math.imul(n ^ (n >>> 7), n | 61);
    return ((n ^ (n >>> 14)) >>> 0) / 4294967296;
  };
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
}

const naturalOrder = (order: string[]) => order.every((letter, i) => i === 0 || order[i - 1] < letter);
export const shownLetter = (order: string[], original: string) => naturalOrder(order) ? original : LETTERS[order.indexOf(original)] ?? original;
export const originalLetter = (order: string[], shown: string) => naturalOrder(order) ? shown : order[LETTERS.indexOf(shown)] ?? shown;

const CHOICE_PREDICATE = /^(?:is|was|were|are|has|had|does|did|would|will|could|can|cannot|must|may|might|says|suggests|offers|extends|explains|supports|fails|allows|shows|and|or|but|only|also|doesn['’]t)$/i;

/** Change only references to answer choices; keep articles, passage names and logic symbols as written. */
export function relabel(text: string, order: string[]): string {
  const namedLetters = /\bpassages?\s+[A-E]\b|\b(?:all|most|some|no)\s+[A-E]\s+(?:are|is)\b/i.test(text);
  const mapped = text.replace(/(?<![A-Za-z0-9])([A-E])(?![A-Za-z0-9])/g, (token, original: string, at: number) => {
    const before = text.slice(0, at), after = text.slice(at + token.length);
    const previous = /([A-Za-z]+)\s*$/.exec(before)?.[1]?.toLowerCase();
    const parenthesized = /\(\s*$/.test(before) && /^\s*\)/.test(after);
    if (!parenthesized && namedLetters && !["choice", "answer", "option"].includes(previous ?? "")) return token;
    if (original === "A" && !parenthesized && !["choice", "answer", "option"].includes(previous ?? "")) {
      const next = /^\s+([a-z]+(?:['’]t)?)/.exec(after)?.[1];
      if (next && !CHOICE_PREDICATE.test(next)) return token;
    }
    return shownLetter(order, original);
  });
  const paragraphs = mapped.split("\n\n");
  return paragraphs.every((paragraph) => /^\([A-E]\)/.test(paragraph))
    ? paragraphs.sort((a, b) => a[1].localeCompare(b[1])).join("\n\n")
    : mapped;
}
