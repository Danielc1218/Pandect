// Browser version of web/lib/supabase.ts: one client for the tab, its session kept in localStorage.
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { Redirect } from "../shims/navigation";

export const SUPABASE_URL: string = import.meta.env.VITE_SUPABASE_URL;
export const SUPABASE_KEY: string = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

let client: SupabaseClient | undefined;

export async function supabase() {
  return (client ??= createClient(SUPABASE_URL, SUPABASE_KEY));
}

/**
 * The client and user for a signed-in page; sends everyone else to log in, then back here (web/proxy.ts's rule:
 * the home page adds no `next`).
 */
export async function requireUser() {
  const db = await supabase();
  const { data: { session } } = await db.auth.getSession();
  if (!session) {
    const here = location.pathname + location.search;
    throw new Redirect(location.pathname === "/" ? "/login" : "/login?next=" + encodeURIComponent(here));
  }
  return { db, user: { id: session.user.id, email: session.user.email } };
}
