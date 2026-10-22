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

/** A bank file as stored on the CDN: base64 IV (12 bytes) and base64 AES-GCM ciphertext+tag. */
export type Sealed = { iv: string; data: string };
/** What a sealed file is for. It is bound into the encryption, so a question file can't be opened as an answer. */
export type Purpose = "question" | "answer";

// Built 0x8000 bytes at a time: spreading a whole large array into one call overflows the stack.
const toB64 = (b: Uint8Array) => {
  let s = "";
  for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode(...b.subarray(i, i + 0x8000));
  return btoa(s);
};
const fromB64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

/** The bank key from 32 base64 bytes. */
export const importBankKey = (base64Key: string): Promise<CryptoKey> =>
  globalThis.crypto.subtle.importKey("raw", fromB64(base64Key), "AES-GCM", false, ["encrypt", "decrypt"]);

/** Encrypt any JSON value; the purpose is the additional data. */
export const seal = async (key: CryptoKey, value: unknown, purpose: Purpose): Promise<Sealed> => {
  const iv = globalThis.crypto.getRandomValues(new Uint8Array(12));
  const data = await globalThis.crypto.subtle.encrypt(
    { name: "AES-GCM", iv, additionalData: new TextEncoder().encode(purpose) }, key, new TextEncoder().encode(JSON.stringify(value)));
  return { iv: toB64(iv), data: toB64(new Uint8Array(data)) };
};

/** Decrypt a sealed value. Throws on the wrong key, wrong purpose or any tampering. */
export const open = async <T>(key: CryptoKey, sealed: Sealed, purpose: Purpose): Promise<T> => {
  const plain = await globalThis.crypto.subtle.decrypt(
    { name: "AES-GCM", iv: fromB64(sealed.iv), additionalData: new TextEncoder().encode(purpose) }, key, fromB64(sealed.data));
  return JSON.parse(new TextDecoder().decode(plain));
};

/**
 * Fetch and decrypt one sealed bank file. No auth header: the files are public ciphertext. Null on 404.
 * The other bank must never reach Cloudflare, so that is refused before any fetch.
 */
export const cdnGet = async <T>(path: string, init: { key: CryptoKey; purpose: Purpose; bank?: string }): Promise<T | null> => {
  if ((init.bank ?? globalThis.process?.env?.QUESTION_BANK) === "other") throw new Error("the other bank never reads Cloudflare");
  const res = await fetch(cdnBase() + path);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`${path}: ${res.status}`);
  // A 200 that isn't JSON is not a bank file (e.g. a misconfigured origin serving its HTML page).
  let sealed: Sealed;
  try { sealed = await res.json(); } catch { throw new Error(`${path}: not a bank file`); }
  return open<T>(init.key, sealed, init.purpose);
};
