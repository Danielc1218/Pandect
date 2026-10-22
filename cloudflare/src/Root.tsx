// web/app/layout.tsx's body for the browser: the skip link, the top bar (its buttons once the session is known),
// the account's display preferences, then the page. The theme and prefs scripts are in index.html (vite.config.ts).
import { useEffect, useState } from "react";
import { Outlet, ScrollRestoration } from "react-router";
import { TopNav } from "@/components/Nav";
import { PrefsSync } from "@/components/Prefs";
import { op } from "./lib/run";
import { onUser } from "./lib/supabase";
import { onRefresh } from "./shims/navigation";
import "@/app/design/tokens.css";
import "@/app/design/dark.css";
import "@/app/design/mock.css";
import "@/app/skeleton.css";
import "@/app/prefs.css";
import "@/app/mascot.css";

export default function Root() {
  const [userId, setUserId] = useState<string | null>(); // undefined until the session is known
  const [prefs, setPrefs] = useState<{ id: string; preferences: unknown } | null>(null);
  const [reads, setReads] = useState(0); // router.refresh() reads the account's preferences again, as Next re-renders the root layout

  useEffect(() => onUser((user) => setUserId(user?.id ?? null)), []);

  useEffect(() => onRefresh(() => setReads((n) => n + 1)), []);

  useEffect(() => {
    if (!userId) return setPrefs(null);
    let current = true;
    op("prefs").then((preferences) => { if (current) setPrefs({ id: userId, preferences }); }, () => {});
    return () => { current = false; };
  }, [userId, reads]);

  return (
    <>
      <a className="skip-link" href="#main">Skip to content</a>
      <PrefsSync account={prefs?.id === userId ? prefs?.preferences : undefined} accountId={userId} />
      <TopNav signedIn={userId === undefined ? undefined : !!userId} />
      <Outlet />
      <ScrollRestoration />
    </>
  );
}
