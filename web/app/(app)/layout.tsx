import { Rail } from "@/components/Nav";

// No session read here: proxy.ts sends signed-out visitors to /login, and every page calls requireUser(),
// so the shell (the rail; the top bar is in the root layout) renders at once while the page streams in behind its loading.tsx.
export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="shell">
      <Rail />
      <main>{children}</main>
    </div>
  );
}
