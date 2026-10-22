// Where generated questions live on the CDN. No runtime imports: a plain Node script imports this file too.

/** One question file, /bank/q/<id>.json. */
export type CdnQuestion = {
  id: string; test_id: string; test_name: string; section_type: string; section_number: number;
  question_number: number; question_type: string; stimulus: string | null; prompt: string; options: Record<string, string>;
  passage_id: string | null; passage: string | null;
};

/** One answer file, /bank/answers/<id>.json. */
export type CdnAnswer = { correct_answer: "A" | "B" | "C" | "D" | "E"; explanation: string | null };

/** Lowercase words joined by dashes, so a question type makes a safe file name. */
export const typeSlug = (type: string) => type.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

/** The CDN paths for each kind of bank file. */
export const bankPaths = {
  /** The question file for one id. */
  question: (id: string) => `/bank/q/${id}.json`,
  /** The answer file for one id. */
  answer: (id: string) => `/bank/answers/${id}.json`,
  /** The drill list for one question type, in drill order. */
  typeList: (section: "lr" | "rc", type: string) => `/bank/types/${section}/${typeSlug(type)}.json`,
  /** The file that says which bank version is published. */
  version: "/bank/version.json",
};

/** The source line shown beside a question, e.g. "Practice Set 3, section 2, question 5". */
export const sourceOf = (q: Pick<CdnQuestion, "test_name" | "section_number" | "question_number">) =>
  `${q.test_name}, section ${q.section_number}, question ${q.question_number}`;

/** A question file in the shape the drill page uses. */
export const toDrillQuestion = (q: CdnQuestion) => ({
  id: q.id, stimulus: q.stimulus, prompt: q.prompt, options: q.options,
  source: sourceOf(q), testId: q.test_id, passage: q.passage,
});

/** The CDN origin, from BANK_CDN_URL; empty means same-origin paths. */
export const cdnBase = (): string => globalThis.process?.env?.BANK_CDN_URL ?? "";
