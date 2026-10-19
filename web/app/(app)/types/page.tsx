import Link from "next/link";
import { Tabs } from "@/components/Tabs";
import { drillHref, pct, SECTIONS, typeStats, type TypeStat } from "@/lib/data";
import { requireUser } from "@/lib/supabase";

export const metadata = { title: "Question types" };

function TypeList({ types }: { types: TypeStat[] }) {
  return (
    <div className="list">
      {types.map((t) => (
        <Link key={t.question_type} className="row" href={drillHref(t.section_type, t.question_type)}>
          <div className="grow">
            <div className="title">{t.question_type}</div>
            <div className="muted">{t.answered ? `${t.answered} answered, ${pct(t.correct, t.answered)}% correct` : "Not started"}</div>
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
  const { db } = await requireUser();
  const types = await typeStats(db);
  const of = (section: string) => types.filter((t) => t.section_type === section);
  const sum = (list: TypeStat[]) => list.reduce((n, t) => n + t.total, 0);
  const lr = of(SECTIONS.lr);
  const rc = of(SECTIONS.rc);
  return (
    <section>
      <h1>Question types</h1>
      <div className="stats">
        <div className="stat"><div className="value">{sum(lr).toLocaleString()}</div><div className="label">Logical Reasoning questions</div></div>
        <div className="stat"><div className="value">{sum(rc).toLocaleString()}</div><div className="label">Reading Comprehension questions</div></div>
        <div className="stat"><div className="value">{types.length}</div><div className="label">question types</div></div>
      </div>
      <Tabs labels={[SECTIONS.lr, SECTIONS.rc]} label="Section">
        <TypeList types={lr} />
        <TypeList types={rc} />
      </Tabs>
    </section>
  );
}
