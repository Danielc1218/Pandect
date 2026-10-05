import Image from "next/image";
import Link from "next/link";
import { activity, daysUntil, drillHref, pct, typeStats } from "@/lib/data";
import { requireUser } from "@/lib/supabase";

export const metadata = { title: "Learning" };

export default async function Learn() {
  const { db, user } = await requireUser();
  const [{ data: profile }, stats, types] = await Promise.all([
    db.from("profiles").select("display_name, weekly_goal, test_date").eq("id", user.id).single(),
    activity(db),
    typeStats(db),
  ]);
  const goal = profile?.weekly_goal ?? 60;
  const next = types.find((t) => t.question_type === stats.latest?.question_type && t.section_type === stats.latest?.section_type) ?? types[0];
  // Weakest types once there is enough of a record; otherwise the most common ones.
  const tried = types.filter((t) => t.answered >= 5).sort((a, b) => a.correct / a.answered - b.correct / b.answered);
  const plan = (tried.length >= 3 ? tried : types).slice(0, 3);
  const daysLeft = profile?.test_date ? daysUntil(profile.test_date) : null;

  return (
    <>
      <section>
        <h1>{stats.answered ? "Welcome back" : "Welcome"}, {profile?.display_name ?? "there"}</h1>
        <div className="split">
          {next && (
            <Link className="card wide" href={drillHref(next.section_type, next.question_type)}>
              <Image className="photo" src={`/images/${next.section_type === "Reading Comprehension" ? "reading" : "logic"}.jpg`} alt="" width={800} height={400} priority />
              <div className="body">
                <div><span className="tag">{next.section_type}</span> <span className="tag accent">{stats.answered ? "Continue" : "Start here"}</span></div>
                <h3>{next.question_type}</h3>
                <p className="muted">{next.answered} of {next.total} answered</p>
                <div className="progress"><span style={{ width: `${pct(next.answered, next.total)}%` }} /></div>
              </div>
            </Link>
          )}
          <div className="panel">
            <h3>This week</h3>
            <p className="muted">Goal: {goal} questions</p>
            <div className="progress"><span style={{ width: `${Math.min(100, pct(stats.week, goal))}%` }} /></div>
            <p className="muted">{stats.week} answered{stats.week < goal ? `, ${goal - stats.week} to go` : ", goal met"}</p>
          </div>
        </div>
      </section>
      <section className="stats">
        <div className="stat"><div className="value">{stats.answered.toLocaleString()}</div><div className="label">questions answered</div></div>
        <div className="stat"><div className="value">{stats.answered ? `${stats.accuracy}%` : "–"}</div><div className="label">accuracy, last 100</div></div>
        <div className="stat"><div className="value">{stats.streak} {stats.streak === 1 ? "day" : "days"}</div><div className="label">current streak</div></div>
        <div className="stat"><div className="value">{daysLeft === null ? "–" : Math.max(0, daysLeft)}</div><div className="label">{daysLeft === null ? "no test date set" : "days to test day"}</div></div>
      </section>
      <section>
        <h2>{tried.length >= 3 ? "Your weakest types" : "Most common types"}</h2>
        <div className="list">
          {plan.map((t) => (
            <Link key={t.section_type + t.question_type} className="row" href={drillHref(t.section_type, t.question_type)}>
              <div className="grow">
                <div className="title">{t.question_type}</div>
                <div className="muted">{t.answered ? `${t.correct} of ${t.answered} correct` : `${t.total} questions, not started`}</div>
              </div>
              <span className="tag">{t.section_type}</span>
              <div className="figure">{t.answered ? `${pct(t.correct, t.answered)}%` : "–"}</div>
            </Link>
          ))}
        </div>
        <div className="actions">
          <Link className="btn" href="/types">All question types</Link>
          <Link className="btn" href="/practice">Timed sections</Link>
        </div>
      </section>
    </>
  );
}
