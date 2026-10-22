// Browser version of web/lib/supabase.ts. The browser never talks to Supabase: the session lives in httpOnly cookies
// that only this site's /api reads (functions/api/auth/[action].ts). This file only knows who is signed in.
import { Redirect } from "../shims/navigation";

export type User = { id: string; email?: string };

let me: Promise<User | null> | undefined;
const listeners = new Set<(user: User | null) => void>();

/** Who is signed in, asked of the server once per tab and then kept; null for nobody. */
export function currentUser(): Promise<User | null> {
  return (me ??= fetch("/api/auth/me").then(
    (res) => (res.ok ? res.json() : Promise.reject(new Error(`/api/auth/me: ${res.status}`))),
  ).catch((error) => { me = undefined; throw error; })); // a failed check is asked again next time
}

/** Records who is signed in now (null after signing out, or when the server stops accepting the session). */
export function setUser(user: User | null) {
  me = Promise.resolve(user);
  for (const f of listeners) f(user);
}

/** Asks the server again who is signed in, as after logging in, and tells the listeners. */
export async function refreshUser() {
  me = undefined;
  const user = await currentUser();
  setUser(user);
  return user;
}

/** Calls `f` with the signed-in user once known and on every change; returns the unsubscribe. */
export function onUser(f: (user: User | null) => void) {
  listeners.add(f);
  currentUser().then((user) => listeners.has(f) && f(user), () => {});
  return () => { listeners.delete(f); };
}

/** Where a signed-out visitor goes: log in, then back here (web/proxy.ts's rule: the home page adds no `next`). */
export const logInHref = () =>
  location.pathname === "/" ? "/login" : "/login?next=" + encodeURIComponent(location.pathname + location.search);

/** The user for a signed-in page; sends everyone else to log in. */
export async function requireUser() {
  const user = await currentUser();
  if (!user) throw new Redirect(logInHref());
  return { user };
}

/** Whether a visitor is signed in, without sending anyone to log in. */
export const signedIn = async () => !!(await currentUser());

/**
 * A call to this site's /api as the signed-in user (the session cookie goes along): GET, or a POST of `body` as JSON.
 * Null on 404. A 401 means the session has ended: the user is signed out here too and sent to log in.
 */
export async function api<T>(path: string, body?: unknown): Promise<T | null> {
  const res = await fetch(path, body === undefined ? {} : { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  if (res.status === 401) {
    setUser(null);
    throw new Redirect(logInHref());
  }
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`${path}: ${res.status}`);
  return res.json();
}
