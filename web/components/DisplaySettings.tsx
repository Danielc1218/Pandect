"use client";

import { useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { savePreferences } from "@/lib/actions";
import { applyPrefs, contrast, DEFAULT_PREFS, RANGES, storePrefs, type Prefs } from "@/lib/prefs";
import { markEdited, usePrefs } from "./Prefs";

type Theme = "system" | "light" | "dark";

// The theme and page colour live on <html>, outside React (the top bar's switch changes them too), so they are
// read from there and re-read whenever its attributes change.
const watchHtml = (onChange: () => void) => {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true });
  return () => observer.disconnect();
};
const readHtml = () => {
  let saved: string | null = null;
  try { saved = localStorage.getItem("theme"); } catch {}
  const html = document.documentElement;
  const background = getComputedStyle(html).getPropertyValue("--color-background").trim() || "#ffffff";
  return `${saved === "light" || saved === "dark" ? saved : "system"}|${html.dataset.theme === "dark"}|${background}`;
};

function Range({ id, label, value, step, format, onChange }: {
  id: keyof typeof RANGES; label: string; value: number; step: number; format: (v: number) => string; onChange: (v: number) => void;
}) {
  const [min, max] = RANGES[id];
  return (
    <div className="range-field">
      <label htmlFor={id}>{label}</label>
      <output htmlFor={id}>{format(value)}</output>
      <input id={id} type="range" min={min} max={max} step={step} value={value} aria-valuetext={format(value)}
             onChange={(e) => onChange(Number(e.target.value))} />
    </div>
  );
}

function Choice<T extends string | number>({ legend, name, value, options, onChange, hint }: {
  legend: string; name: string; value: T; options: [T, ReactNode][]; onChange: (v: T) => void; hint?: string;
}) {
  return (
    <fieldset className="segmented">
      <legend>{legend}</legend>
      {options.map(([v, label]) => (
        <label key={String(v)}>
          <input type="radio" name={name} checked={value === v} onChange={() => onChange(v)} />
          {label}
        </label>
      ))}
      {hint && <p className="muted" style={{ flexBasis: "100%", margin: 0 }}>{hint}</p>}
    </fieldset>
  );
}

function Check({ label, checked, onChange, hint }: { label: string; checked: boolean; onChange: (v: boolean) => void; hint?: string }) {
  return (
    <label className="check">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span>{label}{hint && <span className="muted" style={{ display: "block" }}>{hint}</span>}</span>
    </label>
  );
}

const pct = (v: number) => `${Math.round(v * 100)}%`;
const em = (v: number) => (v ? `${v.toFixed(2)} em` : "Normal");

