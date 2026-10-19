import { BANK_NAME } from "@/lib/bank";

export default function SiteLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <main id="main" className="page">{children}</main>
      <footer className="footer muted">
        {/* Only true of the generated bank. */}
        {BANK_NAME === "generated" && <>Questions on this site are practice questions in the style of the LSAT; they are not official LSAT questions.{" "}</>}
        LSAT is a registered trademark of the Law School Admission Council, which is not affiliated with this site.
      </footer>
    </>
  );
}
