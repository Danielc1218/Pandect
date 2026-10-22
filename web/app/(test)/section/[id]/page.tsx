import { notFound, redirect } from "next/navigation";
import { SectionRunner } from "@/components/SectionRunner";
import { op } from "@/lib/run";
import { sessionHome, sessionLabel } from "@/lib/sessions";
import { sessionQuestions } from "@/lib/wording";

export const metadata = { title: "Timed section" };

export default async function SectionPage({ params }: PageProps<"/section/[id]">) {
  const { id } = await params;
  const { session, questions, saved } = await op("section", id);
  if (!session) notFound();
  if (session.finished_at) redirect(`/results/${id}`);
  const section = await sessionQuestions(questions);
  if (!section.questions.length) notFound();
  const label = sessionLabel(session);

  return (
    <SectionRunner
      sessionId={id}
      title={label.title}
      subtitle={label.subtitle}
      startedAt={session.started_at}
      pausedAt={session.paused_at}
      pausedSeconds={session.paused_seconds}
      exitHref={sessionHome(session)}
      passages={section.passages}
      saved={saved}
      questions={section.questions}
    />
  );
}
