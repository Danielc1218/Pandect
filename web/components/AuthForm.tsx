"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { logIn, signUp, type AuthState } from "@/lib/auth";
import { today } from "./SettingsForm";
import { Mascot } from "./Mascot";

/** `next` is the page a signed-out visitor asked for, where logging in takes them. */
export function AuthForm({ mode, next }: { mode: "signup" | "login"; next?: string }) {
  const [state, action, pending] = useActionState<AuthState, FormData>(mode === "signup" ? signUp : logIn, {});
  const signup = mode === "signup";
  const [reveal, setReveal] = useState(false);
  const [length, setLength] = useState(0); // the password's length, for the sign-up hint
  const [caps, setCaps] = useState(false); // Caps Lock on while typing the password
  const watchCaps = (e: React.KeyboardEvent) => setCaps(e.getModifierState("CapsLock"));
  return (
    <section className="auth">
      <div className="panel">
        <Mascot animation="wave" className="mascot-welcome" />
        <h1>{signup ? "Create your account" : "Log in"}</h1>
        <form className="stack" action={action}>
          {next && <input type="hidden" name="next" value={next} />}
          {state.error && <p className="field invalid" role="alert"><span className="hint">{state.error}</span></p>}
          {/* not a mistake, just the next step, so it isn't shown in red */}
          {state.notice && <p className="explain" role="status">{state.notice}</p>}
          {signup && (
            <div className="field"><label htmlFor="name">Name</label><input id="name" name="name" type="text" autoComplete="name" maxLength={50} defaultValue={state.name} required autoFocus /></div>
          )}
          <div className="field"><label htmlFor="email">Email</label><input id="email" name="email" type="email" autoComplete="email" autoCapitalize="none" spellCheck={false} defaultValue={state.email} required autoFocus={!signup} /></div>
          <div className="field">
            <label htmlFor="password">Password</label>
            <div className="with-button">
              <input id="password" name="password" type={reveal ? "text" : "password"} autoComplete={signup ? "new-password" : "current-password"} minLength={signup ? 12 : undefined} aria-describedby={signup ? "password-hint" : undefined} required
                onKeyDown={watchCaps} onKeyUp={watchCaps} onBlur={() => setCaps(false)} onChange={(e) => setLength(e.target.value.length)} />
              <button type="button" className="btn" aria-pressed={reveal} aria-controls="password" onClick={() => setReveal(!reveal)}>{reveal ? "Hide" : "Show"}</button>
            </div>
            {caps && <p className="hint" role="status">Caps Lock is on.</p>}
            {signup && <p className="hint" id="password-hint">{length >= 12 ? "Long enough." : length ? `At least 12 characters: ${12 - length} more.` : "At least 12 characters."}</p>}
          </div>
          {signup && (
            <>
              <div className="field">
                <label htmlFor="target">Target score</label>
                <input id="target" name="target" type="number" inputMode="numeric" min={120} max={180} step={1} defaultValue={state.target ?? 165} aria-describedby="target-hint" required />
                <p className="hint" id="target-hint">Any score from 120 to 180.</p>
              </div>
              <div className="field">
                <label htmlFor="test-date">Test date</label>
                <input id="test-date" name="test_date" type="date" min={today()} aria-describedby="date-hint" />
                <p className="hint" id="date-hint">Leave blank if you have not booked yet.</p>
              </div>
            </>
          )}
          <button className="btn primary block" disabled={pending}>{pending ? (signup ? "Creating account…" : "Logging in…") : signup ? "Create account" : "Log in"}</button>
        </form>
        <p className="muted">
          {signup ? <>Already have an account? <Link href="/login">Log in</Link></> : <>New here? <Link href="/signup">Create an account</Link></>}
        </p>
      </div>
    </section>
  );
}
