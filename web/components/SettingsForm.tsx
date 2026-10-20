"use client";

import { useActionState } from "react";
import { saveProfile, saveSettings, type SettingsState } from "@/lib/actions";

/** Today as yyyy-mm-dd, the earliest test date the date pickers offer. */
export const today = () => new Date().toISOString().slice(0, 10);

type Profile = { target_score: number | null; curr_score: number | null; test_date: string | null; weekly_goal: number };

/** The learner's goals: scores, test date and weekly target. Shown on the profile page. */
export function SettingsForm({ profile }: { profile: Profile }) {
  const [state, action, pending] = useActionState<SettingsState, FormData>(saveSettings, {});
  return (
    <form className="panel stack" action={action}>
      <h2>Goal</h2>
      <div className="field">
        <label htmlFor="target-score">Target score</label>
        <input id="target-score" name="target_score" type="number" inputMode="numeric" min={120} max={180} defaultValue={profile.target_score ?? ""} aria-describedby="score-hint" />
      </div>
      <div className="field"><label htmlFor="curr-score">Latest official or practice score</label><input id="curr-score" name="curr_score" type="number" inputMode="numeric" min={120} max={180} defaultValue={profile.curr_score ?? ""} aria-describedby="score-hint" />
        <p className="hint" id="score-hint">Scores run from 120 to 180. Leave either blank if you don&rsquo;t know it yet.</p>
      </div>
      <div className="field"><label htmlFor="test-date">Test date</label><input id="test-date" name="test_date" type="date" defaultValue={profile.test_date ?? ""} min={[today(), profile.test_date ?? ""].sort()[0] || today()} /></div>
      <div className="field">
        <label htmlFor="weekly-goal">Weekly goal</label>
        <select id="weekly-goal" name="weekly_goal" defaultValue={profile.weekly_goal}>{/* a goal set some other way stays on the list, so saving doesn't change it */}
          {[...new Set([20, 40, 60, 100, profile.weekly_goal])].sort((a, b) => a - b).map((n) => <option key={n} value={n}>{n} questions</option>)}</select>
      </div>
      {state.error && <p className="field invalid" role="alert"><span className="hint">{state.error}</span></p>}
      {state.saved && <p role="status">Saved.</p>}
      <div className="actions"><button className="btn primary" disabled={pending} aria-busy={pending}>{pending ? "Saving…" : "Save changes"}</button></div>
    </form>
  );
}

export function ProfileForm({ name }: { name: string }) {
  const [state, action, pending] = useActionState<SettingsState, FormData>(saveProfile, {});
  return (
    <form className="panel stack" action={action}>
      <div className="field"><label htmlFor="display-name">Display name</label><input id="display-name" name="display_name" type="text" autoComplete="nickname" maxLength={50} defaultValue={name} required /></div>
      {state.error && <p className="field invalid" role="alert"><span className="hint">{state.error}</span></p>}
      {state.saved && <p role="status">Saved.</p>}
      <div className="actions"><button className="btn primary" disabled={pending} aria-busy={pending}>{pending ? "Saving…" : "Save changes"}</button></div>
    </form>
  );
}
