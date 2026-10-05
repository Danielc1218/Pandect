import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { pct } from "@/lib/data";
import { requireUser } from "@/lib/supabase";

export const metadata = { title: "Results" };

export default async function Results({ params }: PageProps<"/results/[id]">) {
  const { id } = await params;
  const { db } = await requireUser();
  const { data: session } = await db.from("test_sessions").select("id, test_id, section_number, started_at, finished_at, tests(name)").eq("id", id).maybeSingle();
  if (!session) notFound();
  if (!session.finished_at) redirect(`/section/${id}`);

  const [{ data: questions }, { data: attempts }] = await Promise.all([
    db.from("questions").select("id, question_number, question_type, section_type, correct_answer")
      .eq("test_id", session.test_id).eq("section_number", session.section_number).order("question_number"),
    db.from("attempts").select("question_id, chosen, correct").eq("session_id", id),
  ]);
  const all = questions ?? [];
  const mine = new Map((attempts ?? []).map((a) => [a.question_id, a]));
  const right = all.filter((q) => mine.get(q.id)?.correct).length;
  const seconds = Math.round((new Date(session.finished_at).getTime() - new Date(session.started_at).getTime()) / 1000);
  const byType = Object.entries(Object.groupBy(all, (q) => q.question_type))
    .map(([type, qs]) => ({ type, total: qs!.length, right: qs!.filter((q) => mine.get(q.id)?.correct).length }))
    .sort((a, b) => a.right / a.total - b.right / b.total);
  const missed = all.filter((q) => !mine.get(q.id)?.correct);
  const name = (session.tests as unknown as { name: string }).name;

  return (
    <>
      <section>
        <p className="muted"><Link href={`/practice/${session.test_id}`}>{name}</Link> / Section {session.section_number}, {all[0]?.section_type}</p>
        <h1>{name} results</h1>
        <div className="stats">
          <div className="stat"><div className="value">{right} of {all.length}</div><div className="label">questions correct</div></div>
          <div className="stat"><div className="value">{pct(right, all.length)}%</div><div className="label">accuracy</div></div>
          <div className="stat"><div className="value">{all.length - mine.size}</div><div className="label">left unanswered</div></div>
          <div className="stat"><div className="value">{Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, "0")}</div><div className="label">time used</div></div>
        </div>
      </section>
      <section>
        <h2>By question type</h2>
        <div className="list">
          {byType.map((t) => (
            <div key={t.type} className="row">
              <div className="grow"><div className="title">{t.type}</div><div className="muted">{t.right} of {t.total} correct</div></div>
              <div className="progress"><span style={{ width: `${pct(t.right, t.total)}%` }} /></div>
              <div className="figure">{pct(t.right, t.total)}%</div>
            </div>
          ))}
        </div>
      </section>
      {missed.length > 0 && (
        <section>
          <h2>Questions to review</h2>
          <div className="list">
            {missed.map((q) => (
              <div key={q.id} className="row">
                <div className="grow">
                  <div className="title">Question {q.question_number}</div>
                  <div className="muted">{mine.get(q.id) ? `You chose ${mine.get(q.id)!.chosen}.` : "Not answered."} Correct answer {q.correct_answer}.</div>
                </div>
                <span className="tag">{q.question_type}</span>
              </div>
            ))}
          </div>
        </section>
      )}
      <section>
        <div className="actions">
          <Link className="btn primary" href={`/practice/${session.test_id}`}>Back to {name}</Link>
          <Link className="btn" href="/progress">See your progress</Link>
        </div>
      </section>
    </>
  );
}
