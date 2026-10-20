import Link from "next/link";
import { Art } from "@/components/Art";
import { CountUp } from "@/components/CountUp";
import { Tabs } from "@/components/Tabs";
import { BANK_NAME } from "@/lib/bank";
import { activity, daysUntil, drillHref, formatDay, grade, pct, SECTIONS, typeStats, type TypeStat } from "@/lib/data";
import { SESSION_FIELDS, sessionHome, sessionLabel, type Session } from "@/lib/sessions";
import { requireUser } from "@/lib/supabase";

export const metadata = { title: "Learning" };

/** How many questions of each type the user has answered: one bar per type on a shared scale, most answered first. */
function AnsweredBars({ types }: { types: TypeStat[] }) {
  if (!types.length) return <div className="panel"><p>No questions of this kind yet.</p></div>;
  const most = Math.max(1, ...types.map((t) => t.answered));
  return (
    <div className="bars">
      {[...types].sort((a, b) => b.answered - a.answered || a.question_type.localeCompare(b.question_type)).map((t) => (
        <Link key={t.question_type} className={t.answered ? undefined : "zero"} href={drillHref(t.section_type, t.question_type)} title={`${t.question_type}: ${t.answered} of ${t.total} answered${t.answered ? `, ${pct(t.correct, t.answered)}% correct` : ""}`}>
          <span className="name">{t.question_type}</span>
          <span className="bar"><span style={{ width: `${(100 * t.answered) / most}%` }} /></span>
          <span className="count">{t.answered}<span className="of"> / {t.total}</span></span>
        </Link>
      ))}
    </div>
  );
}

