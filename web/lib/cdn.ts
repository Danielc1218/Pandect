// Where generated questions live on the CDN. No runtime imports: a plain Node script imports this file too.

/** One question, an entry of its bucket /bank/q/<bucket>.json. */
export type CdnQuestion = {
  id: string; test_id: string; test_name: string; section_type: string; section_number: number;
  question_number: number; question_type: string; stimulus: string | null; prompt: string; options: Record<string, string>;
  passage_id: string | null; passage: string | null;
};

/** One answer, an entry of its bucket /bank/answers/<bucket>.json. */
export type CdnAnswer = { correct_answer: "A" | "B" | "C" | "D" | "E"; explanation: string | null };

/** Lowercase words joined by dashes, so a question type makes a safe file name. */
export const typeSlug = (type: string) => type.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

/** Which bucket file holds an id: its first two characters, lowercased. Ids are UUIDs, so at most 256 buckets per kind. */
export const bucketOf = (id: string) => id.toLowerCase().slice(0, 2);

/** The CDN paths for each kind of bank file. */
export const bankPaths = {
  /** The question bucket that holds one id. */
  questionBucket: (id: string) => `/bank/q/${bucketOf(id)}.json`,
  /** The answer bucket that holds one id. */
  answerBucket: (id: string) => `/bank/answers/${bucketOf(id)}.json`,
  /** The drill list for one question type, in drill order. */
  typeList: (section: "lr" | "rc", type: string) => `/bank/types/${section}/${typeSlug(type)}.json`,
  /** The file that says which bank version is published. */
  version: "/bank/version.json",
};

/** Public labels omit the internal bank's "Generated" prefix. */
export const practiceName = (name: string) => name.replace(/^Generated\s+/i, "");

/** The source line shown beside a question, e.g. "Practice Set 3, section 2, question 5". */
export const sourceOf = (q: Pick<CdnQuestion, "test_name" | "section_number" | "question_number">) =>
  `${practiceName(q.test_name)}, section ${q.section_number}, question ${q.question_number}`;

/** A question file in the shape the drill page uses. */
export const toDrillQuestion = (q: CdnQuestion) => ({
  id: q.id, stimulus: q.stimulus, prompt: q.prompt, options: q.options,
  source: sourceOf(q), testId: q.test_id, passage: q.passage,
});

/** The CDN origin, from BANK_CDN_URL; empty means same-origin paths. */
export const cdnBase = (): string => globalThis.process?.env?.BANK_CDN_URL ?? "";

/** A bank file as stored on the CDN: base64 IV (12 bytes) and base64 AES-GCM ciphertext+tag. */
export type Sealed = { iv: string; data: string };
/** What a sealed value is for. It is bound into the encryption, so a question can't be opened as an answer. */
export type Purpose = "question" | "answer";
/** A bucket file: { "<id>": Sealed }, each entry sealed under its own id. */
export type Bucket = Record<string, Sealed>;

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

const aad = (purpose: Purpose, label: string) => new TextEncoder().encode(`${purpose}:${label}`);

/**
 * Encrypt any JSON value. The additional data is "<purpose>:<label>": the label is the id for a bucket entry and
 * the file's /bank/... path for a whole file, so a value can't be moved under another id or path.
 */
export const seal = async (key: CryptoKey, value: unknown, purpose: Purpose, label: string): Promise<Sealed> => {
  const iv = globalThis.crypto.getRandomValues(new Uint8Array(12));
  const data = await globalThis.crypto.subtle.encrypt(
    { name: "AES-GCM", iv, additionalData: aad(purpose, label) }, key, new TextEncoder().encode(JSON.stringify(value)));
  return { iv: toB64(iv), data: toB64(new Uint8Array(data)) };
};

/** Decrypt a sealed value. Throws on the wrong key, purpose or label, or any tampering. */
export const open = async <T>(key: CryptoKey, sealed: Sealed, purpose: Purpose, label: string): Promise<T> => {
  const plain = await globalThis.crypto.subtle.decrypt(
    { name: "AES-GCM", iv: fromB64(sealed.iv), additionalData: aad(purpose, label) }, key, fromB64(sealed.data));
  return JSON.parse(new TextDecoder().decode(plain));
};

/**
 * Bank entries by id, in the order given: each bucket is fetched once (getBucket gives null when it is missing) and only
 * the asked entries are opened. A missing bucket or entry is null.
 */
export const openEntries = async <T>(key: CryptoKey, ids: string[], purpose: Purpose, getBucket: (path: string) => Promise<unknown>): Promise<(T | null)[]> => {
  const pathOf = purpose === "answer" ? bankPaths.answerBucket : bankPaths.questionBucket;
  const buckets = new Map<string, Promise<unknown>>();
  for (const id of ids) if (!buckets.has(pathOf(id))) buckets.set(pathOf(id), getBucket(pathOf(id)));
  return Promise.all(ids.map(async (id) => {
    const bucket = await buckets.get(pathOf(id));
    const entry = bucket && typeof bucket === "object" && Object.hasOwn(bucket, id) ? (bucket as Bucket)[id] : null;
    return entry?.iv && entry.data ? open<T>(key, entry, purpose, id) : null;
  }));
};

/**
 * One bank file from the CDN as stored (still sealed). No auth header: the files are public ciphertext. Null on 404.
 * The other bank must never reach Cloudflare, so that is refused before any fetch.
 */
export const cdnRaw = async (path: string, bank?: string): Promise<unknown> => {
  if ((bank ?? globalThis.process?.env?.QUESTION_BANK) === "other") throw new Error("the other bank never reads Cloudflare");
  const res = await fetch(cdnBase() + path);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`${path}: ${res.status}`);
  // A 200 that isn't JSON is not a bank file (e.g. a misconfigured origin serving its HTML page).
  try { return await res.json(); } catch { throw new Error(`${path}: not a bank file`); }
};

/** Fetch and decrypt one whole sealed file (a type list), sealed under its path. Null on 404. */
export const cdnGet = async <T>(path: string, init: { key: CryptoKey; purpose: Purpose; bank?: string }): Promise<T | null> => {
  const sealed = (await cdnRaw(path, init.bank)) as Sealed | null;
  return sealed && open<T>(init.key, sealed, init.purpose, path);
};
