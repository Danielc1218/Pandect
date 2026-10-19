import Link from "next/link";
import { notFound } from "next/navigation";
import { Drill } from "@/components/Drill";
import { QuestionList } from "@/components/QuestionList";
import { drillQuestion, typeQuestions } from "@/lib/bank";
import { drillHref, SECTIONS, type SectionKey } from "@/lib/data";
import { latestStatus, nextUnanswered } from "@/lib/questions";
import { requireUser } from "@/lib/supabase";
import { typeset } from "@/lib/text";

export const metadata = { title: "Drill" };

/** Without `q` this is the type's question list; with `q` it is that question, with the list in a popup. */
export default async function DrillPage({ searchParams }: PageProps<"/drill">) {
  const params = await searchParams;
  const section = SECTIONS[params.section as SectionKey];
  const type = String(params.type ?? "");
  if (!section || !type) notFound();

  const { db } = await requireUser();
  // Reads the user's newest 1,000 attempts at this type; move to a SQL view if anyone passes that.
  const [rows, { data: attempts }] = await Promise.all([
    typeQuestions(section, type),
    db.from("attempts").select("question_id, correct, questions!inner()").eq("questions.section_type", section).eq("questions.question_type", type)
      .order("created_at", { ascending: false }).limit(1000),
  ]);
  if (!rows.length) notFound();
  const status = latestStatus(attempts ?? []);
  const ids = rows.map((r) => r.id);
  const answered = ids.filter((id) => status[id]).length;
  const base = drillHref(section, type);
  const q = params.q ? String(params.q) : undefined;
  const next = nextUnanswered(ids, status, q);
  const list = <QuestionList rows={rows} status={status} base={base} current={q} />;

  if (!q) {
    return (
      <section className="stack">
        <h1>{type}</h1>
        <p className="muted">{answered} of {rows.length} answered, {ids.filter((id) => status[id] === "solved").length} solved</p>
        <div className="actions">
          {next && <Link className="btn primary" href={`${base}&q=${next}`}>{answered ? "Continue" : "Start"}</Link>}
          <Link className="btn" href="/types">Back to question types</Link>
        </div>
        {list}
      </section>
    );
  }

  const row = rows.find((r) => r.id === q);
  const question = row && (await drillQuestion(q));
  if (!question) notFound();

  return (
    <section>
      <h1>{type}</h1>
      {question.passage && <article className="passage">{question.passage.split(/\n\s*\n/).map((p, i) => <p key={i}>{typeset(p)}</p>)}</article>}
      {/* key remounts the question so selections reset when another one loads */}
      <Drill key={question.id} question={question} type={type} number={row.n} answered={answered} total={rows.length} listHref={base} nextHref={next && `${base}&q=${next}`}>
        {list}
      </Drill>
    </section>
  );
}
