import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Choices } from "@/components/Choices";
import { ExpandAll } from "@/components/ExpandAll";
import { PassageText } from "@/components/PassageText";
import { SubmitButton } from "@/components/SubmitButton";
import { Tabs } from "@/components/Tabs";
import { startSection } from "@/lib/actions";
import { allSections, BANK_NAME } from "@/lib/bank";
import { drillHref, formatDay, grade, pct } from "@/lib/data";
import { canStartSection } from "@/lib/practiceTests";
import { sanitize } from "@/lib/prefs";
import { sessionAnswerKey } from "@/lib/answerKey";
import { SESSION_FIELDS, sessionHome, sessionLabel, sessionQuestions, type Session } from "@/lib/sessions";
import { requireUser } from "@/lib/supabase";
import { typeset } from "@/lib/text";
import { sectionMinutes } from "@/lib/timing";

/** The tab names the sitting and its score, so several open results can be told apart. */
export async function generateMetadata({ params }: PageProps<"/results/[id]">) {
  const { id } = await params;
  const { db } = await requireUser();
  const { data } = await db.from("test_sessions").select(SESSION_FIELDS).eq("id", id).maybeSingle();
  const s = data as unknown as Session | null;
  return { title: s ? `${sessionLabel(s).title} results${s.score_total ? `, ${s.score_correct} of ${s.score_total}` : ""}` : "Results" };
}

type Key = Awaited<ReturnType<typeof sessionAnswerKey>>[number];
type Text = Awaited<ReturnType<typeof sessionQuestions>>["questions"][number];

/** A missed question as a row that opens to the question itself, the marked answers and the reasoning. */
function ReviewRow({ q, text, passages, chosen }: { q: Key; text?: Text; passages: string[]; chosen: string | null }) {
  return (
    <details className="review">
      <summary className="row" data-status={!chosen ? "blank" : chosen === q.correct_answer ? "solved" : "missed"}>
        <div className="grow">
          <div className="title">Question {q.number}</div>
          <div className="muted">{chosen === q.correct_answer ? `Correct. You chose ${chosen}.` : `${chosen ? `You chose ${chosen}.` : "Not answered."} Correct answer ${q.correct_answer}.`}</div>
        </div>
        <span className="tag">{q.question_type}</span>
      </summary>
      {text && (
        <div className="body">
          {text.passage !== null && (
            <details><summary>Read the passage</summary><PassageText text={passages[text.passage]} /></details>
          )}
          {text.stimulus && <p>{typeset(text.stimulus)}</p>}
          <h3>{typeset(text.prompt)}</h3>
          <Choices options={text.options} selected={chosen} result={{ correctAnswer: q.correct_answer }} />
          <div className="explain">
            <strong>Reasoning</strong>
            <p>{q.explanation ? typeset(q.explanation) : "No written reasoning for this question yet."}</p>
          </div>
          <p><Link href={drillHref(q.section_type, q.question_type)}>Drill more {q.question_type} questions</Link></p>
        </div>
      )}
    </details>
  );
}

