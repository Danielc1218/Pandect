"use client";

import Link from "next/link";
import { useActionState } from "react";
import { logIn, signUp, type AuthState } from "@/lib/auth";

export function AuthForm({ mode }: { mode: "signup" | "login" }) {
  const [state, action, pending] = useActionState<AuthState, FormData>(mode === "signup" ? signUp : logIn, {});
  const signup = mode === "signup";
  return (
    <section className="auth">
      <div className="panel">
        <h1>{signup ? "Create your account" : "Log in"}</h1>
        <form className="stack" action={action}>
          {state.error && <p className="field invalid" role="alert"><span className="hint">{state.error}</span></p>}
          {signup && (
            <div className="field"><label htmlFor="name">Name</label><input id="name" name="name" type="text" autoComplete="name" defaultValue={state.name} required /></div>
          )}
          <div className="field"><label htmlFor="email">Email</label><input id="email" name="email" type="email" autoComplete="email" defaultValue={state.email} required /></div>
          <div className="field">
            <label htmlFor="password">Password</label>
            <input id="password" name="password" type="password" autoComplete={signup ? "new-password" : "current-password"} minLength={signup ? 12 : undefined} aria-describedby={signup ? "password-hint" : undefined} required />
            {signup && <p className="hint" id="password-hint">At least 12 characters.</p>}
          </div>
          {signup && (
            <>
              <div className="field">
                <label htmlFor="target">Target score</label>
                <select id="target" name="target" defaultValue="165">{[150, 155, 160, 165, 170, 175].map((s) => <option key={s}>{s}</option>)}</select>
              </div>
              <div className="field">
                <label htmlFor="test-date">Test date</label>
                <input id="test-date" name="test_date" type="date" aria-describedby="date-hint" />
                <p className="hint" id="date-hint">Leave blank if you have not booked yet.</p>
              </div>
            </>
          )}
          <button className="btn primary block" disabled={pending}>{signup ? "Create account" : "Log in"}</button>
        </form>
        <p className="muted">
          {signup ? <>Already have an account? <Link href="/login">Log in</Link></> : <>New here? <Link href="/signup">Create an account</Link></>}
        </p>
      </div>
    </section>
  );
}
