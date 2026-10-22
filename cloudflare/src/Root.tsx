// web/app/layout.tsx's body for the browser: the skip link, the top bar (its buttons once the session is known),
// the account's display preferences, then the page. The theme and prefs scripts are in index.html (vite.config.ts).
import { useEffect, useState } from "react";
import { Outlet, ScrollRestoration } from "react-router";
import { TopNav } from "@/components/Nav";
import { PrefsSync } from "@/components/Prefs";
import { supabase } from "./lib/supabase";
import "@/app/design/tokens.css";
import "@/app/design/dark.css";
import "@/app/design/mock.css";
import "@/app/skeleton.css";
import "@/app/prefs.css";

export default function Root() {
  const [userId, setUserId] = useState<string | null>(); // undefined until the session is known
  const [prefs, setPrefs] = useState<{ preferences: unknown } | null>(null);

  useEffect(() => {
    let stop = () => {};
    supabase().then((db) => {
      const { data } = db.auth.onAuthStateChange((_event, session) => setUserId(session?.user.id ?? null));
      stop = () => data.subscription.unsubscribe();
    });
    return () => stop();
  }, []);

  useEffect(() => {
    if (!userId) return setPrefs(null);
    let current = true;
    supabase().then((db) => db.from("profiles").select("preferences").eq("id", userId).maybeSingle())
      .then(({ data }) => { if (current) setPrefs(data); });
    return () => { current = false; };
  }, [userId]);

  return (
    <>
      <a className="skip-link" href="#main">Skip to content</a>
      {prefs && <PrefsSync account={prefs.preferences} />}
      <TopNav signedIn={userId === undefined ? undefined : !!userId} />
      <Outlet />
      <ScrollRestoration />
    </>
  );
}
