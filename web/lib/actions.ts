"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { questionAnswer } from "./answerKey";
import { admin, allSections, BANK_NAME } from "./bank";
import { canStartSection } from "./practiceTests";
import { changed, sanitize } from "./prefs";
import { requireUser } from "./supabase";

/** Records a drill answer. The server grades it with the secret key; the correct letter is only returned afterwards. */
export async function answer(questionId: string, chosen: string) {
  const { user } = await requireUser();
  // Only questions in the bank this deployment serves can be answered or have their answer revealed.
  const key = await questionAnswer(questionId);
  if (!key) throw new Error("That question is not available.");
  const correct = chosen === key.correct_answer;
  const { error } = await admin().from("attempts").insert({ user_id: user.id, question_id: questionId, chosen, correct });
  if (error) throw new Error(error.message);
  return { correct, correctAnswer: key.correct_answer, explanation: key.explanation };
}

export async function startSection(form: FormData) {
  const { db } = await requireUser();
  const testId = String(form.get("test_id"));
  const sectionNumber = Number(form.get("section_number"));
  // Only a section of this bank with published questions, and in the generated bank only from a complete test.
  if (!canStartSection(await allSections(), BANK_NAME, testId, sectionNumber)) throw new Error("That section is not available.");
  const { data, error } = await db
    .from("test_sessions")
    .insert({ test_id: testId, section_number: sectionNumber })
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
  const { db, user } = await requireUser();
  // The user's own client only sees their own sessions and the questions listed for them.
  const [{ data: session }, { data: listed }] = await Promise.all([
    db.from("test_sessions").select("id").eq("id", sessionId).is("finished_at", null).maybeSingle(),
    db.from("session_questions").select("question_id").eq("session_id", sessionId).eq("question_id", questionId).maybeSingle(),
  ]);
  if (!session || !listed) throw new Error("That question is not part of this section.");
  const key = await questionAnswer(questionId);
  if (!key) throw new Error("That question is not available.");
  const { error } = await admin().from("attempts").upsert(
    { user_id: user.id, session_id: sessionId, question_id: questionId, chosen, correct: chosen === key.correct_answer },
    { onConflict: "session_id,question_id" });
  if (error) throw new Error(error.message);
}

/** Save and exit: stops a timed section's clock until it is opened again (resumeSection). */
export async function pauseSection(sessionId: string) {
  const { db } = await requireUser();
  await db.from("test_sessions").update({ paused_at: new Date().toISOString() }).eq("id", sessionId).is("finished_at", null).is("paused_at", null);
}

/** Opening a paused section starts its clock again, adding the time away to paused_seconds. */
export async function resumeSection(sessionId: string) {
  const { db } = await requireUser();
  const { data } = await db.from("test_sessions").select("paused_at, paused_seconds").eq("id", sessionId).is("finished_at", null).maybeSingle();
  if (!data?.paused_at) return;
  const away = Math.max(0, Math.round((Date.now() - new Date(data.paused_at).getTime()) / 1000));
  // matching paused_at keeps a second call (development runs effects twice) from counting the time twice
  await db.from("test_sessions").update({ paused_at: null, paused_seconds: data.paused_seconds + away }).eq("id", sessionId).eq("paused_at", data.paused_at);
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
