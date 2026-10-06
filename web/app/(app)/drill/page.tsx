import Link from "next/link";
import { notFound } from "next/navigation";
import { Drill } from "@/components/Drill";
import { BANK_NAME, drillQuestion } from "@/lib/bank";
import { SECTIONS, typeStats, type SectionKey } from "@/lib/data";
import { requireUser } from "@/lib/supabase";

export const metadata = { title: "Drill" };

export default async function DrillPage({ searchParams }: PageProps<"/drill">) {
  const params = await searchParams;
  const section = SECTIONS[params.section as SectionKey];
  const type = String(params.type ?? "");
  if (!section || !type) notFound();

  const { db } = await requireUser();
  const [{ data: id }, types] = await Promise.all([db.rpc("next_question", { p_section: section, p_type: type, p_bank: BANK_NAME }), typeStats(db)]);
  const stat = types.find((t) => t.section_type === section && t.question_type === type);
  if (!stat) notFound();

  if (!id) {
    return (
      <section>
        <h1>{type}</h1>
        <div className="panel">
          <h3>You have answered every {type} question.</h3>
          <div className="actions"><Link className="btn primary" href="/types">Choose another type</Link></div>
        </div>
      </section>
    );
  }
  const question = await drillQuestion(id);
  if (!question) notFound();

  return (
    <section>
      <h1>{type}</h1>
      {question.passage && <article className="passage">{question.passage.split(/\n\s*\n/).map((p, i) => <p key={i}>{p}</p>)}</article>}
      {/* key remounts the question so selections reset when the next one loads */}
      <Drill key={question.id} question={question} type={type} answered={stat.answered} total={stat.total} />
    </section>
  );
}
