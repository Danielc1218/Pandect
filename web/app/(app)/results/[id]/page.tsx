import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Choices } from "@/components/Choices";
import { pct } from "@/lib/data";
import { SESSION_FIELDS, sessionAnswerKey, sessionHome, sessionLabel, sessionQuestions, type Session } from "@/lib/sessions";
import { requireUser } from "@/lib/supabase";
import { sectionMinutes } from "@/lib/timing";

export const metadata = { title: "Results" };

type Key = Awaited<ReturnType<typeof sessionAnswerKey>>[number];
type Text = Awaited<ReturnType<typeof sessionQuestions>>["questions"][number];

/** A missed question as a row that opens to the question itself, the marked answers and the reasoning. */
function ReviewRow({ q, text, passages, chosen }: { q: Key; text?: Text; passages: string[]; chosen: string | null }) {
  return (
    <details className="review">
      <summary className="row">
        <div className="grow">
          <div className="title">Question {q.number}</div>
          <div className="muted">{chosen ? `You chose ${chosen}.` : "Not answered."} Correct answer {q.correct_answer}.</div>
        </div>
        <span className="tag">{q.question_type}</span>
      </summary>
      {text && (
        <div className="body">
          {text.passage !== null && (
            <details><summary>Read the passage</summary>{passages[text.passage].split(/\n\s*\n/).map((p, i) => <p key={i}>{p}</p>)}</details>
          )}
          {text.stimulus && <p>{text.stimulus}</p>}
          <h3>{text.prompt}</h3>
          <Choices options={text.options} selected={chosen} result={{ correctAnswer: q.correct_answer }} />
          <div className="explain">
            <strong>Reasoning</strong>
            <p>{q.explanation ?? "No written reasoning for this question yet."}</p>
          </div>
        </div>
      )}
    </details>
  );
}

export default async function Results({ params }: PageProps<"/results/[id]">) {
  const { id } = await params;
  const { db } = await requireUser();
  const { data } = await db.from("test_sessions").select(SESSION_FIELDS).eq("id", id).maybeSingle();
  const session = data as unknown as Session | null;
  if (!session) notFound();
  if (!session.finished_at) redirect(`/section/${id}`);

  const [all, section, { data: attempts }] = await Promise.all([
    sessionAnswerKey(db, id),
    sessionQuestions(db, id),
    db.from("attempts").select("question_id, chosen, correct").eq("session_id", id),
  ]);
  const text = new Map(section.questions.map((q) => [q.id, q]));
  const mine = new Map((attempts ?? []).map((a) => [a.question_id, a]));
  // The score the database stored when the section was finished: the user's history of this sitting.
  const right = session.score_correct ?? all.filter((q) => mine.get(q.id)?.correct).length;
  const seconds = Math.round((new Date(session.finished_at).getTime() - new Date(session.started_at).getTime()) / 1000);
  const over = seconds - sectionMinutes(all.length) * 60;
  const byType = Object.entries(Object.groupBy(all, (q) => q.question_type))
    .map(([type, qs]) => ({ type, total: qs!.length, right: qs!.filter((q) => mine.get(q.id)?.correct).length }))
    .sort((a, b) => a.right / a.total - b.right / b.total);
  const missed = all.filter((q) => !mine.get(q.id)?.correct);
  const label = sessionLabel(session);
  const home = sessionHome(session);

  return (
    <>
      <section>
        <p className="muted"><Link href={home}>{label.title}</Link> / {label.subtitle}</p>
        <h1>{label.title} results</h1>
        <div className="stats">
          <div className="stat"><div className="value">{right} of {all.length}</div><div className="label">questions correct</div></div>
          <div className="stat"><div className="value">{pct(right, all.length)}%</div><div className="label">accuracy</div></div>
          <div className="stat"><div className="value">{all.length - mine.size}</div><div className="label">left unanswered</div></div>
          <div className="stat"><div className="value">{Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, "0")}</div><div className="label">{over > 0 ? `time used, ${Math.floor(over / 60)}:${String(over % 60).padStart(2, "0")} over the limit` : "time used"}</div></div>
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
              <ReviewRow key={q.id} q={q} text={text.get(q.id)} passages={section.passages} chosen={mine.get(q.id)?.chosen ?? null} />
            ))}
          </div>
        </section>
      )}
      <section>
        <div className="actions">
          <Link className="btn primary" href={home}>{session.kind === "random" ? "Start another section" : `Back to ${label.title}`}</Link>
          <Link className="btn" href="/progress">See your progress</Link>
        </div>
      </section>
    </>
  );
}
