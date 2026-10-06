import { notFound, redirect } from "next/navigation";
import { SectionRunner } from "@/components/SectionRunner";
import { sectionQuestions } from "@/lib/bank";
import { requireUser } from "@/lib/supabase";

export const metadata = { title: "Timed section" };

export default async function SectionPage({ params }: PageProps<"/section/[id]">) {
  const { id } = await params;
  const { db } = await requireUser();
  const { data: session } = await db.from("test_sessions").select("id, test_id, section_number, started_at, finished_at, tests(name)").eq("id", id).maybeSingle();
  if (!session) notFound();
  if (session.finished_at) redirect(`/results/${id}`);

  const [section, { data: attempts }] = await Promise.all([
    sectionQuestions(session.test_id, session.section_number),
    db.from("attempts").select("question_id, chosen").eq("session_id", id),
  ]);
  if (!section.questions.length) notFound();

  return (
    <SectionRunner
      sessionId={id}
      title={(session.tests as unknown as { name: string }).name}
      subtitle={`Section ${session.section_number}, ${section.sectionType}`}
      startedAt={session.started_at}
      passages={section.passages}
      saved={Object.fromEntries((attempts ?? []).map((a) => [a.question_id, a.chosen]))}
      questions={section.questions}
    />
  );
}
