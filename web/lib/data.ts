import type { SupabaseClient } from "@supabase/supabase-js";

export const SECTIONS = { lr: "Logical Reasoning", rc: "Reading Comprehension" } as const;
export type SectionKey = keyof typeof SECTIONS;
export const sectionKey = (name: string): SectionKey => (name === SECTIONS.rc ? "rc" : "lr");
export const drillHref = (section: string, type: string) => `/drill?section=${sectionKey(section)}&type=${encodeURIComponent(type)}`;
export const pct = (part: number, whole: number) => (whole ? Math.round((100 * part) / whole) : 0);
/** The class that colors an accuracy bar: green from 70%, yellow from 50%, red below. */
export const grade = (percent: number) => (percent >= 70 ? "good" : percent >= 50 ? "fair" : "poor");
export const testNumber = (id: string) => Number(id.replace(/\D/g, "")) || 0;

const DAY = 86_400_000;
const dayOf = (iso: string) => Math.floor(new Date(iso).getTime() / DAY);

/** "October 19", with the year added when it is not this year's. */
export const formatDay = (iso: string) => {
  const date = new Date(iso);
  return date.toLocaleDateString("en-US", { month: "long", day: "numeric", year: date.getFullYear() === new Date().getFullYear() ? undefined : "numeric" });
};

export const daysUntil = (date: string) => Math.ceil((new Date(date).getTime() - Date.now()) / DAY);

/** Headline numbers for the dashboard and progress pages. */
export async function activity(db: SupabaseClient) {
  // Reads the latest 1,000 attempts and counts in JS; move to a SQL view when users pass that.
  const [{ count }, { data }] = await Promise.all([
    db.from("attempts").select("id", { count: "exact", head: true }),
    db.from("attempts").select("correct, created_at, session_id, questions(section_type, question_type)").order("created_at", { ascending: false }).limit(1000),
  ]);
  const rows = data ?? [];
  const last100 = rows.slice(0, 100);
  const today = Math.floor(Date.now() / DAY);
  const days = new Set(rows.map((r) => dayOf(r.created_at)));
  const perDay: Record<number, number> = {};
  for (const r of rows) perDay[dayOf(r.created_at)] = (perDay[dayOf(r.created_at)] ?? 0) + 1;
  let streak = 0;
  for (let d = days.has(today) ? today : today - 1; days.has(d); d--) streak++;
  // The longest run of days in a row with an answer, within the same latest answers.
  let best = 0;
  for (const d of days) if (!days.has(d - 1)) { let n = 1; while (days.has(d + n)) n++; best = Math.max(best, n); }
  // The last question answered in a drill (not in a timed section), and when: where a driller left off.
  const drill = rows.find((r) => !r.session_id);
  const latest = drill?.questions as unknown as { section_type: string; question_type: string } | undefined;
  return {
    answered: count ?? 0,
    accuracy: pct(last100.filter((r) => r.correct).length, last100.length),
    week: rows.filter((r) => dayOf(r.created_at) > today - 7).length,
    streak,
    best,
    /** Questions answered on each day (days since 1970, UTC), from the same latest 1,000 answers; and today. */
    perDay,
    today,
    latest,
    latestAt: drill?.created_at as string | undefined,
    /** When the user last answered in each timed section, by session id. */
    sessionAt: Object.fromEntries(rows.filter((r) => r.session_id).reverse().map((r) => [r.session_id as string, r.created_at as string])) as Record<string, string>,
  };
}