/** Display and accessibility settings: every change shows at once, on this device and in the preview, and is saved to the account shortly after. */
export function DisplaySettings() {
  const prefs = usePrefs();
  const [status, setStatus] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const [theme, darkFlag, background] = useSyncExternalStore(watchHtml, readHtml, () => "system|false|#ffffff").split("|") as [Theme, string, string];
  const dark = darkFlag === "true";

  const update = (patch: Partial<Prefs>) => {
    const next = { ...prefs, ...patch };
    markEdited();
    applyPrefs(next);
    storePrefs(next);
    setStatus("Saving…");
    clearTimeout(timer.current); // a slider sends many changes; only the last one is saved
    timer.current = setTimeout(() => {
      savePreferences(next).then(() => setStatus("Saved to your account."), () => setStatus("Couldn't save to your account. Your changes still apply on this device."));
    }, 500);
  };

  const chooseTheme = (t: Theme) => {
    const resolved = t === "system" ? (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light") : t;
    try { if (t === "system") localStorage.removeItem("theme"); else localStorage.setItem("theme", t); } catch {}
    document.documentElement.dataset.theme = resolved; // the observer above picks up the change
  };

  const accentRatio = prefs.accent && /^#[0-9a-f]{6}$/i.test(background) ? contrast(prefs.accent, background) : null;

  return (
    <div className="settings-layout">
      <div className="stack">
        <section className="panel prefs-group" aria-labelledby="reading">
          <h2 id="reading">Reading</h2>
          <Range id="textScale" label="Text size" value={prefs.textScale} step={0.01} format={pct} onChange={(v) => update({ textScale: v })} />
          <Range id="lineHeight" label="Line spacing" value={prefs.lineHeight} step={0.05} format={(v) => v.toFixed(2)} onChange={(v) => update({ lineHeight: v })} />
          <Range id="letterSpacing" label="Letter spacing" value={prefs.letterSpacing} step={0.005} format={em} onChange={(v) => update({ letterSpacing: v })} />
          <Range id="wordSpacing" label="Word spacing" value={prefs.wordSpacing} step={0.01} format={em} onChange={(v) => update({ wordSpacing: v })} />
          <Choice legend="Font" name="font" value={prefs.font} onChange={(v) => update({ font: v })}
                  options={[["inter", "Inter"], ["atkinson", "Atkinson Hyperlegible"], ["lexend", "Lexend"]]}
                  hint="Atkinson Hyperlegible and Lexend were designed to be easier to read, including with dyslexia or low vision." />
          <Choice legend="Passage font" name="passage-font" value={prefs.passageFont} onChange={(v) => update({ passageFont: v })}
                  options={[["same", "Same as the rest"], ["serif", <span key="s" style={{ fontFamily: "Georgia, serif" }}>Serif, like a printed test</span>], ["atkinson", "Atkinson Hyperlegible"]]} />
        </section>

        <section className="panel prefs-group" aria-labelledby="colours">
          <h2 id="colours">Colours</h2>
          <Choice legend="Theme" name="theme" value={theme} onChange={chooseTheme}
                  options={[["system", "Match this device"], ["light", "Light"], ["dark", "Dark"]]}
                  hint="Kept on this device, like the switch in the top bar." />
          <Check label="High contrast" checked={prefs.contrast === "high"} onChange={(v) => update({ contrast: v ? "high" : "normal" })}
                 hint="Black and white with stronger borders, in light and dark." />
          <div className="field">
            <label htmlFor="accent">Accent colour</label>
            <div className="accent-row">
              <input id="accent" type="color" value={prefs.accent || "#1e6b43"} disabled={prefs.contrast === "high"}
                     onChange={(e) => update({ accent: e.target.value })} />
              <button type="button" className="btn" disabled={!prefs.accent} onClick={() => update({ accent: "" })}>Use the theme&apos;s colour</button>
            </div>
            <p className="hint" aria-live="polite">
              {prefs.contrast === "high" ? "High contrast uses its own colours."
                : accentRatio === null ? "Buttons, links and highlights use this colour."
                : `Contrast with the page: ${accentRatio.toFixed(1)}:1. ${accentRatio >= 4.5 ? "Easy to read." : accentRatio >= 3 ? "Fine for buttons, faint for links." : "Too faint to read; pick a darker or brighter colour."}`}
            </p>
          </div>
          <Choice legend="Background tint" name="tint" value={prefs.tint} onChange={(v) => update({ tint: v })}
                  options={(["none", "cream", "sepia", "cool"] as const).map((t) => [t, t === "none" ? "None" : t[0].toUpperCase() + t.slice(1)])}
                  hint={dark || prefs.contrast === "high" ? "Tints apply in the light theme without high contrast." : "A softer page colour can make long passages easier on the eyes."} />
          <Choice legend="Right and wrong answers" name="markers" value={prefs.markers} onChange={(v) => update({ markers: v })}
                  options={[["standard", "Green and red"], ["colorblind", "Blue and orange, with ✓ and ✗"]]} />
        </section>

        <section className="panel prefs-group" aria-labelledby="motion">
          <h2 id="motion">Motion and focus</h2>
          <Choice legend="Animation" name="motion" value={prefs.motion} onChange={(v) => update({ motion: v })}
                  options={[["system", "Match this device"], ["reduce", "Reduce motion"]]} />
          <Check label="Stronger focus outline" checked={prefs.focus === "strong"} onChange={(v) => update({ focus: v ? "strong" : "standard" })}
                 hint="A thick ring around whatever the keyboard is on." />
          <Check label="Always underline links" checked={prefs.underlineLinks} onChange={(v) => update({ underlineLinks: v })} />
        </section>

        <section className="panel prefs-group" aria-labelledby="tests">
          <h2 id="tests">Timed sections</h2>
          <Choice legend="Time allowed" name="extra-time" value={prefs.extraTime} onChange={(v) => update({ extraTime: v })}
                  options={[[1, "Standard (35 minutes)"], [1.5, "Time and a half"], [2, "Double time"]]}
                  hint="Like the testing accommodations LSAC grants." />
          <Check label="Hide the timer until 5 minutes are left" checked={prefs.hideTimer} onChange={(v) => update({ hideTimer: v })} />
          <Choice legend="Passage and questions" name="layout" value={prefs.layout} onChange={(v) => update({ layout: v })}
                  options={[["side", "Side by side"], ["stacked", "Passage above the questions"]]} />
        </section>

        <div className="actions spread">
          <p role="status" className="muted" style={{ margin: 0 }}>{status}</p>
          <button type="button" className="btn" onClick={() => { update(DEFAULT_PREFS); chooseTheme("system"); }}>Reset everything</button>
        </div>
      </div>

      <aside className="preview stack" aria-label="Preview">
        <article className="passage">
          <div><span className="tag">Preview</span></div>
          <p>Critics have long treated the serialized novel as a commercial product first and a work of art second. Yet the breaks between installments could also shape how readers understood what came before them.</p>
        </article>
        <div className="question panel">
          <h3>Which one of the following most accurately states the main point?</h3>
          <div className="stack">
            <div className="choice correct"><span className="letter">A</span><span>Installment breaks served a narrative purpose too.</span><span className="note">Correct answer</span></div>
            <div className="choice incorrect"><span className="letter">B</span><span>Serial novels were written only for profit.</span><span className="note">Your answer</span></div>
          </div>
          <p className="muted">Links look <a href="#reading">like this</a>.</p>
          <div className="actions"><button type="button" className="btn primary">Next question</button></div>
        </div>
      </aside>
    </div>
  );
}
