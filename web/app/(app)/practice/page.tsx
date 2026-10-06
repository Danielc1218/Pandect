import Link from "next/link";
import { Tabs } from "@/components/Tabs";
import { startRandomSection } from "@/lib/actions";
import { allSections, allTests, BANK_NAME } from "@/lib/bank";
import { pct, testNumber } from "@/lib/data";
import { SESSION_FIELDS, sessionLabel, type Session } from "@/lib/sessions";
import { requireUser } from "@/lib/supabase";

export const metadata = { title: "Practice tests" };

type Row = { id: string; name: string; year: number | null; sections: number; done: number; started: boolean };

function TestList({ tests }: { tests: Row[] }) {
  if (!tests.length) return <div className="panel"><p>No tests here yet.</p></div>;
  return (
    <div className="list">
      {tests.map((t) => (
        <Link key={t.id} className="row" href={`/practice/${t.id}`}>
          <div className="grow">
            <div className="title">{t.name}</div>
            <div className="muted">{t.year ? `${t.year}, ` : ""}{t.sections} sections</div>
          </div>
          <span className="tag">{t.done >= t.sections ? "Completed" : t.started ? "In progress" : "Not started"}</span>
          <div className="figure">{t.done} of {t.sections}</div>
        </Link>
      ))}
    </div>
  );
}

const day = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "long" });

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
          <div className="actions"><button className="btn primary">Start a section</button></div>
        </form>
      </section>
      {open.length > 0 && (
        <section>
          <h2>In progress</h2>
          <div className="list">
            {open.map((s) => (
              <Link key={s.id} className="row" href={`/section/${s.id}`}>
                <div className="grow"><div className="title">{sessionLabel(s).subtitle}</div><div className="muted">Started {day(s.started_at)}</div></div>
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
                <div className="grow"><div className="title">{sessionLabel(s).subtitle}</div><div className="muted">Finished {day(s.finished_at!)}</div></div>
                <span className="tag">{s.score_correct} of {s.score_total}</span>
                <div className="figure">{pct(s.score_correct ?? 0, s.score_total ?? 0)}%</div>
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

export default async function Practice() {
  if (BANK_NAME === "generated") return <RandomSections />;
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
    .sort((a, b) => testNumber(b.id) - testNumber(a.id));
  const started = rows.filter((t) => t.started && t.done < t.sections);
  return (
    <section>
      <h1>Practice tests</h1>
      <Tabs labels={["All", "In progress", "Completed"]} label="Filter practice tests">
        <TestList tests={rows} />
        <TestList tests={started} />
        <TestList tests={rows.filter((t) => t.done >= t.sections)} />
      </Tabs>
    </section>
  );
}
