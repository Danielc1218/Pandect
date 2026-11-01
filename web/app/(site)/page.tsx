import Link from "next/link";
import { MascotCard, MascotPeek, type MascotAnimation } from "@/components/Mascot";
import { Start } from "@/components/StartButton";
import { FAQ, SITE_DESCRIPTION, SITE_URL } from "@/lib/site";

export const metadata = { description: SITE_DESCRIPTION, alternates: { canonical: "/" } };

const WAYS: { href: string; animation: MascotAnimation; tag: string; title: string }[] = [
  { href: "/types", animation: "type", tag: "Drill", title: "Drills by question type" },
  { href: "/practice", animation: "gavel", tag: "Practice test", title: "Timed sections" },
  { href: "/progress", animation: "thinking", tag: "Review", title: "Progress and misses" },
];
const STEPS = ["Make a free account", "Drill one question type", "Take a timed section, then review"];

// What search engines and AI answer engines read about the site, the FAQ word for word as shown below.
const JSON_LD = {
  "@context": "https://schema.org",
  "@graph": [
    { "@type": "WebSite", name: "Pandect", url: `${SITE_URL}/`, description: SITE_DESCRIPTION },
    { "@type": "Organization", "@id": `${SITE_URL}/#organization`, name: "Pandect", url: `${SITE_URL}/`, logo: `${SITE_URL}/mascot/brand/peek.png` },
    {
      "@type": "LearningResource", name: "Pandect LSAT practice", url: `${SITE_URL}/`, learningResourceType: "Practice questions",
      description: "LSAT-style Logical Reasoning and Reading Comprehension practice questions, sorted by question type.",
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
          {STEPS.map((title, i) => (
            <div key={title} className="step">
              <div className="num">{i + 1}</div>
              <h3>{title}</h3>
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
