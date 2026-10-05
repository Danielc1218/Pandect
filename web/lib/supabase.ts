import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
export const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

/** Supabase client for server components and actions, acting as the signed-in user. */
export async function supabase() {
  const store = await cookies();
  return createServerClient(SUPABASE_URL, SUPABASE_KEY, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        try {
          list.forEach(({ name, value, options }) => store.set(name, value, options));
        } catch {
          // Server components cannot set cookies; proxy.ts refreshes the session instead.
        }
      },
    },
  });
}

/** The client and user for a signed-in page; sends everyone else to log in. */
export async function requireUser() {
  const db = await supabase();
  const { data } = await db.auth.getUser();
  if (!data.user) redirect("/login");
  return { db, user: data.user };
}
