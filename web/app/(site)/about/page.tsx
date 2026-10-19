import Image from "next/image";
import Link from "next/link";
import { BANK_NAME } from "@/lib/bank";


export const metadata = { title: "About" };

const FORMAT = [
  ["Logical Reasoning (two sections)", "24 to 26 each", "35 minutes each", "Yes"],
  ["Reading Comprehension", "26 to 28", "35 minutes", "Yes"],
  ["Unscored section (either type)", "varies", "35 minutes", "No"],
  ["Argumentative Writing (taken separately online)", "1 prompt", "50 minutes", "No"],
];
const FAQ = [
  ["Are these real LSAT questions?", "No. They are practice questions written in the style of the LSAT, not questions from past tests. Every question is labeled with its type."],
  ["How long should I study?", "It depends on your starting point and target. Short, regular sets on your weakest types tend to help more than occasional long sessions."],
  ["Can I use it on my phone?", "Yes. Every screen works at phone width, though timed sections are easier on a larger screen."],
  ["What happened to Logic Games?", "That section was removed from the test. The scored sections are now two Logical Reasoning sections and one Reading Comprehension section."],
];

export default function About() {
  return (
    <>
      <section className="hero">
        <div className="stack">
          <span className="tag">Our approach</span>
          <h1>Learn the reasoning one <mark>question type</mark> at a time.</h1>
        </div>
        <Image src="/images/about.jpg" alt="" width={960} height={640} priority />
      </section>
      <section>
        <h2>The test at a glance</h2>
        <table className="plain">
          <thead><tr><th>Section</th><th>Questions</th><th>Time</th><th>Scored</th></tr></thead>
          <tbody>{FORMAT.map((row) => <tr key={row[0]}>{row.map((cell) => <td key={cell}>{cell}</td>)}</tr>)}</tbody>
        </table>
      </section>
      <section>
        <h2>How the question bank is built</h2>
        <div className="steps">
          <div className="step"><div className="num">1</div><h3>{"Write practice questions"}</h3><p className="muted">{"Each question is written to follow the pattern of one LSAT question type."}</p></div>
          <div className="step"><div className="num">2</div><h3>Label each question</h3><p className="muted">Every question is labeled by type, so you can practice one kind of reasoning at a time.</p></div>
          <div className="step"><div className="num">3</div><h3>Track your answers</h3><p className="muted">Your answers build an accuracy record per type, which shows what to practice next.</p></div>
        </div>
      </section>
      <section>
        <h2>Questions people ask</h2>
        <div className="faq">
          {FAQ.map(([q, a]) => <details key={q}><summary>{q}</summary><p>{a}</p></details>)}
        </div>
      </section>
      <section className="panel tinted">
        <h2>Choose a question type to practice</h2>
        <div><Link className="btn primary" href="/signup">Start practicing for free</Link></div>
      </section>
    </>
  );
}
