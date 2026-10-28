import { Mascot } from "@/components/Mascot";
import { Start } from "@/components/StartButton";
import { BANK_NAME } from "@/lib/bank";


export const metadata = {
  title: "About",
  description: "What the LSAT's sections ask of you, and how Pandect builds and labels its practice questions.",
  alternates: { canonical: "/about" },
};

const FORMAT = [
  ["Logical Reasoning (two sections)", "24 to 26 each", "35 minutes each", "Yes"],
  ["Reading Comprehension", "26 to 28", "35 minutes", "Yes"],
  ["Unscored section (either type)", "varies", "35 minutes", "No"],
  ["Argumentative Writing (taken separately online)", "1 prompt", "50 minutes", "No"],
];

export default function About() {
  return (
    <>
      <section className="hero">
        <div className="stack">
          <span className="tag">Our approach</span>
          <h1>What the LSAT asks, and how Pandect <mark>practices</mark> it.</h1>
        </div>
        <Mascot animation="read" className="mascot-about" />
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
      <section className="panel tinted">
        <h2>Choose a question type to practice</h2>
        <div><Start /></div>
      </section>
    </>
  );
}
