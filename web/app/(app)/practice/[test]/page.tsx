import Link from "next/link";
import { notFound } from "next/navigation";
import { startSection } from "@/lib/actions";
import { allSections, allTests } from "@/lib/bank";
import { requireUser } from "@/lib/supabase";

export default async function TestPage({ params }: PageProps<"/practice/[test]">) {
  const { test: testId } = await params;
  const { db } = await requireUser();
  const [tests, allSecs, { data: sessions }] = await Promise.all([
    allTests(),
    allSections(),
    db.from("test_sessions").select("id, section_number, started_at, finished_at").eq("test_id", testId).order("started_at", { ascending: false }),
  ]);
  const test = tests.find((t) => t.id === testId);
  if (!test) notFound();
  const sections = allSecs.filter((s) => s.test_id === testId);
  const open = (n: number) => (sessions ?? []).find((s) => s.section_number === n && !s.finished_at);
  const past = (sessions ?? []).filter((s) => s.finished_at);
  return (
    <>
      <section>
        <p className="muted"><Link href="/practice">Practice tests</Link> / {test.year ?? ""}</p>
        <h1>{test.name}</h1>
        <div className="list">
          {(sections ?? []).map((s) => {
            const running = open(s.section_number);
            const info = (
              <>
                <div className="grow">
                  <div className="title">Section {s.section_number}, {s.section_type}</div>
                  <div className="muted">{s.questions} questions, 35 minutes</div>
                </div>
                <span className="tag">{running ? "Resume" : "Start"}</span>
              </>
            );
            return running ? (
              <Link key={s.section_number} className="row" href={`/section/${running.id}`}>{info}</Link>
            ) : (
              <form key={s.section_number} action={startSection}>
                <input type="hidden" name="test_id" value={test.id} />
                <input type="hidden" name="section_number" value={s.section_number} />
                <button className="row">{info}</button>
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
                  <div className="muted">Finished {new Date(s.finished_at!).toLocaleDateString("en-GB", { day: "numeric", month: "long" })}</div>
                </div>
                <span className="tag">Results</span>
              </Link>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
