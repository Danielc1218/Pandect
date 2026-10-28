import Link from "next/link";
import { BANK_NAME } from "@/lib/bank";
import { MascotCard, MascotPeek, type MascotAnimation } from "@/components/Mascot";
import { Start } from "@/components/StartButton";
import { FAQ, SITE_DESCRIPTION, SITE_URL } from "@/lib/site";


export const metadata = { description: SITE_DESCRIPTION, alternates: { canonical: "/" } };

const WAYS: { href: string; animation: MascotAnimation; tag: string; title: string; text: string }[] = [
  { href: "/types", animation: "type", tag: "Drill", title: "Drills by question type", text: "Flaw, Strengthen, Necessary Assumption, and the rest, each in its own set, with an explanation after every answer." },
  { href: "/practice", animation: "gavel", tag: "Practice test", title: "Timed sections", text: "Logical Reasoning or Reading Comprehension, 35 minutes, like a section on test day." },
  { href: "/progress", animation: "thinking", tag: "Review", title: "Progress and misses", text: "Your accuracy by question type, and the questions you got wrong, ready to redo." },
];
const STEPS = [
  ["Make a free account", "An email address and a password. Your answers are saved to it on any device."],
  ["Drill one question type", "Start with a common one, such as Flaw or Necessary Assumption. After each answer you see the right choice and why."],
  ["Take a timed section, then review", "A 35-minute section shows whether the drilling holds up. Progress shows which types you miss most; drill those next."],
];

// What search engines and AI answer engines read about the site, the FAQ word for word as shown below.
const JSON_LD = {
  "@context": "https://schema.org",
  "@graph": [
    { "@type": "WebSite", name: "Pandect", url: `${SITE_URL}/`, description: SITE_DESCRIPTION },
    { "@type": "Organization", "@id": `${SITE_URL}/#organization`, name: "Pandect", url: `${SITE_URL}/`, logo: `${SITE_URL}/mascot/brand/peek.png` },
    {
      "@type": "LearningResource", name: "Pandect LSAT practice", url: `${SITE_URL}/`, learningResourceType: "Practice questions",
      description: `${"LSAT-style"} Logical Reasoning and Reading Comprehension practice questions, sorted by question type.`,
      teaches: ["Logical Reasoning", "Reading Comprehension"], provider: { "@id": `${SITE_URL}/#organization` },
    },
    { "@type": "FAQPage", mainEntity: FAQ.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })) },
  ],
};

export default function Home() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD).replace(/</g, "\\u003c") }} />
      <section className="hero">
        <div className="stack">
          <span className="tag">Logical Reasoning and Reading Comprehension</span>
          <h1>LSAT practice, one <mark>question type</mark> at a time.</h1>
          <p className="lead muted">
            For anyone studying for the LSAT: free {"LSAT-style"} questions sorted by type, timed 35-minute sections, and a record of what you miss.
          </p>
          <div className="actions">
            <Start />
            <a className="btn" href="#how">How it works</a>
          </div>
        </div>
        <MascotPeek />
      </section>
      <section id="how">
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
      <section>
        <h2>What&apos;s inside</h2>
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
        <h2>Questions people ask</h2>
        <div className="faq">
          {FAQ.map(([q, a]) => <details key={q}><summary>{q}</summary><p>{a}</p></details>)}
        </div>
      </section>
      <section className="panel tinted">
        <h2>Ready for your first set?</h2>
        <div><Start /></div>
      </section>
    </>
  );
}
