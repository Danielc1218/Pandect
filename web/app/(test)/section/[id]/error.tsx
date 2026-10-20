"use client";

import Link from "next/link";

/** A timed section that failed to load or broke mid-way (usually a dropped connection). Saved answers are kept. */
export default function SectionError({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <main id="main" tabIndex={-1} className="page">
      <section className="panel tinted stack" role="alert">
        <h1>This section didn&rsquo;t load</h1>
        <p>Something went wrong, often because of a dropped connection. The answers you saved are kept, and the clock is still running.</p>
        <div className="actions" style={{ justifyContent: "center" }}>
          <button type="button" className="btn primary" onClick={retry}>Try again</button>
          <Link className="btn" href="/practice">Practice tests</Link>
        </div>
      </section>
    </main>
  );
}