export default async function Results({ params }: PageProps<"/results/[id]">) {
  const { id } = await params;
  const { db, user } = await requireUser();
  const { data } = await db.from("test_sessions").select(SESSION_FIELDS).eq("id", id).maybeSingle();
  const session = data as unknown as Session | null;
  if (!session) notFound();
  if (!session.finished_at) redirect(`/section/${id}`);

  const [all, section, { data: attempts }, { data: profile }, sections] = await Promise.all([
    sessionAnswerKey(db, id),
    sessionQuestions(db, id),
    db.from("attempts").select("question_id, chosen, correct").eq("session_id", id),
    db.from("profiles").select("preferences").eq("id", user.id).maybeSingle(),
    allSections(),
  ]);
  const text = new Map(section.questions.map((q) => [q.id, q]));
  const mine = new Map((attempts ?? []).map((a) => [a.question_id, a]));
  // The score the database stored when the section was finished: the user's history of this sitting.
  const right = session.score_correct ?? all.filter((q) => mine.get(q.id)?.correct).length;
  const seconds = Math.round((new Date(session.finished_at).getTime() - new Date(session.started_at).getTime()) / 1000) - session.paused_seconds;
  const perQuestion = Math.round(seconds / Math.max(1, all.length));
  // Today's extended-time setting, not the one in force during the sitting; store it on test_sessions if that matters
  const allowed = Math.round(sectionMinutes(all.length) * sanitize(profile?.preferences).extraTime * 60);
  const over = seconds - allowed;
  const pace = Math.floor(allowed / Math.max(1, all.length)); // the time per question that just fits the limit
  const byType = Object.entries(Object.groupBy(all, (q) => q.question_type))
    .map(([type, qs]) => ({ type, section: qs![0].section_type, total: qs!.length, right: qs!.filter((q) => mine.get(q.id)?.correct).length }))
    .sort((a, b) => a.right / a.total - b.right / b.total);
  const missed = all.filter((q) => !mine.get(q.id)?.correct);
  const label = sessionLabel(session);
  const home = sessionHome(session);

  return (
    <>
      <section>
        <p className="muted"><Link href={home}>{label.title}</Link> / {label.subtitle}</p>
        <h1>{label.title} results</h1>
        <p className="muted">{label.subtitle}, finished {formatDay(session.finished_at)}</p>
        <div className="stats">
          <div className="stat"><div className="value">{right} of {all.length}</div><div className="label">questions correct</div></div>
          <div className="stat"><div className={`value ${grade(pct(right, all.length))}`}>{pct(right, all.length)}%</div><div className="label">accuracy</div></div>
          <div className="stat"><div className={`value${all.length > mine.size ? " poor" : ""}`}>{all.length - mine.size}</div><div className="label">left unanswered</div></div>
          <div className="stat"><div className="value">{Math.floor(perQuestion / 60)}:{String(perQuestion % 60).padStart(2, "0")}</div><div className="label" title="The time per question that just fits the limit">a question on average, pace {Math.floor(pace / 60)}:{String(pace % 60).padStart(2, "0")}</div></div>
          <div className="stat"><div className="value">{Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, "0")}</div><div className="label">{over > 0 ? `time used, ${Math.floor(over / 60)}:${String(over % 60).padStart(2, "0")} over the limit` : "time used"}</div></div>
        </div>
      </section>
      <section>
        <h2>By question type</h2>
        <div className="list">
          {byType.map((t) => (
            // each type leads to its drill, opened on the questions of that type you have missed, if any
            <Link key={t.type} className="row" href={drillHref(t.section, t.type) + (t.right < t.total ? "&show=missed" : "")} title={t.right < t.total ? `Your missed ${t.type} questions` : `Drill ${t.type}`}>
              <div className="grow"><div className="title">{t.type}</div><div className="muted">{t.right} of {t.total} correct</div></div>
              <div className={`progress ${grade(pct(t.right, t.total))}`}><span style={{ width: `${pct(t.right, t.total)}%` }} /></div>
              <div className="figure">{pct(t.right, t.total)}%</div>
            </Link>
          ))}
        </div>
      </section>
      <section>
        <div className="actions spread" style={{ alignItems: "center" }}><h2>Review</h2><ExpandAll /></div>
        {/* the missed ones first; every question is one tab away */}
        <Tabs labels={[`Missed (${missed.length})`, `All questions (${all.length})`]} label="Questions to review" initial={missed.length ? 0 : 1}>
          {[missed, all].map((list, i) => list.length ? (
            <div key={i} className="list">
              {list.map((q) => (
                <ReviewRow key={q.id} q={q} text={text.get(q.id)} passages={section.passages} chosen={mine.get(q.id)?.chosen ?? null} />
              ))}
            </div>
          ) : <div key={i} className="panel"><p>Nothing missed. You got every question right.</p></div>)}
        </Tabs>
      </section>
      <section>
        <div className="actions">
          <Link className="btn primary" href={home}>{session.kind === "random" ? "Start another section" : `Back to ${label.title}`}</Link>
          {session.kind === "fixed" && session.test_id && canStartSection(sections, BANK_NAME, session.test_id, session.section_number ?? 0) && (
            <form action={startSection}>
              <input type="hidden" name="test_id" value={session.test_id} />
              <input type="hidden" name="section_number" value={session.section_number ?? ""} />
              <SubmitButton className="btn" busy="Starting…">Retake this section</SubmitButton>
            </form>
          )}
          <Link className="btn" href="/progress">See your progress</Link>
        </div>
      </section>
    </>
  );
}
