// Browser version of web/components/StartButton.tsx. Its StartButton is an async server component, which React in
// the browser can't render, so this reads the session Root already tracks; until it is known, the sign-up button
// shows, as web's Suspense fallback does.
import { useContext } from "react";
import Link from "next/link";
import { SignedIn } from "../Root";

export function Start() {
  return useContext(SignedIn)
    ? <Link className="btn primary" href="/learn">Go to your dashboard</Link>
    : <Link className="btn primary" href="/signup">Start practicing for free</Link>;
}
