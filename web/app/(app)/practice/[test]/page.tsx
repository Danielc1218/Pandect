import Link from "next/link";
import { sectionMinutes } from "@/lib/timing";
import { notFound } from "next/navigation";
import { SubmitButton } from "@/components/SubmitButton";
import { startSection } from "@/lib/actions";
import { allTests } from "@/lib/bank";
import { formatDay, grade, pct } from "@/lib/data";
import { canStartSection } from "@/lib/practiceTests";
import { op } from "@/lib/run";

/** The tab names the test (the list of tests is cached). */
export async function generateMetadata({ params }: PageProps<"/practice/[test]">) {
  const { test } = await params;
  return { title: (await allTests()).find((t) => t.id === test)?.name ?? "Practice test" };
}

export default async function TestPage({ params }: PageProps<"/practice/[test]">) {
  const { test: testId } = await params;
  const { test, sections, sessions } = await op("practiceTest", testId);
  if (!test) notFound();
  const open = (n: number) => (sessions ?? []).find((s) => s.section_number === n && !s.finished_at);
  const past = (sessions ?? []).filter((s) => s.finished_at);
  const last = (n: number) => past.find((s) => s.section_number === n); // newest first
  return (
    <>
      <section>
        <p className="muted crumbs"><Link href="/practice">Practice tests</Link> / {test.name}{test.year ? `, ${test.year}` : ""}</p>
        <h1>{test.name}</h1>
        {/* how far through the test you are: sections finished at least once */}
        <p className="muted">{new Set(past.map((s) => s.section_number)).size} of {sections.length} sections finished</p>
        <div className="list">
          {(sections ?? []).map((s) => {
            const running = open(s.section_number);
            const done = last(s.section_number);
            // An incomplete generated test (reachable by its address) lists its sections but offers none to start.
            const startable = canStartSection(sections, testId, s.section_number);
            const info = (
              <>
                <div className="grow">
                  <div className="title">Section {s.section_number}, {s.section_type}</div>
                  <div className="muted">
                    {s.questions} questions, {sectionMinutes(s.questions)} minutes
                    {running && `, started ${formatDay(running.started_at)}`}
                    {done && <>, last score <span className={`score ${grade(pct(done.score_correct ?? 0, done.score_total ?? 0))}`}>{done.score_correct} of {done.score_total}</span></>}
                  </div>
                </div>
                {(running || startable) && <span className={`btn${running || !done ? " primary" : ""}`}>{running ? "Resume" : done ? "Retake" : "Start"}</span>}
              </>
            );
            return running ? (
              <Link key={s.section_number} className="row" href={`/section/${running.id}`}>{info}</Link>
            ) : !startable ? (
              <div key={s.section_number} className="row">{info}</div>
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
