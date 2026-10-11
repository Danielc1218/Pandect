/**
 * Display and accessibility preferences. They live in profiles.preferences (so they follow the account) and
 * in localStorage "prefs" (so the pre-paint script in app/layout.tsx applies them before anything shows).
 * applyPrefs turns them into CSS variables and data attributes on <html>; app/prefs.css does the rest.
 * The light/dark theme is separate and per device: localStorage "theme", shared with the top bar's switch.
 */
export type Prefs = {
  textScale: number;      // multiplies every font size token
  lineHeight: number;
  letterSpacing: number;  // em
  wordSpacing: number;    // em
  font: "inter" | "atkinson" | "lexend";
  passageFont: "same" | "serif" | "atkinson";
  contrast: "normal" | "high";
  accent: string;         // "" for the theme's own, else #rrggbb
  tint: "none" | "cream" | "sepia" | "cool";
  markers: "standard" | "colorblind";
  motion: "system" | "reduce";
  focus: "standard" | "strong";
  underlineLinks: boolean;
  extraTime: 1 | 1.5 | 2;
  hideTimer: boolean;
  layout: "side" | "stacked";
};

export const DEFAULT_PREFS: Prefs = {
  textScale: 1, lineHeight: 1.5, letterSpacing: 0, wordSpacing: 0, font: "inter", passageFont: "same",
  contrast: "normal", accent: "", tint: "none", markers: "standard", motion: "system", focus: "standard",
  underlineLinks: false, extraTime: 1, hideTimer: false, layout: "side",
};

export const RANGES = {
  textScale: [0.85, 1.6],
  lineHeight: [1.2, 2.2],
  letterSpacing: [0, 0.12],
  wordSpacing: [0, 0.4],
} as const;

const CHOICES = {
  font: ["inter", "atkinson", "lexend"],
  passageFont: ["same", "serif", "atkinson"],
  contrast: ["normal", "high"],
  tint: ["none", "cream", "sepia", "cool"],
  markers: ["standard", "colorblind"],
  motion: ["system", "reduce"],
  focus: ["standard", "strong"],
  extraTime: [1, 1.5, 2],
  layout: ["side", "stacked"],
} as const;

/** Any stored or submitted value, made into valid preferences: unknown keys dropped, bad values defaulted. */
export function sanitize(raw: unknown): Prefs {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const out: Prefs = { ...DEFAULT_PREFS };
  for (const [key, [lo, hi]] of Object.entries(RANGES) as [keyof typeof RANGES, readonly [number, number]][]) {
    const n = Number(r[key]);
    if (r[key] !== undefined && Number.isFinite(n)) out[key] = Math.min(hi, Math.max(lo, n));
  }
  for (const [key, allowed] of Object.entries(CHOICES)) {
    if ((allowed as readonly unknown[]).includes(r[key])) (out as Record<string, unknown>)[key] = r[key];
  }
  if (typeof r.accent === "string" && /^#[0-9a-f]{6}$/i.test(r.accent)) out.accent = r.accent.toLowerCase();
  for (const key of ["underlineLinks", "hideTimer"] as const) if (typeof r[key] === "boolean") out[key] = r[key];
  return out;
}

/** The changes from the defaults, which is all that needs storing. */
export const changed = (p: Prefs) =>
  Object.fromEntries(Object.entries(p).filter(([k, v]) => DEFAULT_PREFS[k as keyof Prefs] !== v)) as Partial<Prefs>;

/** WCAG relative luminance of a #rrggbb colour. */
export function luminance(hex: string) {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}

/** WCAG contrast ratio between two #rrggbb colours, 1 to 21. */
export function contrast(a: string, b: string) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/**
 * Puts preferences on <html>. Self-contained (no imports or outside names) because app/layout.tsx also inlines
 * its source as the pre-paint script, where it runs before React and before the stylesheet's fonts load.
 */
export function applyPrefs(p: Partial<Prefs>) {
  const html = document.documentElement;
  const vars: Record<string, string | undefined> = {
    "--text-scale": p.textScale === undefined ? undefined : String(p.textScale),
    "--line-height": p.lineHeight === undefined ? undefined : String(p.lineHeight),
    "--letter-spacing": p.letterSpacing ? p.letterSpacing + "em" : undefined,
    "--word-spacing": p.wordSpacing ? p.wordSpacing + "em" : undefined,
  };
  // A custom accent replaces the primary colour, with black or white text on it, whichever reads better.
  // High contrast has its own colours, so it ignores the accent.
  const accent = p.accent && p.contrast !== "high" ? p.accent : "";
  if (accent) {
    const lum = [1, 3, 5].map((i) => parseInt(accent.slice(i, i + 2), 16) / 255)
      .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
      .reduce((sum, v, i) => sum + v * [0.2126, 0.7152, 0.0722][i], 0);
    vars["--color-primary"] = accent;
    vars["--color-on-primary"] = (lum + 0.05) / 0.05 > 1.05 / (lum + 0.05) ? "#000000" : "#ffffff";
  } else {
    vars["--color-primary"] = vars["--color-on-primary"] = undefined;
  }
  for (const [name, value] of Object.entries(vars)) {
    if (value === undefined) html.style.removeProperty(name);
    else html.style.setProperty(name, value);
  }
  const data: Record<string, string | undefined> = {
    font: p.font !== "inter" ? p.font : undefined,
    passageFont: p.passageFont !== "same" ? p.passageFont : undefined,
    contrast: p.contrast === "high" ? "high" : undefined,
    tint: p.tint !== "none" ? p.tint : undefined,
    markers: p.markers === "colorblind" ? "colorblind" : undefined,
    motion: p.motion === "reduce" ? "reduce" : undefined,
    focus: p.focus === "strong" ? "strong" : undefined,
    links: p.underlineLinks ? "underline" : undefined,
    layout: p.layout === "stacked" ? "stacked" : undefined,
  };
  for (const [key, value] of Object.entries(data)) {
    if (value) html.dataset[key] = value;
    else delete html.dataset[key];
  }
  // The reading fonts are only fetched once someone picks one.
  for (const font of [p.font, p.passageFont]) {
    const family = font === "atkinson" ? "Atkinson+Hyperlegible:wght@400;700" : font === "lexend" ? "Lexend:wght@400;600;700" : "";
    if (family && !document.getElementById("font-" + font)) {
      const link = document.createElement("link");
      link.id = "font-" + font;
      link.rel = "stylesheet";
      link.href = "https://fonts.googleapis.com/css2?family=" + family + "&display=swap";
      document.head.appendChild(link);
    }
  }
}

/** Reads this device's copy; any problem (private browsing, bad JSON) gives the defaults. */
export function loadPrefs(): Prefs {
  try {
    return sanitize(JSON.parse(localStorage.getItem("prefs") ?? "{}"));
  } catch {
    return { ...DEFAULT_PREFS };
  }
}

export function storePrefs(p: Prefs) {
  try {
    localStorage.setItem("prefs", JSON.stringify(changed(p)));
  } catch {} // private browsing: they still apply to this page
  window.dispatchEvent(new Event("prefs"));
}
