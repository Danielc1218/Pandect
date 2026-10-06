import type { SupabaseClient } from "@supabase/supabase-js";
import { BANK_NAME, typeCounts } from "./bank";

export const SECTIONS = { lr: "Logical Reasoning", rc: "Reading Comprehension" } as const;
export type SectionKey = keyof typeof SECTIONS;
export const sectionKey = (name: string): SectionKey => (name === SECTIONS.rc ? "rc" : "lr");
export const drillHref = (section: string, type: string) => `/drill?section=${sectionKey(section)}&type=${encodeURIComponent(type)}`;
export const pct = (part: number, whole: number) => (whole ? Math.round((100 * part) / whole) : 0);
export const testNumber = (id: string) => Number(id.replace(/\D/g, "")) || 0;

export type TypeStat = { section_type: string; question_type: string; total: number; answered: number; correct: number };

/** Every question type with its size and the signed-in user's record on it, most common first. */
export async function typeStats(db: SupabaseClient): Promise<TypeStat[]> {
  const [totals, { data: mine }] = await Promise.all([typeCounts(), db.from("my_bank_type_stats").select("*").eq("bank", BANK_NAME)]);
  const record = new Map((mine ?? []).map((m) => [m.section_type + "|" + m.question_type, m]));
  return totals
    .map((t) => {
      const m = record.get(t.section_type + "|" + t.question_type);
      return { ...t, answered: m?.answered ?? 0, correct: m?.correct ?? 0 };
    })
    .sort((a, b) => b.total - a.total);
}

const DAY = 86_400_000;
const dayOf = (iso: string) => Math.floor(new Date(iso).getTime() / DAY);

export const daysUntil = (date: string) => Math.ceil((new Date(date).getTime() - Date.now()) / DAY);

/** Headline numbers for the dashboard and progress pages. */
export async function activity(db: SupabaseClient) {
  // Reads the latest 1,000 attempts and counts in JS; move to a SQL view when users pass that.
  const [{ count }, { data }] = await Promise.all([
    db.from("attempts").select("id", { count: "exact", head: true }),
    db.from("attempts").select("correct, created_at, questions(section_type, question_type)").order("created_at", { ascending: false }).limit(1000),
  ]);
  const rows = data ?? [];
  const last100 = rows.slice(0, 100);
  const today = Math.floor(Date.now() / DAY);
  const days = new Set(rows.map((r) => dayOf(r.created_at)));
  let streak = 0;
  for (let d = days.has(today) ? today : today - 1; days.has(d); d--) streak++;
  const latest = rows[0]?.questions as unknown as { section_type: string; question_type: string } | undefined;
  return {
    answered: count ?? 0,
    accuracy: pct(last100.filter((r) => r.correct).length, last100.length),
    week: rows.filter((r) => dayOf(r.created_at) > today - 7).length,
    streak,
    latest,
  };
}
