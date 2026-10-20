"use server";

import { redirect } from "next/navigation";
import { supabase } from "./supabase";

export type AuthState = { error?: string; notice?: string; email?: string; name?: string; target?: number };

export async function signUp(_: AuthState, form: FormData): Promise<AuthState> {
  const name = String(form.get("name") ?? "").trim();
  const email = String(form.get("email") ?? "").trim();
  const password = String(form.get("password") ?? "");
  const target = Number(form.get("target"));
  const testDate = String(form.get("test_date") ?? "") || null;
  if (!Number.isInteger(target) || target < 120 || target > 180) return { error: "Enter a target score from 120 to 180.", email, name };
  if (!name) return { error: "Enter your name.", email, name, target };
  if (password.length < 12) return { error: "Use a password of at least 12 characters.", email, name, target };

  const db = await supabase();
  const { data, error } = await db.auth.signUp({ email, password, options: { data: { display_name: name } } });
  if (error) return { error: error.message, email, name, target };
  if (!data.session) return { notice: "Check your email to confirm your account, then log in.", email, name, target };
  await db.from("profiles").update({ target_score: target, test_date: testDate }).eq("id", data.user!.id);
  redirect("/learn");
}

export async function logIn(_: AuthState, form: FormData): Promise<AuthState> {
  const email = String(form.get("email") ?? "").trim();
  const db = await supabase();
  const { error } = await db.auth.signInWithPassword({ email, password: String(form.get("password") ?? "") });
  if (error) return { error: "That email and password do not match an account.", email };
  // Only a path on this site: "//host" or a full URL would send the visitor elsewhere.
  const next = String(form.get("next") ?? "");
  redirect(next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/\\") ? next : "/learn");
}

export async function logOut() {
  const db = await supabase();
  await db.auth.signOut();
  redirect("/");
}
