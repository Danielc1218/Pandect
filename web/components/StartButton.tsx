import Link from "next/link";
import { Suspense } from "react";
import { signedIn } from "@/lib/supabase";

const SIGN_UP = <Link className="btn primary" href="/signup">Start practicing for free</Link>;

/** The main call to action: sign up, or for someone already signed in, their dashboard. Only this waits for the session. */
async function StartButton() {
  return (await signedIn()) ? <Link className="btn primary" href="/learn">Go to your dashboard</Link> : SIGN_UP;
}
export const Start = () => <Suspense fallback={SIGN_UP}><StartButton /></Suspense>;
