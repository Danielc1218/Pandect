import { typeset } from "@/lib/text";

/**
 * A passage's paragraphs. A comparative pair is shown with "Passage A" and "Passage B" headings: some sets put
 * those words on lines of their own, others only a "---" line between the two passages.
 */
export function PassageText({ text }: { text: string }) {
  const paras = text.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  const shown = paras.includes("---") ? ["Passage A", ...paras.map((p) => (p === "---" ? "Passage B" : p))] : paras;
  return shown.map((p, i) => (/^Passage [AB]$/.test(p) ? <h4 key={i} className="passage-label">{p}</h4> : <p key={i}>{typeset(p)}</p>));
}
