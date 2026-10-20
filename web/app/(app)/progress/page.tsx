import Link from "next/link";
import { BANK_NAME } from "@/lib/bank";
import { activity, drillHref, formatDay, grade, pct, typeStats } from "@/lib/data";
import { SESSION_FIELDS, sessionLabel, type Session } from "@/lib/sessions";
import { requireUser } from "@/lib/supabase";

export const metadata = { title: "Progress" };

const WEEKS = 12;
const LEVELS = [0, 1, 5, 15, 30]; // answers in a day for each shade

/** The last twelve weeks, one square a day, darker for more questions answered; weeks run down the columns. */
function Calendar({ perDay, today }: { perDay: Record<number, number>; today: number }) {
  const weekday = (new Date(today * 86_400_000).getUTCDay() + 6) % 7; // Monday is 0
  const first = today - weekday - (WEEKS - 1) * 7;
  const days = Array.from({ length: (WEEKS - 1) * 7 + weekday + 1 }, (_, i) => first + i);
  const label = (d: number) => new Date(d * 86_400_000).toLocaleDateString("en-US", { day: "numeric", month: "short", timeZone: "UTC" });
  const total = days.reduce((n, d) => n + (perDay[d] ?? 0), 0);
  return (
    <div className="panel">
      <div className="calendar" role="img" aria-label={`${total} questions answered in the last ${WEEKS} weeks`}>
        {days.map((d) => {
          const n = perDay[d] ?? 0;
          return <span key={d} data-level={LEVELS.findLastIndex((l) => n >= l)} data-today={d === today || undefined} title={`${d === today ? "Today" : label(d)}: ${n} ${n === 1 ? "question" : "questions"}`} />;
        })}
      </div>
      <div className="actions spread" style={{ alignItems: "center" }}>
        <p className="muted">{total} questions in the last {WEEKS} weeks. Each square is a day.</p>
        <p className="muted calendar-legend" aria-hidden="true">Less {LEVELS.map((_, i) => <span key={i} data-level={i} />)} More</p>
      </div>
    </div>
  );
}

export default async function Progress() {
  const { db } = await requireUser();
  const [stats, types, { data: sessions }] = await Promise.all([
    activity(db),
    typeStats(db),
    db.from("test_sessions").select(SESSION_FIELDS).eq("bank", BANK_NAME).not("finished_at", "is", null).order("finished_at", { ascending: false }).limit(10),
  ]);
  const tried = types.filter((t) => t.answered > 0).sort((a, b) => a.correct / a.answered - b.correct / b.answered);
  return (
    <>
      <section>
        <h1>Progress</h1>
        <div className="stats">
          <div className="stat"><div className="value">{stats.answered.toLocaleString()}</div><div className="label">questions answered</div></div>
          <div className="stat"><div className={`value ${stats.answered ? grade(stats.accuracy) : ""}`}>{stats.answered ? `${stats.accuracy}%` : "–"}</div><div className="label">accuracy, last 100</div></div>
          <div className="stat"><div className="value">{stats.week}</div><div className="label">answered this week</div></div>
          <div className="stat"><div className="value">{stats.streak} {stats.streak === 1 ? "day" : "days"}</div><div className="label">current streak{stats.best > Math.max(1, stats.streak) ? `, best ${stats.best} days` : ""}</div></div>
        </div>
      </section>
      <section>
        <h2>Activity</h2>
        <Calendar perDay={stats.perDay} today={stats.today} />
      </section>
      <section>
        <h2 id="by-type">Accuracy by question type</h2>
        {tried.length ? (
          <div className="list">
            {tried.map((t) => (
              <Link key={t.section_type + t.question_type} className="row" href={drillHref(t.section_type, t.question_type) + (t.answered > t.correct ? "&show=missed" : "")}>
                <div className="grow"><div className="title">{t.question_type}</div><div className="muted">{t.answered} answered, {t.section_type}{t.answered > t.correct ? ` · ${t.answered - t.correct} to review` : ""}</div></div>
                <div className={`progress ${grade(pct(t.correct, t.answered))}`}><span style={{ width: `${pct(t.correct, t.answered)}%` }} /></div>
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
            <thead><tr><th>Test</th><th>Section</th><th>Date</th><th>Score</th></tr></thead>
            <tbody>
              {(sessions as unknown as Session[]).map((s) => {
                const label = sessionLabel(s);
                return (
                  <tr key={s.id}>
                    <td><Link href={`/results/${s.id}`}>{label.title}</Link></td>
                    <td>{label.subtitle}</td>
                    <td>{formatDay(s.finished_at!)}</td>
                    <td><span className={`score ${grade(pct(s.score_correct ?? 0, s.score_total ?? 0))}`}>{s.score_correct} of {s.score_total} ({pct(s.score_correct ?? 0, s.score_total ?? 0)}%)</span></td>
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
