// Browser version of web/lib/auth.ts. The form goes to functions/api/auth/[action].ts, which signs in with Supabase and
// keeps the session in httpOnly cookies; the redirect it answers with is followed through the router, as is
// actions.ts's.
import type { AuthState } from "@/lib/authCore";
import { router } from "../router";
import { Redirect } from "../shims/navigation";
import { refreshUser, setUser } from "./supabase";

export type { AuthState } from "@/lib/authCore";

export function follow<A extends unknown[], R>(action: (...args: A) => Promise<R>) {
  return async (...args: A): Promise<R> => {
    try {
      return await action(...args);
    } catch (e) {
      if (!(e instanceof Redirect)) throw e;
      await router.navigate(e.href);
      return {} as R; // the form is gone by now; Next's redirect never returns at all
    }
  };
}

const send = (action: "login" | "signup") => async (_: AuthState, form: FormData): Promise<AuthState> => {
  const res = await fetch(`/api/auth/${action}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(Object.fromEntries([...form].filter(([, v]) => typeof v === "string"))),
  });
  if (!res.ok) throw new Error(`/api/auth/${action}: ${res.status}`);
  const result: AuthState | { redirect: string } = await res.json();
  if (!("redirect" in result)) return result;
  await refreshUser();
  throw new Redirect(result.redirect);
};

export const signUp = follow(send("signup"));
export const logIn = follow(send("login"));
export const logOut = follow(async () => {
  await fetch("/api/auth/logout", { method: "POST" });
  setUser(null);
  throw new Redirect("/");
});
