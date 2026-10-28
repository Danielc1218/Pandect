import Link from "next/link";
import { Tabs } from "@/components/Tabs";
import { drillHref, grade, pct, SECTIONS } from "@/lib/data";
import type { TypeStat } from "@/lib/ops";
import { op } from "@/lib/run";
import { describeType } from "@/lib/types";

export const metadata = { title: "Question types" };

function TypeList({ types }: { types: TypeStat[] }) {
  return (
    <div className="list">
      {types.map((t) => (
        <Link key={t.question_type} className="row" href={drillHref(t.section_type, t.question_type)}>
          <div className="grow">
            <div className="title">{t.question_type}</div>
            <div className="muted">{describeType(t.section_type, t.question_type)}</div>
            <div className="muted">{t.answered ? <>{t.answered} answered, <span className={`score ${grade(pct(t.correct, t.answered))}`}>{pct(t.correct, t.answered)}% correct</span>{t.answered > t.correct && ` · ${t.answered - t.correct} to review`}</> : "Not started"}</div>
          </div>
          {/* the bar is how much of the type you have done; the figure is how many questions it has */}
          <div className="progress" title={`${t.answered} of ${t.total} answered`}><span style={{ width: `${pct(t.answered, t.total)}%` }} /></div>
          <div className="figure">{t.total.toLocaleString()}</div>
        </Link>
      ))}
    </div>
  );
}

export default async function Types() {
  const types = await op("types");
  const of = (section: string) => types.filter((t) => t.section_type === section);
  const sum = (list: TypeStat[]) => list.reduce((n, t) => n + t.total, 0);
  const lr = of(SECTIONS.lr);
  const rc = of(SECTIONS.rc);
  // the suggested next drill: a type not yet started, else one not yet finished
  const next = types.find((t) => !t.answered) ?? types.find((t) => t.answered < t.total) ?? types[0];
  return (
    <section>
      <h1>Question types</h1>
      <p>Practice one kind of question at a time, untimed. Pick any type below, or start with the one we suggest.</p>
      {next && <div className="actions"><Link className="btn primary" href={drillHref(next.section_type, next.question_type)}>Drill {next.question_type} →</Link></div>}
      <div className="stats">
        <div className="stat"><div className="value">{sum(lr).toLocaleString()}</div><div className="label">Logical Reasoning questions</div></div>
        <div className="stat"><div className="value">{sum(rc).toLocaleString()}</div><div className="label">Reading Comprehension questions</div></div>
        <div className="stat"><div className="value">{types.length}</div><div className="label">question types</div></div>
      </div>
      <Tabs labels={[`${SECTIONS.lr} (${lr.length})`, `${SECTIONS.rc} (${rc.length})`]} label="Section">
        <TypeList types={lr} />
        <TypeList types={rc} />
      </Tabs>
    </section>
  );
}
