import Link from "next/link";
import { BANK_NAME } from "@/lib/bank";
import { MascotCard, MascotPeek, type MascotAnimation } from "@/components/Mascot";
import { Start } from "@/components/StartButton";


const WAYS: { href: string; animation: MascotAnimation; tag: string; title: string; text: string }[] = [
  { href: "/types", animation: "type", tag: "Drill", title: "Drill one question type", text: "Flaw, Strengthen, Necessary Assumption, and the rest, each in its own set." },
  { href: "/practice", animation: "gavel", tag: "Practice test", title: "Take a timed section", text: "Logical Reasoning or Reading Comprehension, 35 minutes, like test day." },
  { href: "/progress", animation: "thinking", tag: "Review", title: "Review what you missed", text: "See your accuracy by question type and redo the ones you got wrong." },
];
const STEPS = [
  ["Pick a question type", "Start with the common ones: Flaw, Necessary Assumption, Strengthen."],
  ["Drill it", "Each set stays on one kind of reasoning, so the pattern sinks in."],
  ["Test under the clock", "Timed sections tell you whether the practice is holding up."],
];


export default function Home() {
  return (
    <>
      <section className="hero">
        <div className="stack">
          <span className="tag">Logical Reasoning and Reading Comprehension</span>
          <h1>Practice on {"LSAT-style"} questions until the patterns feel <mark>obvious</mark>.</h1>
          <div className="actions">
            <Start />
            <Link className="btn" href="/about">How it works</Link>
          </div>
        </div>
        <MascotPeek />
      </section>
      <section>
        <h2>Three ways to study</h2>
        <div className="grid">
          {WAYS.map((w) => (
            <Link key={w.href} className="card" href={w.href}>
              <MascotCard animation={w.animation} className="photo" />
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
