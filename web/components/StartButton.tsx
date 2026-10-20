import Link from "next/link";
import { Suspense } from "react";
import { supabase } from "@/lib/supabase";

const SIGN_UP = <Link className="btn primary" href="/signup">Start practicing for free</Link>;

/** The main call to action: sign up, or for someone already signed in, their dashboard. Only this waits for the session. */
async function StartButton() {
  const { data } = await (await supabase()).auth.getClaims();
  return data?.claims ? <Link className="btn primary" href="/learn">Go to your dashboard</Link> : SIGN_UP;
}
export const Start = () => <Suspense fallback={SIGN_UP}><StartButton /></Suspense>;
