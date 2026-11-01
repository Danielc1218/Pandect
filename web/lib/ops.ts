import type { SupabaseClient } from "@supabase/supabase-js";
import type { BankName } from "./bank";
import { practiceName } from "./cdn";
import { activity } from "./data";
import { canStartSection } from "./practiceTests";
import { changed, sanitize } from "./prefs";
import { latestStatus } from "./questions";
import { SESSION_FIELDS, type Session } from "./sessions";

/**
 * Everything a page reads from or writes to the database, by name. Next runs these on the server (lib/run.ts); the
 * Cloudflare site runs them in a Pages Function (cloudflare/functions/api/op/[name].ts), so its browser only ever
 * sees "/api/op/learn" and the figures that page shows, never a table or a query. Each one gets the user's own
 * client (row-level security still decides what it can see) and the question bank's index, and returns plain JSON.
 * Arguments come from the browser on Cloudflare, so each one coerces its own.
 */
export type Bank = {
  name: BankName;
  typeCounts: () => Promise<{ section_type: string; question_type: string; total: number }[]>;
  allTests: () => Promise<{ id: string; name: string; year: number | null }[]>;
  allSections: () => Promise<{ test_id: string; section_number: number; section_type: string; questions: number; passages: number }[]>;
};
export type Ctx = { db: SupabaseClient; user: { id: string; email?: string }; bank: Bank };

