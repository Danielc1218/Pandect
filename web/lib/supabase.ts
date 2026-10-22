import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";

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

/**
 * The client and user for a signed-in page; sends everyone else to log in.
 * getClaims checks the session token's signature locally (the project signs with ES256), so this costs
 * no round trip to Supabase Auth; cache() shares one result between a request's layout, page and actions.
 */
export const requireUser = cache(async () => {
  const db = await supabase();
  const { data } = await db.auth.getClaims();
  if (!data?.claims) redirect("/login");
  return { db, user: { id: data.claims.sub, email: data.claims.email } };
});

/** Whether a visitor is signed in, without sending anyone to log in. */
export const signedIn = async () => !!(await (await supabase()).auth.getClaims()).data?.claims;
