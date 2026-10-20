import Link from "next/link";
import { SubmitButton } from "@/components/SubmitButton";
import { Tabs } from "@/components/Tabs";
import { startRandomSection } from "@/lib/actions";
import { allSections, allTests, BANK_NAME } from "@/lib/bank";
import { formatDay, grade, pct, testNumber } from "@/lib/data";
import { SESSION_FIELDS, sessionLabel, type Session } from "@/lib/sessions";
import { requireUser } from "@/lib/supabase";

export const metadata = { title: "Practice tests" };

type Row = { id: string; name: string; year: number | null; sections: number; done: number; started: boolean };

function TestList({ tests, empty }: { tests: Row[]; empty: string }) {
  if (!tests.length) return <div className="panel"><p>{empty}</p></div>;
  return (
    <div className="list">
      {tests.map((t) => (
        <Link key={t.id} className="row" href={`/practice/${t.id}`}>
          <div className="grow">
            <div className="title">{t.name}</div>
            <div className="muted">{t.year ? `${t.year}, ` : ""}{t.sections} sections</div>
          </div>
          <span className={`tag${t.done >= t.sections ? " solved" : ""}`}>{t.done >= t.sections ? "Completed" : t.started ? "In progress" : "Not started"}</span>
          <div className="progress mini" aria-hidden="true"><span style={{ width: `${pct(t.done, t.sections)}%` }} /></div>
          <div className="figure">{t.done} of {t.sections}</div>
        </Link>
      ))}
    </div>
  );
}

/** The generated bank has no fixed tests: each sitting is a fresh random set, and past sittings are history. */
async function RandomSections() {
  const { db } = await requireUser();
  const { data } = await db.from("test_sessions").select(SESSION_FIELDS).eq("bank", BANK_NAME)
    .order("started_at", { ascending: false }).limit(50);
  const sessions = (data ?? []) as unknown as Session[];
  const open = sessions.filter((s) => !s.finished_at);
  const done = sessions.filter((s) => s.finished_at);
  return (
    <>
      <section>
        <h1>Practice tests</h1>
        <form className="panel" action={startRandomSection}>
          <h3>Timed Logical Reasoning section</h3>
          <p className="muted">25 questions, 35 minutes</p>
          <div className="actions"><SubmitButton className="btn primary" busy="Starting…">Start a section</SubmitButton></div>
        </form>
        <form className="panel" action={startRandomSection}>
          <input type="hidden" name="section_type" value="Reading Comprehension" />
          <h3>Timed Reading Comprehension section</h3>
          <p className="muted">4 passages, about 27 questions, 35 minutes</p>
          <div className="actions"><SubmitButton className="btn primary" busy="Starting…">Start a section</SubmitButton></div>
        </form>
      </section>
      {open.length > 0 && (
        <section>
          <h2>In progress</h2>
          <div className="list">
            {open.map((s) => (
              <Link key={s.id} className="row" href={`/section/${s.id}`}>
                <div className="grow"><div className="title">{sessionLabel(s).subtitle}</div><div className="muted">Started {formatDay(s.started_at)}</div></div>
                <span className="tag">Resume</span>
              </Link>
            ))}
          </div>
        </section>
      )}
      <section>
        <h2>Completed</h2>
        {done.length ? (
          <div className="list">
            {done.map((s) => (
              <Link key={s.id} className="row" href={`/results/${s.id}`}>
                <div className="grow"><div className="title">{sessionLabel(s).subtitle}</div><div className="muted">Finished {formatDay(s.finished_at!)}</div></div>
                <span className="tag">{s.score_correct} of {s.score_total}</span>
                <div className={`figure score ${grade(pct(s.score_correct ?? 0, s.score_total ?? 0))}`}>{pct(s.score_correct ?? 0, s.score_total ?? 0)}%</div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="panel"><p>Your finished sections and their scores will be listed here.</p></div>
        )}
      </section>
    </>
  );
}

export default async function Practice({ searchParams }: PageProps<"/practice">) {
  if (BANK_NAME === "generated") return <RandomSections />;
  const find = String((await searchParams).q ?? "").trim();
  const { db } = await requireUser();
  const [tests, sections, { data: sessions }] = await Promise.all([
    allTests(),
    allSections(),
    db.from("test_sessions").select("test_id, section_number, finished_at"),
  ]);
  const rows: Row[] = tests
    .map((t) => {
      const mine = (sessions ?? []).filter((s) => s.test_id === t.id);
      return {
        ...t,
        sections: sections.filter((s) => s.test_id === t.id).length,
        done: new Set(mine.filter((s) => s.finished_at).map((s) => s.section_number)).size,
        started: mine.length > 0,
      };
    })
    .sort((a, b) => testNumber(b.id) - testNumber(a.id))
    // "90" finds test 90, "2019" that year's tests, and words match the name.
    .filter((t) => !find || find.split(/\s+/).every((w) => `${t.name} ${t.year ?? ""} ${testNumber(t.id)}`.toLowerCase().split(/\s+/).includes(w.toLowerCase()) || t.name.toLowerCase().includes(w.toLowerCase())));
  const started = rows.filter((t) => t.started && t.done < t.sections);
  const completed = rows.filter((t) => t.done >= t.sections);
  return (
    <section>
      <h1>Practice tests</h1>
      <form className="field" role="search">
        <label htmlFor="find-test">Find a test</label>
        <input id="find-test" name="q" type="search" defaultValue={find} placeholder="A number like 72, or a year like 2015" />
      </form>
      {find && <p className="muted">{rows.length} {rows.length === 1 ? "test matches" : "tests match"} “{find}”. <Link href="/practice">Show all</Link></p>}
      <Tabs labels={[`All (${rows.length})`, `In progress (${started.length})`, `Completed (${completed.length})`]} label="Filter practice tests">
        <TestList tests={rows} empty={find ? "No tests match that search." : "No tests here yet."} />
        <TestList tests={started} empty={find ? "None of the matching tests is in progress." : "Tests you have started but not finished will show here."} />
        <TestList tests={completed} empty={find ? "None of the matching tests is completed." : "Tests with every section finished will show here."} />
      </Tabs>
    </section>
  );
}