async function rows<T>(query: PromiseLike<{ data: T[] | null; error: unknown }>): Promise<T[]> {
  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

/** The bank's index read through a client: what the Cloudflare Function uses (Next has its cached lib/bank.ts). */
export const dbBank = (db: SupabaseClient, name: BankName): Bank => ({
  name,
  typeCounts: () => rows(db.from("bank_type_counts").select("section_type, question_type, total").eq("bank", name)),
  allTests: async () => (await rows<{ id: string; name: string; year: number | null }>(db.from("tests").select("id, name, year").eq("bank", name)))
    .map((test) => ({ ...test, name: practiceName(test.name) })),
  allSections: () => rows(db.from("bank_test_sections").select("test_id, section_number, section_type, questions, passages").eq("bank", name).order("section_number")),
});

export type TypeStat = { section_type: string; question_type: string; total: number; answered: number; correct: number };

/** Every question type with its size and the signed-in user's record on it, most common first. */
async function typeStats({ db, bank }: Ctx): Promise<TypeStat[]> {
  const [totals, mine] = await Promise.all([bank.typeCounts(), rows<TypeStat>(db.from("my_bank_type_stats").select("*").eq("bank", bank.name))]);
  const record = new Map(mine.map((m) => [m.section_type + "|" + m.question_type, m]));
  return totals
    .map((t) => {
      const m = record.get(t.section_type + "|" + t.question_type);
      return { ...t, answered: m?.answered ?? 0, correct: m?.correct ?? 0 };
    })
    .sort((a, b) => b.total - a.total);
}

const sessions = (ctx: Ctx) => ctx.db.from("test_sessions").select(SESSION_FIELDS).eq("bank", ctx.bank.name);
const one = async (ctx: Ctx, id: unknown) => (await ctx.db.from("test_sessions").select(SESSION_FIELDS).eq("id", String(id)).maybeSingle()).data as unknown as Session | null;
/** A timed session's questions in order, as ids; their wording is fetched separately (lib/wording.ts). */
const sessionRows = async (ctx: Ctx, id: unknown) =>
  rows<{ position: number; question_id: string }>(ctx.db.from("session_questions").select("position, question_id").eq("session_id", String(id)).order("position"));

export const ops = {
  // The bank's index, for pages that list tests and sections.
  typeCounts: (ctx: Ctx) => ctx.bank.typeCounts(),
  allTests: (ctx: Ctx) => ctx.bank.allTests(),
  allSections: (ctx: Ctx) => ctx.bank.allSections(),

  /** The account's display preferences. */
  prefs: async ({ db, user }: Ctx) => (await db.from("profiles").select("preferences").eq("id", user.id).maybeSingle()).data?.preferences ?? null,

  learn: async (ctx: Ctx) => {
    const [{ data: profile }, stats, types, latest] = await Promise.all([
      ctx.db.from("profiles").select("display_name, weekly_goal, test_date").eq("id", ctx.user.id).single(),
      activity(ctx.db),
      typeStats(ctx),
      sessions(ctx).order("started_at", { ascending: false }).limit(1),
    ]);
    return { profile, stats, types, session: (latest.data as unknown as Session[] | null)?.[0] ?? null };
  },

  progress: async (ctx: Ctx) => {
    const [stats, types, done] = await Promise.all([
      activity(ctx.db),
      typeStats(ctx),
      sessions(ctx).not("finished_at", "is", null).order("finished_at", { ascending: false }).limit(10),
    ]);
    return { stats, types, sessions: (done.data ?? []) as unknown as Session[] };
  },

  types: typeStats,

  /** Whether the user last got each question of one type right or wrong. */
  // Reads the user's newest 1,000 attempts at this type; move to a SQL view if anyone passes that.
  drillStatus: async ({ db }: Ctx, section: unknown, type: unknown) =>
    latestStatus(await rows(db.from("attempts").select("question_id, correct, questions!inner(id)").eq("questions.section_type", String(section))
      .eq("questions.question_type", String(type)).order("created_at", { ascending: false }).limit(1000))),

  profile: async ({ db, user }: Ctx) => {
    const { data } = await db.from("profiles").select("display_name, target_score, curr_score, test_date, weekly_goal").eq("id", user.id).single();
    return { profile: data!, email: user.email };
  },

  practice: async (ctx: Ctx) => {
    const [tests, sections, mine] = await Promise.all([
      ctx.bank.allTests(),
      ctx.bank.allSections(),
      rows<{ test_id: string | null; section_number: number | null; finished_at: string | null }>(ctx.db.from("test_sessions").select("test_id, section_number, finished_at")),
    ]);
    return { tests, sections, sessions: mine };
  },

  /** The latest sittings, newest first, for the generated bank's random sections and history. */
  recentSessions: async (ctx: Ctx) => (await rows(sessions(ctx).order("started_at", { ascending: false }).limit(50))) as unknown as Session[],

  practiceTest: async (ctx: Ctx, testId: unknown) => {
    const [tests, sections, mine] = await Promise.all([
      ctx.bank.allTests(),
      ctx.bank.allSections(),
      rows<{ id: string; section_number: number; started_at: string; finished_at: string | null; score_correct: number | null; score_total: number | null }>(
        ctx.db.from("test_sessions").select("id, section_number, started_at, finished_at, score_correct, score_total").eq("test_id", String(testId)).order("started_at", { ascending: false })),
    ]);
    return { test: tests.find((t) => t.id === testId) ?? null, sections: sections.filter((s) => s.test_id === testId), sessions: mine };
  },

  session: one,

  results: async (ctx: Ctx, id: unknown) => {
    const [session, questions, attempts, prefs, sections] = await Promise.all([
      one(ctx, id),
      sessionRows(ctx, id),
      rows<{ question_id: string; chosen: string | null; correct: boolean }>(ctx.db.from("attempts").select("question_id, chosen, correct").eq("session_id", String(id))),
      ops.prefs(ctx),
      ctx.bank.allSections(),
    ]);
    return { session, questions, attempts, preferences: prefs, sections };
  },

  section: async (ctx: Ctx, id: unknown) => {
    const [session, questions, choices] = await Promise.all([
      one(ctx, id),
      sessionRows(ctx, id),
      // attempts in a running section are hidden from the user's client; this function returns only the saved choices
      ctx.db.rpc("session_choices", { p_session: String(id) }),
    ]);
    const saved = Object.fromEntries(((choices.data ?? []) as { question_id: string; chosen: string }[]).map((a) => [a.question_id, a.chosen]));
    return { session, questions, saved };
  },

  /** Starts a fixed section; returns the new session's id. */
  startSection: async (ctx: Ctx, testId: unknown, sectionNumber: unknown) => {
    // Only a section of this bank with ready questions, from a complete test.
    if (!canStartSection(await ctx.bank.allSections(), String(testId), Number(sectionNumber))) throw new Error("That section is not available.");
    const { data, error } = await ctx.db.from("test_sessions").insert({ test_id: String(testId), section_number: Number(sectionNumber) }).select("id").single();
    if (error) throw new Error(error.message);
    return data.id as string;
  },

  /** A timed random section from the bank, unanswered questions first: 25 Logical Reasoning questions, or four whole
   * Reading Comprehension passages (the database builds those like a real section). Returns the session's id. */
  startRandomSection: async ({ db, bank }: Ctx, sectionType: unknown) => {
    const section = sectionType === "Reading Comprehension" ? "Reading Comprehension" : "Logical Reasoning";
    const { data, error } = await db.rpc("start_random_section", { p_bank: bank.name, p_section_type: section, p_size: 25 });
    if (error) throw new Error(error.message);
    return data as string;
  },

  /** Save and exit: stops a timed section's clock until it is opened again (resumeSection). */
  pauseSection: async ({ db }: Ctx, id: unknown) => {
    await db.from("test_sessions").update({ paused_at: new Date().toISOString() }).eq("id", String(id)).is("finished_at", null).is("paused_at", null);
  },

  /** Opening a paused section starts its clock again, adding the time away to paused_seconds. */
  resumeSection: async ({ db }: Ctx, id: unknown) => {
    const { data } = await db.from("test_sessions").select("paused_at, paused_seconds").eq("id", String(id)).is("finished_at", null).maybeSingle();
    if (!data?.paused_at) return;
    const away = Math.max(0, Math.round((Date.now() - new Date(data.paused_at).getTime()) / 1000));
    // matching paused_at keeps a second call (development runs effects twice) from counting the time twice
    await db.from("test_sessions").update({ paused_at: null, paused_seconds: data.paused_seconds + away }).eq("id", String(id)).eq("paused_at", data.paused_at);
  },

  finishSection: async ({ db }: Ctx, id: unknown) => {
    await db.from("test_sessions").update({ finished_at: new Date().toISOString() }).eq("id", String(id)).is("finished_at", null);
  },

  /** Scores, test date and weekly goal; null clears a field. Returns an error message, or null once saved. */
  saveSettings: async ({ db, user }: Ctx, fields: unknown) => {
    const f = (fields ?? {}) as Record<string, unknown>;
    const number = (key: string) => (f[key] === null || f[key] === undefined || f[key] === "" ? null : Number(f[key]));
    const { error } = await db.from("profiles").update({
      target_score: number("target_score"),
      curr_score: number("curr_score"),
      test_date: f.test_date ? String(f.test_date) : null,
      weekly_goal: number("weekly_goal") ?? 60,
    }).eq("id", user.id);
    return error ? "Scores must be between 120 and 180." : null;
  },

  /** Returns an error message, or null once saved. */
  saveProfile: async ({ db, user }: Ctx, displayName: unknown) => {
    const name = String(displayName ?? "").trim();
    if (!name) return "Enter a display name.";
    const { error } = await db.from("profiles").update({ display_name: name }).eq("id", user.id);
    return error ? error.message : null;
  },

  /** Saves display preferences to the account; they are already applied on this device (lib/prefs.ts). */
  savePreferences: async ({ db, user }: Ctx, prefs: unknown, accountId?: unknown) => {
    if (accountId && accountId !== user.id) throw new Error("Your account changed. Please reload your settings.");
    const { error } = await db.from("profiles").update({ preferences: changed(sanitize(prefs)) }).eq("id", user.id).select("preferences").single();
    if (error) throw new Error(error.message);
  },
};

export type Ops = typeof ops;
export type OpName = keyof Ops;
type Args<F> = F extends (ctx: Ctx, ...args: infer A) => unknown ? A : never;
/** Runs one operation as the signed-in user: lib/run.ts on Next, a call to the Pages Function on Cloudflare. */
export type Op = <K extends OpName>(name: K, ...args: Args<Ops[K]>) => Promise<Awaited<ReturnType<Ops[K]>>>;