export default async function Learn() {
  const { db, user } = await requireUser();
  const [{ data: profile }, stats, types, { data: sessions }] = await Promise.all([
    db.from("profiles").select("display_name, weekly_goal, test_date").eq("id", user.id).single(),
    activity(db),
    typeStats(db),
    db.from("test_sessions").select(SESSION_FIELDS).eq("bank", BANK_NAME).order("started_at", { ascending: false }).limit(1),
  ]);
  const goal = profile?.weekly_goal ?? 60;
  const daysLeft = profile?.test_date ? daysUntil(profile.test_date) : null;

  // Where the user left off: their latest timed section or their latest drill, whichever they touched last.
  const session = (sessions as unknown as Session[] | null)?.[0];
  const sessionAt = session && [session.started_at, stats.sessionAt(session.id) ?? ""].sort().at(-1)!;
  const inSection = session && (!stats.latestAt || sessionAt! > stats.latestAt);
  const drill = types.find((t) => t.question_type === stats.latest?.question_type && t.section_type === stats.latest?.section_type) ?? types[0];
  // Weakest types: the highest share of wrong answers first, the larger number of misses breaking ties.
  // A type needs a few answers first, so one slip does not read as "100% wrong".
  const weakest = types.filter((t) => t.answered >= 3 && t.answered > t.correct)
    .map((t) => ({ ...t, wrong: t.answered - t.correct }))
    .sort((x, y) => y.wrong / y.answered - x.wrong / x.answered || y.wrong - x.wrong).slice(0, 5);
  const art = (section?: string | null) => (section === SECTIONS.rc ? "reading" : "logic");

  return (
    <>
      <section>
        <h1>{stats.answered ? "Welcome back" : "Welcome"}, {profile?.display_name?.trim().split(/\s+/)[0] || "there"}</h1>
        <div className="split">
          {inSection ? (
            // A section still running resumes where it stopped; a finished one leads back to its test for the next section.
            <Link className="card wide" href={session.finished_at ? sessionHome(session) : `/section/${session.id}`}>
              <Art kind={art(session.section_type)} className="photo" />
              <div className="body">
                <div><span className="tag accent">Where you left off</span> <span className="tag">{session.finished_at ? "Finished" : "In progress"}</span></div>
                <h3>{sessionLabel(session).title}</h3>
                <p className="muted">{sessionLabel(session).subtitle}</p>
                <p className="muted">{session.finished_at ? `Finished ${formatDay(session.finished_at)}` : `Started ${formatDay(session.started_at)}`}</p>
                <span className="btn primary">{session.finished_at ? "Next section" : "Resume section"} →</span>
              </div>
            </Link>
          ) : drill && (
            <Link className="card wide" href={drillHref(drill.section_type, drill.question_type)}>
              <Art kind={art(drill.section_type)} className="photo" />
              <div className="body">
                <div><span className="tag accent">{stats.latest ? "Where you left off" : "Start here"}</span> <span className="tag">{drill.section_type}</span></div>
                <h3>{drill.question_type}</h3>
                <p className="muted">{drill.answered} of {drill.total} answered</p>
                <div className="progress"><span style={{ width: `${pct(drill.answered, drill.total)}%` }} /></div>
                <span className="btn primary">{stats.latest ? "Continue drilling" : "Start drilling"} →</span>
              </div>
            </Link>
          )}
          <div className="panel">
            <h3>This week</h3>
            <p className="muted">Goal: {goal} questions · <Link href="/profile#weekly-goal">Change</Link></p>
            <div className={`progress${stats.week >= goal ? " good" : ""}`}><span style={{ width: `${Math.min(100, pct(stats.week, goal))}%` }} /></div>
            <p className="muted">{stats.week} answered{stats.week < goal ? `, ${goal - stats.week} to go` : <>, <strong className="score good">goal met</strong></>}</p>
          </div>
        </div>
      </section>
      <section className="stats">
        <div className="stat"><div className="value"><CountUp value={stats.answered} /></div><div className="label">{stats.answered === 1 ? "question" : "questions"} answered</div></div>
        <div className="stat"><div className={`value ${stats.answered ? grade(stats.accuracy) : ""}`}>{stats.answered ? <CountUp value={stats.accuracy} suffix="%" /> : "–"}</div><div className="label">accuracy, last 100</div></div>
        <div className="stat"><div className="value"><CountUp value={stats.streak} suffix={stats.streak === 1 ? " day" : " days"} /></div><div className="label">{stats.streak && !stats.perDay[stats.today] ? "streak: answer one today to keep it" : "current streak"}</div></div>
        {/* no date, or one that has passed, leads to where it is set */}
        <div className="stat">
          <div className="value">{daysLeft === null || daysLeft < 0 ? "–" : daysLeft === 0 ? "Today" : daysLeft}</div>
          <div className="label">
            {daysLeft === null ? <Link href="/profile">Set your test date</Link>
              : daysLeft < 0 ? <Link href="/profile">Test date passed. Set a new one</Link>
              : daysLeft === 0 ? "is test day. Good luck!" : daysLeft === 1 ? "day to test day" : "days to test day"}
          </div>
        </div>
      </section>
      <section>
        <h2>Your weakest types</h2>
        {weakest.length ? (
          <div className="list">
            {weakest.map((t) => (
              <Link key={t.section_type + t.question_type} className="row" href={drillHref(t.section_type, t.question_type) + "&show=missed"} title="Review the ones you missed">
                <div className="grow">
                  <div className="title">{t.question_type}</div>
                  <div className="muted">{t.wrong} of {t.answered} wrong</div>
                </div>
                <span className="tag">{t.section_type}</span>
                {/* wrong is the flip side of accuracy, so it takes the color accuracy would */}
                <div className={`figure score ${grade(pct(t.correct, t.answered))}`}>{pct(t.wrong, t.answered)}% wrong</div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="panel"><p>{stats.answered ? "Types you miss will show here once you have answered at least three questions of a type." : "Answer some questions and the types you miss most will show here."}</p></div>
        )}
      </section>
      <section>
        <h2>Questions answered by type</h2>
        <Tabs labels={Object.values(SECTIONS)} label="Section">
          {Object.values(SECTIONS).map((s) => <AnsweredBars key={s} types={types.filter((t) => t.section_type === s)} />)}
        </Tabs>
        <div className="actions">
          <Link className="btn" href="/types">All question types</Link>
          <Link className="btn" href="/progress#by-type">Accuracy by type</Link>
          <Link className="btn" href="/practice">Timed sections</Link>
        </div>
      </section>
    </>
  );
}
