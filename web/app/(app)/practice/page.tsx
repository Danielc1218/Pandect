import Link from "next/link";
import { Tabs } from "@/components/Tabs";
import { allSections, allTests } from "@/lib/bank";
import { testNumber } from "@/lib/data";
import { requireUser } from "@/lib/supabase";

export const metadata = { title: "Practice tests" };

type Row = { id: string; name: string; year: number | null; sections: number; done: number; started: boolean };

function TestList({ tests }: { tests: Row[] }) {
  if (!tests.length) return <div className="panel"><p>No tests here yet.</p></div>;
  return (
    <div className="list">
      {tests.map((t) => (
        <Link key={t.id} className="row" href={`/practice/${t.id}`}>
          <div className="grow">
            <div className="title">{t.name}</div>
            <div className="muted">{t.year ? `${t.year}, ` : ""}{t.sections} sections</div>
          </div>
          <span className="tag">{t.done >= t.sections ? "Completed" : t.started ? "In progress" : "Not started"}</span>
          <div className="figure">{t.done} of {t.sections}</div>
        </Link>
      ))}
    </div>
  );
}

export default async function Practice() {
  const { db } = await requireUser();
  const [tests, sections, { data: sessions }] = await Promise.all([
    allTests(),
    allSections(),
    db.from("test_sessions").select("test_id, section_number, finished_at"),
  ]);
  const rows: Row[] = tests
    .map((t) => {
      const mine = (sessions ?? []).filter((s) => s.test_id === t.id);
      return {
        ...t,
        sections: sections.filter((s) => s.test_id === t.id).length,
        done: new Set(mine.filter((s) => s.finished_at).map((s) => s.section_number)).size,
        started: mine.length > 0,
      };
    })
    .sort((a, b) => testNumber(b.id) - testNumber(a.id));
  const started = rows.filter((t) => t.started && t.done < t.sections);
  return (
    <section>
      <h1>Practice tests</h1>
      <Tabs labels={["All", "In progress", "Completed"]} label="Filter practice tests">
        <TestList tests={rows} />
        <TestList tests={started} />
        <TestList tests={rows.filter((t) => t.done >= t.sections)} />
      </Tabs>
    </section>
  );
}
