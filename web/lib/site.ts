// What the site says about itself: titles, the FAQ (Home, About, and Home's JSON-LD), the address search engines use.
import { BANK_NAME } from "@/lib/bank";


// The Cloudflare site; the Vercel backup points its canonical links here too.
export const SITE_URL = "https://pandectprep.pages.dev";
export const SITE_TITLE = "Pandect: LSAT practice by question type";
export const SITE_DESCRIPTION = `Free ${"LSAT-style"} Logical Reasoning and Reading Comprehension practice: drill one question type at a time, take timed 35-minute sections, and see which types you miss.`;

/** A page's full title, as web/app/layout.tsx's template makes it; Home has none of its own. */
export const pageTitle = (title?: string) => (title ? `${title} · Pandect` : SITE_TITLE);

export const FAQ = [
  ["Are these real LSAT questions?", "No. They are practice questions written in the style of the LSAT, not questions from past tests. Every question is labeled with its type."],
  ["Is it free?", "Yes. Make an account with your email address and every drill and timed section is open to you."],
  ["How long should I study?", "It depends on your starting point and target. Short, regular sets on your weakest types tend to help more than occasional long sessions."],
  ["Can I use it on my phone?", "Yes. Every screen works at phone width, though timed sections are easier on a larger screen."],
  ["What happened to Logic Games?", "That section was removed from the test. The scored sections are now two Logical Reasoning sections and one Reading Comprehension section."],
];
