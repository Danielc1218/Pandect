// Browser version of web/lib/auth.ts. It runs web's own actions (their supabase() is the browser client here)
// and follows the redirect they end with through the router instead of a server response.
import * as web from "@/lib/auth";
import { router } from "../router";
import { Redirect } from "../shims/navigation";

export type { AuthState } from "@/lib/auth";

function follow<A extends unknown[], R>(action: (...args: A) => Promise<R>) {
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

export const signUp = follow(web.signUp);
export const logIn = follow(web.logIn);
export const logOut = follow(web.logOut);
