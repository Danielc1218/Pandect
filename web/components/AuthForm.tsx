"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { logIn, signUp, type AuthState } from "@/lib/auth";
import { today } from "./SettingsForm";

export function AuthForm({ mode }: { mode: "signup" | "login" }) {
  const [state, action, pending] = useActionState<AuthState, FormData>(mode === "signup" ? signUp : logIn, {});
  const signup = mode === "signup";
  const [reveal, setReveal] = useState(false);
  return (
    <section className="auth">
      <div className="panel">
        <h1>{signup ? "Create your account" : "Log in"}</h1>
        <form className="stack" action={action}>
          {state.error && <p className="field invalid" role="alert"><span className="hint">{state.error}</span></p>}
          {signup && (
            <div className="field"><label htmlFor="name">Name</label><input id="name" name="name" type="text" autoComplete="name" defaultValue={state.name} required autoFocus /></div>
          )}
          <div className="field"><label htmlFor="email">Email</label><input id="email" name="email" type="email" autoComplete="email" defaultValue={state.email} required autoFocus={!signup} /></div>
          <div className="field">
            <label htmlFor="password">Password</label>
            <div className="with-button">
              <input id="password" name="password" type={reveal ? "text" : "password"} autoComplete={signup ? "new-password" : "current-password"} minLength={signup ? 12 : undefined} aria-describedby={signup ? "password-hint" : undefined} required />
              <button type="button" className="btn" aria-pressed={reveal} aria-controls="password" onClick={() => setReveal(!reveal)}>{reveal ? "Hide" : "Show"}</button>
            </div>
            {signup && <p className="hint" id="password-hint">At least 12 characters.</p>}
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
