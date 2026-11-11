"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { logInWith, signUpWith, type AuthState } from "./authCore";
import { supabase } from "./supabase";

export type { AuthState } from "./authCore";

const fields = (form: FormData) => (name: string) => String(form.get(name) ?? "");

export async function signUp(_: AuthState, form: FormData): Promise<AuthState> {
  const h = await headers();
  const origin = h.get("origin") ?? `https://${h.get("host")}`;
  const result = await signUpWith(await supabase(), fields(form), origin);
  if ("redirect" in result) redirect(result.redirect);
  return result;
}

export async function logIn(_: AuthState, form: FormData): Promise<AuthState> {
  const result = await logInWith(await supabase(), fields(form));
  if ("redirect" in result) redirect(result.redirect);
  return result;
}

export async function logOut() {
  const db = await supabase();
  await db.auth.signOut();
  redirect("/");
}
