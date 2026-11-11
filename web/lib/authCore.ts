import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Signing up and logging in, on a Supabase client that then holds the new session: lib/auth.ts's server actions on
 * Next, cloudflare/functions/api/auth/[action].ts on Cloudflare (which puts the session in httpOnly cookies).
 * `field` reads one submitted form field; `origin` is this site, where the confirmation email links back to. Each returns the form's next state, or where to go once signed in.
 */
export type AuthState = { error?: string; notice?: string; email?: string; name?: string; target?: number };
type Field = (name: string) => string;

export async function signUpWith(db: SupabaseClient, field: Field, origin: string): Promise<AuthState | { redirect: string }> {
  const name = field("name").trim();
  const email = field("email").trim();
  const password = field("password");
  const target = Number(field("target"));
  const testDate = field("test_date") || null;
  if (!Number.isInteger(target) || target < 120 || target > 180) return { error: "Enter a target score from 120 to 180.", email, name };
  if (!name) return { error: "Enter your name.", email, name, target };
  if (password.length < 12) return { error: "Use a password of at least 12 characters.", email, name, target };

  const { data, error } = await db.auth.signUp({ email, password, options: { data: { display_name: name }, emailRedirectTo: `${origin}/login` } });
  if (error) return { error: error.message, email, name, target };
  if (!data.session) return { notice: "Check your email to confirm your account, then log in.", email, name, target };
  await db.from("profiles").update({ target_score: target, test_date: testDate }).eq("id", data.user!.id);
  return { redirect: "/learn" };
}

export async function logInWith(db: SupabaseClient, field: Field): Promise<AuthState | { redirect: string }> {
  const email = field("email").trim();
  const { error } = await db.auth.signInWithPassword({ email, password: field("password") });
  if (error) return { error: "That email and password do not match an account.", email };
  // Only a path on this site: "//host" or a full URL would send the visitor elsewhere.
  const next = field("next");
  return { redirect: next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/\\") ? next : "/learn" };
}
