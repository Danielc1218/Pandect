"use client";

import Link from "next/link";

/** A learning page that failed to load (usually a dropped connection): say so and offer another try. The menu stays. */
export default function LearningError({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <section className="panel tinted stack" role="alert">
      <h1>This page didn&rsquo;t load</h1>
      <p>Something went wrong fetching it, often a dropped connection. Your answers so far are saved.</p>
      <div className="actions" style={{ justifyContent: "center" }}>
        <button type="button" className="btn primary" onClick={retry}>Try again</button>
        <Link className="btn" href="/learn">Go to your dashboard</Link>
      </div>
    </section>
  );
}
