import type { Metadata } from "next";
import { Suspense } from "react";
import { TopNav } from "@/components/Nav";
import { PrefsSync } from "@/components/Prefs";
import { BANK_NAME } from "@/lib/bank";
import { applyPrefs } from "@/lib/prefs";
import { supabase } from "@/lib/supabase";
import "./design/tokens.css";
import "./design/dark.css";
import "./design/mock.css";
import "./skeleton.css";
import "./prefs.css";

export const metadata: Metadata = {
  title: { default: "LSAT Prep", template: "%s · LSAT Prep" },
  description: `Practise on ${"LSAT-style"} questions, sorted by type, with your accuracy tracked.`,
};

// Only the nav's buttons depend on the session, so only they wait for it; the rest of the page prerenders.
// The account's display preferences come with it and replace this device's copy if they differ.
async function SessionNav() {
  const db = await supabase();
  const { data } = await db.auth.getClaims();
  const prefs = data?.claims ? (await db.from("profiles").select("preferences").eq("id", data.claims.sub).maybeSingle()).data : null;
  return <>{prefs && <PrefsSync account={prefs.preferences} />}<TopNav signedIn={!!data?.claims} /></>;
}

const THEME_SCRIPT = `try{var t=localStorage.getItem("theme")}catch(e){}document.documentElement.dataset.theme=t||(matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light")`;
// This device's display preferences (lib/prefs.ts), applied before the first paint like the theme.
const PREFS_SCRIPT = `try{(${applyPrefs.toString()})(JSON.parse(localStorage.getItem("prefs")||"{}"))}catch(e){}`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Sets the theme and display preferences before the first paint: the saved choice, otherwise the device's
            setting. They change <html>'s attributes ahead of React, hence suppressHydrationWarning. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
        <script dangerouslySetInnerHTML={{ __html: PREFS_SCRIPT }} />
        {/* The design tokens name the family "Inter", so it is loaded by name rather than through next/font. */}
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" />
      </head>
      <body>
        {/* the first thing a keyboard reaches: straight past the navigation (pages without a main skip nothing) */}
        <a className="skip-link" href="#main">Skip to content</a>
        {/* One top bar for the whole site, here rather than in each section's layout, so it is never remounted
            and its highlight slides between Home, About and Learning. A timed section hides it (mock.css). */}
        <Suspense fallback={<TopNav />}>
          <SessionNav />
        </Suspense>
        {children}
      </body>
    </html>
  );
}
