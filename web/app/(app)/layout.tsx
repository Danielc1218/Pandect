import { Rail, TopNav } from "@/components/Nav";

// No session read here: proxy.ts sends signed-out visitors to /login, and every page calls requireUser(),
// so the shell (nav and rail) renders at once while the page streams in behind its loading.tsx.
export default function AppLayout({ children }: LayoutProps<"/">) {
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
