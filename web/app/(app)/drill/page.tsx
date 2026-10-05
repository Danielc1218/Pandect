import Link from "next/link";
import { notFound } from "next/navigation";
import { Drill } from "@/components/Drill";
import { SECTIONS, typeStats, type SectionKey } from "@/lib/data";
import { requireUser } from "@/lib/supabase";

export const metadata = { title: "Drill" };

export default async function DrillPage({ searchParams }: PageProps<"/drill">) {
  const params = await searchParams;
  const section = SECTIONS[params.section as SectionKey];
  const type = String(params.type ?? "");
  if (!section || !type) notFound();

  const { db } = await requireUser();
  const [{ data: id }, types] = await Promise.all([db.rpc("next_question", { p_section: section, p_type: type }), typeStats(db)]);
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
  const { data: q } = await db
    .from("questions")
    .select("id, stimulus, prompt, options, section_number, question_number, tests(name), passages(passage_text)")
    .eq("id", id)
    .single();
  if (!q) notFound();
  const test = q.tests as unknown as { name: string };
  const passage = q.passages as unknown as { passage_text: string } | null;
  const question = { id: q.id, stimulus: q.stimulus, prompt: q.prompt, options: q.options, source: `${test.name}, section ${q.section_number}, question ${q.question_number}` };

  return (
    <section>
      <h1>{type}</h1>
      {passage && <article className="passage">{passage.passage_text.split(/\n\s*\n/).map((p, i) => <p key={i}>{p}</p>)}</article>}
      {/* key remounts the question so selections reset when the next one loads */}
      <Drill key={q.id} question={question} type={type} answered={stat.answered} total={stat.total} />
    </section>
  );
}
