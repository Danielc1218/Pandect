import Link from "next/link";

export const metadata = { title: "Page not found" };

/** Any address with no page, and any question, test or section that does not exist. */
export default function NotFound() {
  return (
    <main id="main" className="page">
      <section className="panel tinted stack">
        <h1>That page isn&rsquo;t here</h1>
        <p>The link may be old, or the question or test it pointed to has moved.</p>
        <div className="actions" style={{ justifyContent: "center" }}>
          <Link className="btn primary" href="/learn">Go to your dashboard</Link>
          <Link className="btn" href="/types">Question types</Link>
          <Link className="btn" href="/practice">Practice tests</Link>
        </div>
      </section>
    </main>
  );
}
