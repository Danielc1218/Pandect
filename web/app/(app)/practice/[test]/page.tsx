import Link from "next/link";
import { sectionMinutes } from "@/lib/timing";
import { notFound } from "next/navigation";
import { SubmitButton } from "@/components/SubmitButton";
import { startSection } from "@/lib/actions";
import { allSections, allTests } from "@/lib/bank";
import { formatDay, grade, pct } from "@/lib/data";
import { requireUser } from "@/lib/supabase";

/** The tab names the test (the list of tests is cached). */
export async function generateMetadata({ params }: PageProps<"/practice/[test]">) {
  const { test } = await params;
  return { title: (await allTests()).find((t) => t.id === test)?.name ?? "Practice test" };
}

export default async function TestPage({ params }: PageProps<"/practice/[test]">) {
  const { test: testId } = await params;
  const { db } = await requireUser();
  const [tests, allSecs, { data: sessions }] = await Promise.all([
    allTests(),
    allSections(),
    db.from("test_sessions").select("id, section_number, started_at, finished_at, score_correct, score_total").eq("test_id", testId).order("started_at", { ascending: false }),
  ]);
  const test = tests.find((t) => t.id === testId);
  if (!test) notFound();
  const sections = allSecs.filter((s) => s.test_id === testId);
  const open = (n: number) => (sessions ?? []).find((s) => s.section_number === n && !s.finished_at);
  const past = (sessions ?? []).filter((s) => s.finished_at);
  const last = (n: number) => past.find((s) => s.section_number === n); // newest first
  return (
    <>
      <section>
        <p className="muted crumbs"><Link href="/practice">Practice tests</Link> / {test.name}{test.year ? `, ${test.year}` : ""}</p>
        <h1>{test.name}</h1>
        <div className="list">
          {(sections ?? []).map((s) => {
            const running = open(s.section_number);
            const done = last(s.section_number);
            const info = (
              <>
                <div className="grow">
                  <div className="title">Section {s.section_number}, {s.section_type}</div>
                  <div className="muted">
                    {s.questions} questions, {sectionMinutes(s.questions)} minutes
                    {done && `, last score ${done.score_correct} of ${done.score_total}`}
                  </div>
                </div>
                <span className={`btn${running || !done ? " primary" : ""}`}>{running ? "Resume" : done ? "Retake" : "Start"}</span>
              </>
            );
            return running ? (
              <Link key={s.section_number} className="row" href={`/section/${running.id}`}>{info}</Link>
            ) : (
              <form key={s.section_number} action={startSection}>
                <input type="hidden" name="test_id" value={test.id} />
                <input type="hidden" name="section_number" value={s.section_number} />
                <SubmitButton className="row">{info}</SubmitButton>
              </form>
            );
          })}
        </div>
      </section>
      {past.length > 0 && (
        <section>
          <h2>Finished sections</h2>
          <div className="list">
            {past.map((s) => (
              <Link key={s.id} className="row" href={`/results/${s.id}`}>
                <div className="grow">
                  <div className="title">Section {s.section_number}</div>
                  <div className="muted">Finished {formatDay(s.finished_at!)}</div>
                </div>
                <span className={`score ${grade(pct(s.score_correct ?? 0, s.score_total ?? 0))}`}>{s.score_correct} of {s.score_total}</span>
              </Link>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
