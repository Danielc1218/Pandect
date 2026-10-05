"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireUser } from "./supabase";

/** Records a drill answer. The database grades it; the correct letter is only returned afterwards. */
export async function answer(questionId: string, chosen: string) {
  const { db } = await requireUser();
  const { data, error } = await db.from("attempts").insert({ question_id: questionId, chosen }).select("correct").single();
  if (error) throw new Error(error.message);
  const { data: question } = await db.from("questions").select("correct_answer").eq("id", questionId).single();
  return { correct: data.correct as boolean, correctAnswer: question!.correct_answer as string };
}

export async function startSection(form: FormData) {
  const { db } = await requireUser();
  const { data, error } = await db
    .from("test_sessions")
    .insert({ test_id: String(form.get("test_id")), section_number: Number(form.get("section_number")) })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  redirect(`/section/${data.id}`);
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
  const name = String(form.get("display_name") ?? "").trim();
  if (!name) return { error: "Enter a display name." };
  const { error } = await db
    .from("profiles")
    .update({
      display_name: name,
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
