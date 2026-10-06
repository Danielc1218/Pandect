import { Suspense } from "react";
import { TopNav } from "@/components/Nav";
import { supabase } from "@/lib/supabase";

// Only the nav's buttons depend on the session, so only they wait for it; the rest of the page prerenders.
async function SessionNav() {
  const db = await supabase();
  const { data } = await db.auth.getClaims();
  return <TopNav signedIn={!!data?.claims} />;
}

export default function SiteLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <Suspense fallback={<TopNav />}>
        <SessionNav />
      </Suspense>
      <main className="page">{children}</main>
      <footer className="footer muted">
        LSAT is a registered trademark of the Law School Admission Council, which is not affiliated with this site.
      </footer>
    </>
  );
}
