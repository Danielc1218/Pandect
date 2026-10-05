import { TopNav } from "@/components/Nav";
import { supabase } from "@/lib/supabase";

export default async function SiteLayout({ children }: LayoutProps<"/">) {
  const db = await supabase();
  const { data } = await db.auth.getClaims();
  return (
    <>
      <TopNav signedIn={!!data?.claims} />
      <main className="page">{children}</main>
      <footer className="footer muted">
        LSAT is a registered trademark of the Law School Admission Council, which is not affiliated with this site.
      </footer>
    </>
  );
}
