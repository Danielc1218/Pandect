import { notFound, redirect } from "next/navigation";
import { SectionRunner } from "@/components/SectionRunner";
import { SESSION_FIELDS, sessionHome, sessionLabel, sessionQuestions, type Session } from "@/lib/sessions";
import { requireUser } from "@/lib/supabase";

export const metadata = { title: "Timed section" };

export default async function SectionPage({ params }: PageProps<"/section/[id]">) {
  const { id } = await params;
  const { db } = await requireUser();
  const [{ data }, section, { data: attempts }] = await Promise.all([
    db.from("test_sessions").select(SESSION_FIELDS).eq("id", id).maybeSingle(),
    sessionQuestions(db, id),
    db.from("attempts").select("question_id, chosen").eq("session_id", id),
  ]);
  const session = data as unknown as Session | null;
  if (!session) notFound();
  if (session.finished_at) redirect(`/results/${id}`);
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
      saved={Object.fromEntries((attempts ?? []).map((a) => [a.question_id, a.chosen]))}
      questions={section.questions}
    />
  );
}
