"use server";

import { redirect } from "next/navigation";
import { supabase } from "./supabase";

export type AuthState = { error?: string; email?: string; name?: string };

export async function signUp(_: AuthState, form: FormData): Promise<AuthState> {
  const name = String(form.get("name") ?? "").trim();
  const email = String(form.get("email") ?? "").trim();
  const password = String(form.get("password") ?? "");
  const target = Number(form.get("target")) || null;
  const testDate = String(form.get("test_date") ?? "") || null;
  if (!name) return { error: "Enter your name.", email, name };
  if (password.length < 12) return { error: "Use a password of at least 12 characters.", email, name };

  const db = await supabase();
  const { data, error } = await db.auth.signUp({ email, password, options: { data: { display_name: name } } });
  // The database refuses emails that are not on the invitation list (see the invite_only migration).
  // Its message ("Sign-ups are by invitation only") is shown as is.
  if (error) return { error: error.message, email, name };
  if (!data.session) return { error: "Check your email to confirm your account, then log in.", email, name };
  await db.from("profiles").update({ target_score: target, test_date: testDate }).eq("id", data.user!.id);
  redirect("/learn");
}

export async function logIn(_: AuthState, form: FormData): Promise<AuthState> {
  const email = String(form.get("email") ?? "").trim();
  const db = await supabase();
  const { error } = await db.auth.signInWithPassword({ email, password: String(form.get("password") ?? "") });
  if (error) return { error: "That email and password do not match an account.", email };
  redirect("/learn");
}

export async function logOut() {
  const db = await supabase();
  await db.auth.signOut();
  redirect("/");
}
