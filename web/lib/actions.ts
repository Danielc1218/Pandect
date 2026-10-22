"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { questionAnswer } from "./answerKey";
import { admin } from "./bank";
import { op } from "./run";
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
  redirect(`/section/${await op("startSection", String(form.get("test_id")), Number(form.get("section_number")))}`);
}

export async function startRandomSection(form: FormData) {
  redirect(`/section/${await op("startRandomSection", form.get("section_type"))}`);
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
  await op("pauseSection", sessionId);
}

/** Opening a paused section starts its clock again, adding the time away to paused_seconds. */
export async function resumeSection(sessionId: string) {
  await op("resumeSection", sessionId);
}

export async function finishSection(sessionId: string) {
  await op("finishSection", sessionId);
  redirect(`/results/${sessionId}`);
}

export type SettingsState = { saved?: boolean; error?: string };

/** What a settings form's error message, or its absence, means to the form; the layout re-reads the profile. */
function settled(error: string | null): SettingsState {
  if (error) return { error };
  revalidatePath("/", "layout");
  return { saved: true };
}

export async function saveSettings(_: SettingsState, form: FormData): Promise<SettingsState> {
  return settled(await op("saveSettings", Object.fromEntries(["target_score", "curr_score", "test_date", "weekly_goal"].map((k) => [k, form.get(k)]))));
}

export async function saveProfile(_: SettingsState, form: FormData): Promise<SettingsState> {
  return settled(await op("saveProfile", form.get("display_name")));
}

/** Saves display preferences to the account; they are already applied on this device (lib/prefs.ts). */
export async function savePreferences(prefs: unknown, accountId?: string) {
  await op("savePreferences", prefs, accountId);
}
