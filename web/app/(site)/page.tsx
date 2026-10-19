import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { BANK_NAME } from "@/lib/bank";
import { supabase } from "@/lib/supabase";


const WAYS = [
  { href: "/types", photo: "logic", tag: "Drill", title: "Drill one question type", text: "Flaw, Strengthen, Necessary Assumption and the rest, each in its own set." },
  { href: "/practice", photo: "columns", tag: "Practice test", title: "Sit a timed section", text: "Logical Reasoning or Reading Comprehension, 35 minutes, like test day." },
  { href: "/progress", photo: "desk", tag: "Review", title: "Review what you missed", text: "See your accuracy by question type and redo the ones you got wrong." },
];
const STEPS = [
  ["Pick a question type", "Start with the common ones: Flaw, Necessary Assumption, Strengthen."],
  ["Drill it", "Each set stays on one kind of reasoning, so the pattern sinks in."],
  ["Test under the clock", "Timed sections tell you whether the practice is holding up."],
];

const SIGN_UP = <Link className="btn primary" href="/signup">Start practising free</Link>;

/** The main call to action: sign up, or for someone already signed in, their dashboard. Only this waits for the session. */
async function StartButton() {
  const { data } = await (await supabase()).auth.getClaims();
  return data?.claims ? <Link className="btn primary" href="/learn">Go to your dashboard</Link> : SIGN_UP;
}
const Start = () => <Suspense fallback={SIGN_UP}><StartButton /></Suspense>;

export default function Home() {
  return (
    <>
      <section className="hero">
        <div className="stack">
          <span className="tag">Logical Reasoning and Reading Comprehension</span>
          <h1>Practise on {"LSAT-style"} questions until the patterns feel <mark>obvious</mark>.</h1>
          <div className="actions">
            <Start />
            <Link className="btn" href="/about">How it works</Link>
          </div>
        </div>
        <Image src="/images/hero.jpg" alt="" width={960} height={640} priority />
      </section>
      <section>
        <h2>Three ways to study</h2>
        <div className="grid">
          {WAYS.map((w) => (
            <Link key={w.href} className="card" href={w.href}>
              <Image className="photo" src={`/images/${w.photo}.jpg`} alt="" width={800} height={400} />
              <div className="body">
                <span className="tag">{w.tag}</span>
                <h3>{w.title}</h3>
                <p className="muted">{w.text}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>
      <section>
        <h2>How it works</h2>
        <div className="steps">
          {STEPS.map(([title, text], i) => (
            <div key={title} className="step">
              <div className="num">{i + 1}</div>
              <h3>{title}</h3>
              <p className="muted">{text}</p>
            </div>
          ))}
        </div>
      </section>
      <section className="panel tinted">
        <h2>Ready for your first set?</h2>
        <div><Start /></div>
      </section>
    </>
  );
}
