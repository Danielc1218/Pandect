import Link from "next/link";
import { notFound } from "next/navigation";
import { Drill } from "@/components/Drill";
import { Highlighter } from "@/components/Highlighter";
import { PassageText } from "@/components/PassageText";
import { QuestionList } from "@/components/QuestionList";
import { BANK_NAME, drillQuestion, typeQuestions } from "@/lib/bank";
import { drillHref, grade, pct, SECTIONS, type SectionKey } from "@/lib/data";
import { latestStatus, nextUnanswered } from "@/lib/questions";
import { requireUser } from "@/lib/supabase";
import { describeType } from "@/lib/types";

/** The tab says which type is being drilled, and whether it is the list or which question (the list is cached). */
export async function generateMetadata({ searchParams }: PageProps<"/drill">) {
  const { section, type, q } = await searchParams;
  if (!type) return { title: "Drill" };
  const n = q && SECTIONS[section as SectionKey] ? (await typeQuestions(SECTIONS[section as SectionKey], String(type))).find((r) => r.id === q)?.n : undefined;
  return { title: q ? `${type} question${n ? ` ${n}` : ""}` : `${type} questions` };
}

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
    db.from("attempts").select("question_id, correct, questions!inner(id)").eq("questions.section_type", section).eq("questions.question_type", type)
      .order("created_at", { ascending: false }).limit(1000),
  ]);
  if (!rows.length) notFound();
  const status = latestStatus(attempts ?? []);
  const ids = rows.map((r) => r.id);
  const answered = ids.filter((id) => status[id]).length;
  const solved = ids.filter((id) => status[id] === "solved").length;
  const base = drillHref(section, type);
  const q = params.q ? String(params.q) : undefined;
  const next = nextUnanswered(ids, status, q);
  // ?show=missed (or new, solved) opens the list with that filter, as the Progress page's links do
  const initialShow = (["new", "missed", "solved"] as const).find((s) => s === params.show);
  // keyed by the filter, so following a link that changes it starts the list afresh
  const list = <QuestionList key={initialShow ?? "all"} rows={rows} status={status} base={base} current={q} initialShow={initialShow} />;

  if (!q) {
    return (
      <section className="stack">
        <p className="muted crumbs"><Link href="/types">Question types</Link> / {section}</p>
        <h1>{type}</h1>
        {describeType(section, type) && <p>{describeType(section, type)}</p>}
        <p className="muted">
          {answered} of {rows.length} answered, {solved} solved{answered > 0 && <> (<span className={`score ${grade(pct(solved, answered))}`}>{pct(solved, answered)}%</span> of those answered)</>}
        </p>
        <div className="progress" style={{ maxWidth: 480 }}><span style={{ width: `${pct(answered, rows.length)}%` }} /></div>
        {!next && (
          <div className="panel tinted">
            <p>You have answered every {type} question.{answered > solved ? " The missed ones are worth another look." : ""}</p>
          </div>
        )}
        <div className="actions">
          {next && <Link className="btn primary" href={`${base}&q=${next}`}>{answered ? `Continue with question ${rows.find((r) => r.id === next)?.n}` : "Start with question 1"}</Link>}
          {!next && answered > solved && <Link className="btn primary" href={`${base}&show=missed`}>Review missed questions</Link>}
          <Link className="btn" href="/types">Back to question types</Link>
        </div>
        {list}
      </section>
    );
  }

  const row = rows.find((r) => r.id === q);
  const question = row && (await drillQuestion(q));
  if (!question) notFound();

  // Neighbors in list order, answered or not, for stepping through the list without answering.
  const at = ids.indexOf(q);
  const prev = ids[at - 1], after = ids[at + 1];
  return (
    <section>
      <p className="muted crumbs"><Link href="/types">Question types</Link> / {section} / <Link href={base}>{type}</Link> / Question {row.n}</p>
      <div className="actions spread" style={{ alignItems: "center" }}>
        <h1>{type}</h1>
        <nav className="actions" aria-label="Neighboring questions">
          <Highlighter key={question.id} />
          {prev ? <Link className="btn" href={`${base}&q=${prev}`} aria-keyshortcuts="ArrowLeft">← Previous</Link> : <span className="btn" aria-disabled="true">← Previous</span>}
          {after ? <Link className="btn" href={`${base}&q=${after}`} aria-keyshortcuts="ArrowRight">Skip →</Link> : <span className="btn" aria-disabled="true">Skip →</span>}
        </nav>
      </div>
      {/* A Reading Comprehension question sits beside its passage, which scrolls on its own */}
      <div className={question.passage ? "drill-reader" : undefined}>
        {question.passage && <article className="passage"><PassageText text={question.passage} /></article>}
        {/* key remounts the question so selections reset when another one loads */}
        <Drill key={question.id} question={{ ...question, sourceHref: BANK_NAME === "other" ? `/practice/${question.testId}` : undefined }} type={type} number={row.n} answered={answered} total={rows.length} listHref={base} nextHref={next && `${base}&q=${next}`}
          prevHref={prev && `${base}&q=${prev}`} skipHref={after && `${base}&q=${after}`} before={status[q]}>
          {list}
        </Drill>
      </div>
    </section>
  );
}
