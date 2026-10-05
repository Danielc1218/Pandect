import Link from "next/link";
import { activity, drillHref, pct, typeStats } from "@/lib/data";
import { requireUser } from "@/lib/supabase";

export const metadata = { title: "Progress" };

export default async function Progress() {
  const { db } = await requireUser();
  const [stats, types, { data: sessions }] = await Promise.all([
    activity(db),
    typeStats(db),
    db.from("test_sessions").select("id, section_number, finished_at, tests(name), attempts(correct)").not("finished_at", "is", null).order("finished_at", { ascending: false }).limit(10),
  ]);
  const tried = types.filter((t) => t.answered > 0).sort((a, b) => a.correct / a.answered - b.correct / b.answered);
  return (
    <>
      <section>
        <h1>Progress</h1>
        <div className="stats">
          <div className="stat"><div className="value">{stats.answered.toLocaleString()}</div><div className="label">questions answered</div></div>
          <div className="stat"><div className="value">{stats.answered ? `${stats.accuracy}%` : "–"}</div><div className="label">accuracy, last 100</div></div>
          <div className="stat"><div className="value">{stats.week}</div><div className="label">answered this week</div></div>
          <div className="stat"><div className="value">{stats.streak} {stats.streak === 1 ? "day" : "days"}</div><div className="label">current streak</div></div>
        </div>
      </section>
      <section>
        <h2>Accuracy by question type</h2>
        {tried.length ? (
          <div className="list">
            {tried.map((t) => (
              <Link key={t.section_type + t.question_type} className="row" href={drillHref(t.section_type, t.question_type)}>
                <div className="grow"><div className="title">{t.question_type}</div><div className="muted">{t.answered} answered, {t.section_type}</div></div>
                <div className="progress"><span style={{ width: `${pct(t.correct, t.answered)}%` }} /></div>
                <div className="figure">{pct(t.correct, t.answered)}%</div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="panel"><p>Answer a few questions and your accuracy by type will show here.</p><div className="actions"><Link className="btn primary" href="/types">Choose a question type</Link></div></div>
        )}
      </section>
      {!!sessions?.length && (
        <section>
          <h2>Timed sections</h2>
          <table className="plain">
            <thead><tr><th>Test</th><th>Section</th><th>Date</th><th>Correct</th></tr></thead>
            <tbody>
              {sessions.map((s) => {
                const marks = (s.attempts ?? []) as { correct: boolean }[];
                return (
                  <tr key={s.id}>
                    <td><Link href={`/results/${s.id}`}>{(s.tests as unknown as { name: string }).name}</Link></td>
                    <td>{s.section_number}</td>
                    <td>{new Date(s.finished_at!).toLocaleDateString("en-GB", { day: "numeric", month: "long" })}</td>
                    <td>{marks.filter((m) => m.correct).length} of {marks.length} answered</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      )}
    </>
  );
}
