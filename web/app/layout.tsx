import type { Metadata } from "next";
import { Suspense } from "react";
import { TopNav } from "@/components/Nav";
import { BANK_NAME } from "@/lib/bank";
import { supabase } from "@/lib/supabase";
import "./design/tokens.css";
import "./design/mock.css";
import "./skeleton.css";

export const metadata: Metadata = {
  title: { default: "LSAT Prep", template: "%s · LSAT Prep" },
  description: `Practise on ${"LSAT-style"} questions, sorted by type, with your accuracy tracked.`,
};

// Only the nav's buttons depend on the session, so only they wait for it; the rest of the page prerenders.
async function SessionNav() {
  const db = await supabase();
  const { data } = await db.auth.getClaims();
  return <TopNav signedIn={!!data?.claims} />;
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <head>
        {/* The design tokens name the family "Inter", so it is loaded by name rather than through next/font. */}
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" />
      </head>
      <body>
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
