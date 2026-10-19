"use client";

import { useActionState } from "react";
import { saveProfile, saveSettings, type SettingsState } from "@/lib/actions";

type Profile = { target_score: number | null; curr_score: number | null; test_date: string | null; weekly_goal: number };

/** The learner's goals: scores, test date and weekly target. Shown on the profile page. */
export function SettingsForm({ profile }: { profile: Profile }) {
  const [state, action, pending] = useActionState<SettingsState, FormData>(saveSettings, {});
  return (
    <form className="panel stack" action={action}>
      <h2>Goal</h2>
      <div className="field">
        <label htmlFor="target-score">Target score</label>
        <input id="target-score" name="target_score" type="number" min={120} max={180} defaultValue={profile.target_score ?? ""} />
      </div>
      <div className="field"><label htmlFor="curr-score">Latest official or practice score</label><input id="curr-score" name="curr_score" type="number" min={120} max={180} defaultValue={profile.curr_score ?? ""} /></div>
      <div className="field"><label htmlFor="test-date">Test date</label><input id="test-date" name="test_date" type="date" defaultValue={profile.test_date ?? ""} /></div>
      <div className="field">
        <label htmlFor="weekly-goal">Weekly goal</label>
        <select id="weekly-goal" name="weekly_goal" defaultValue={profile.weekly_goal}>{[20, 40, 60, 100].map((n) => <option key={n} value={n}>{n} questions</option>)}</select>
      </div>
      {state.error && <p className="field invalid" role="alert"><span className="hint">{state.error}</span></p>}
      {state.saved && <p role="status">Saved.</p>}
      <div className="actions"><button className="btn primary" disabled={pending}>Save changes</button></div>
    </form>
  );
}

export function ProfileForm({ name }: { name: string }) {
  const [state, action, pending] = useActionState<SettingsState, FormData>(saveProfile, {});
  return (
    <form className="panel stack" action={action}>
      <div className="field"><label htmlFor="display-name">Display name</label><input id="display-name" name="display_name" type="text" defaultValue={name} required /></div>
      {state.error && <p className="field invalid" role="alert"><span className="hint">{state.error}</span></p>}
      {state.saved && <p role="status">Saved.</p>}
      <div className="actions"><button className="btn primary" disabled={pending}>Save changes</button></div>
    </form>
  );
}
