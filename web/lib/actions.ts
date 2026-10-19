"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { allTests, BANK_NAME } from "./bank";
import { changed, sanitize } from "./prefs";
import { requireUser } from "./supabase";

/** Records a drill answer. The database grades it; the correct letter is only returned afterwards. */
export async function answer(questionId: string, chosen: string) {
  const { db } = await requireUser();
  // Only questions in the bank this deployment serves can be answered or have their answer revealed.
  const { data: question } = await db.from("questions").select("correct_answer, explanation, tests!inner(bank)").eq("id", questionId).eq("tests.bank", BANK_NAME).maybeSingle();
  if (!question) throw new Error("That question is not available.");
  const { data, error } = await db.from("attempts").insert({ question_id: questionId, chosen }).select("correct").single();
  if (error) throw new Error(error.message);
  return { correct: data.correct as boolean, correctAnswer: question.correct_answer as string, explanation: question.explanation as string | null };
}

export async function startSection(form: FormData) {
  const { db } = await requireUser();
  const testId = String(form.get("test_id"));
  if (!(await allTests()).some((t) => t.id === testId)) throw new Error("That test is not available.");
  const { data, error } = await db
    .from("test_sessions")
    .insert({ test_id: testId, section_number: Number(form.get("section_number")) })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  redirect(`/section/${data.id}`);
}

/** A timed random section from this deployment's bank, unanswered questions first: 25 Logical Reasoning
 * questions, or four whole Reading Comprehension passages (the database builds those like a real section). */
export async function startRandomSection(form: FormData) {
  const { db } = await requireUser();
  const section = form.get("section_type") === "Reading Comprehension" ? "Reading Comprehension" : "Logical Reasoning";
  const { data, error } = await db.rpc("start_random_section", { p_bank: BANK_NAME, p_section_type: section, p_size: 25 });
  if (error) throw new Error(error.message);
  redirect(`/section/${data}`);
}

/** Saves or changes one answer in a timed section. */
export async function saveAnswer(sessionId: string, questionId: string, chosen: string) {
  const { db } = await requireUser();
  const { error } = await db.from("attempts").upsert({ session_id: sessionId, question_id: questionId, chosen }, { onConflict: "session_id,question_id" });
  if (error) throw new Error(error.message);
}

export async function finishSection(sessionId: string) {
  const { db } = await requireUser();
  await db.from("test_sessions").update({ finished_at: new Date().toISOString() }).eq("id", sessionId).is("finished_at", null);
  redirect(`/results/${sessionId}`);
}

export type SettingsState = { saved?: boolean; error?: string };

export async function saveSettings(_: SettingsState, form: FormData): Promise<SettingsState> {
  const { db, user } = await requireUser();
  const number = (key: string) => (form.get(key) ? Number(form.get(key)) : null);
  const { error } = await db
    .from("profiles")
    .update({
      target_score: number("target_score"),
      curr_score: number("curr_score"),
      test_date: String(form.get("test_date") ?? "") || null,
      weekly_goal: number("weekly_goal") ?? 60,
    })
    .eq("id", user.id);
  if (error) return { error: "Scores must be between 120 and 180." };
  revalidatePath("/", "layout");
  return { saved: true };
}

export async function saveProfile(_: SettingsState, form: FormData): Promise<SettingsState> {
  const { db, user } = await requireUser();
  const name = String(form.get("display_name") ?? "").trim();
  if (!name) return { error: "Enter a display name." };
  const { error } = await db.from("profiles").update({ display_name: name }).eq("id", user.id);
  if (error) return { error: error.message };
  revalidatePath("/", "layout");
  return { saved: true };
}

/** Saves display preferences to the account; they are already applied on this device (lib/prefs.ts). */
export async function savePreferences(prefs: unknown) {
  const { db, user } = await requireUser();
  const { error } = await db.from("profiles").update({ preferences: changed(sanitize(prefs)) }).eq("id", user.id);
  if (error) throw new Error(error.message);
}
