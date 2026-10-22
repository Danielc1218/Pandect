// Browser version of web/lib/actions.ts. Grading needs the answer files, so answer and saveAnswer call the Pages
// Functions. The rest are web's own actions (their op() is the Pages Function call here, and their revalidatePath
// refreshes the page and Root), with the redirect they may end with followed through the router.
import * as web from "@/lib/actions";
import { follow } from "./auth";
import { api } from "./supabase";

export type { SettingsState } from "@/lib/actions";

/** POSTs JSON to a grading Function as the signed-in user; throws on any non-2xx, as the server action would. */
async function post<T>(path: string, body: object): Promise<T> {
  const result = await api<T>(path, body);
  if (result === null) throw new Error("That question is not available.");
  return result;
}

/** Records a drill answer. The Function grades it; the correct letter is only returned afterwards. */
export const answer = follow((questionId: string, chosen: string) =>
  post<Awaited<ReturnType<typeof web.answer>>>("/api/answer", { questionId, chosen }));

/** Saves or changes one answer in a timed section. */
export const saveAnswer = follow(async (sessionId: string, questionId: string, chosen: string) => {
  await post("/api/section-answer", { sessionId, questionId, chosen });
});

export const startSection = follow(web.startSection);
export const startRandomSection = follow(web.startRandomSection);
export const pauseSection = follow(web.pauseSection);
export const resumeSection = follow(web.resumeSection);
export const finishSection = follow(web.finishSection);
export const saveSettings = follow(web.saveSettings);
export const saveProfile = follow(web.saveProfile);
export const savePreferences = follow(web.savePreferences);
