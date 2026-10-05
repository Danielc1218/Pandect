import { Rail, TopNav } from "@/components/Nav";
import { requireUser } from "@/lib/supabase";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  await requireUser();
  return (
    <>
      <TopNav signedIn />
      <div className="shell">
        <Rail />
        <main>{children}</main>
      </div>
    </>
  );
}
