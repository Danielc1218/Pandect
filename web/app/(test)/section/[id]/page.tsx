import { notFound, redirect } from "next/navigation";
import { SectionRunner } from "@/components/SectionRunner";
import { requireUser } from "@/lib/supabase";

export const metadata = { title: "Timed section" };

export default async function SectionPage({ params }: PageProps<"/section/[id]">) {
  const { id } = await params;
  const { db } = await requireUser();
  const { data: session } = await db.from("test_sessions").select("id, test_id, section_number, started_at, finished_at, tests(name)").eq("id", id).maybeSingle();
  if (!session) notFound();
  if (session.finished_at) redirect(`/results/${id}`);

  const [{ data: questions }, { data: attempts }] = await Promise.all([
    db.from("questions")
      .select("id, question_number, section_type, stimulus, prompt, options, passage_id")
      .eq("test_id", session.test_id).eq("section_number", session.section_number).order("question_number"),
    db.from("attempts").select("question_id, chosen").eq("session_id", id),
  ]);
  if (!questions?.length) notFound();
  const passageIds = [...new Set(questions.map((q) => q.passage_id).filter(Boolean))] as string[];
  const { data: passages } = passageIds.length ? await db.from("passages").select("id, passage_text").in("id", passageIds) : { data: [] };
  const text = (pid: string) => passages?.find((p) => p.id === pid)?.passage_text ?? "";

  return (
    <SectionRunner
      sessionId={id}
      title={(session.tests as unknown as { name: string }).name}
      subtitle={`Section ${session.section_number}, ${questions[0].section_type}`}
      startedAt={session.started_at}
      passages={passageIds.map(text)}
      saved={Object.fromEntries((attempts ?? []).map((a) => [a.question_id, a.chosen]))}
      questions={questions.map((q) => ({
        id: q.id, number: q.question_number, stimulus: q.stimulus, prompt: q.prompt, options: q.options,
        passage: q.passage_id ? passageIds.indexOf(q.passage_id) : null,
      }))}
    />
  );
}
