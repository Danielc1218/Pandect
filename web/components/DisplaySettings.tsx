"use client";

import { useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { savePreferences } from "@/lib/actions";
import { applyPrefs, DEFAULT_PREFS, RANGES, SAVED_MAX, storePrefs, type Prefs } from "@/lib/prefs";
import { markEdited, usePrefs } from "./Prefs";

type Theme = "system" | "light" | "dark";

// The theme lives on <html> and in storage, outside React (the top bar's switch changes it too), so it is read
// from there and re-read whenever <html>'s attributes change.
const watchHtml = (onChange: () => void) => {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true });
  return () => observer.disconnect();
};
const readTheme = (): Theme => {
  let saved: string | null = null;
  try { saved = localStorage.getItem("theme"); } catch {}
  return saved === "light" || saved === "dark" ? saved : "system";
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

function Choice<T extends string | number>({ legend, name, value, options, onChange }: {
  legend: string; name: string; value: T; options: [T, ReactNode][]; onChange: (v: T) => void;
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
    </fieldset>
  );
}

const ACCENTS: [string, string][] = [["", "Green (default)"], ["#1f5fae", "Blue"], ["#127a7a", "Teal"], ["#6b3fa0", "Purple"],
  ["#b3261e", "Red"], ["#b45309", "Orange"], ["#44546a", "Slate"]];
const TINTS: [string, string][] = [["", "None"], ["#f8f1df", "Cream"], ["#eadbbd", "Sepia"], ["#e9eef4", "Cool"],
  ["#e6f2ea", "Mint"], ["#f6e8ea", "Rose"], ["#ece8f6", "Lavender"]];

/**
 * One color setting: preset swatches, the user's saved colors (each can be forgotten), a picker for any color,
 * and Save to keep the picked one as a swatch. `value` "" is the preset whose color is `fallback` (struck through
 * when `none`, as for no tint).
 */
function ColorChoice({ id, legend, value, presets, saved, fallback, none, disabled, onChange, onSaved }: {
  id: string; legend: string; value: string; presets: [string, string][]; saved: string[]; fallback: string; none?: boolean; disabled?: boolean;
  onChange: (color: string) => void; onSaved: (list: string[]) => void;
}) {
  const known = presets.some(([c]) => c === value) || saved.includes(value);
  const swatch = (color: string, name: string, forget?: () => void) => (
    <span key={color || "none"} className="swatch-choice">
      <button type="button" aria-pressed={value === color} title={name} aria-label={name} disabled={disabled} onClick={() => onChange(color)}
              style={{ background: color || fallback }} className={!color && none ? "plain" : undefined} />
      {forget && <button type="button" className="forget" aria-label={`Forget ${name}`} title="Forget this color" onClick={forget}>×</button>}
    </span>
  );
  return (
    <fieldset className="field color-choice" disabled={disabled}>
      <legend>{legend}</legend>
      <div className="accent-row">
        {presets.map(([c, name]) => swatch(c, name))}
        {saved.map((c) => swatch(c, `Saved color ${c}`, () => onSaved(saved.filter((x) => x !== c))))}
      </div>
      <div className="accent-row">
        <label htmlFor={id} className="muted">Any color</label>
        <input id={id} type="color" value={value || fallback} onChange={(e) => onChange(e.target.value)} />
        <button type="button" className="btn" disabled={!value || known || saved.length >= SAVED_MAX} onClick={() => onSaved([...saved, value])}>
          Save this color
        </button>
      </div>
    </fieldset>
  );
}

function Check({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="check">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span>{label}</span>
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
  const theme = useSyncExternalStore<Theme>(watchHtml, readTheme, () => "system");

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
                  options={[["inter", "Inter"], ["atkinson", "Atkinson Hyperlegible"], ["lexend", "Lexend"]]} />
          <Choice legend="Passage font" name="passage-font" value={prefs.passageFont} onChange={(v) => update({ passageFont: v })}
                  options={[["same", "Same as the rest"], ["serif", <span key="s" style={{ fontFamily: "Georgia, serif" }}>Serif, like a printed test</span>], ["atkinson", "Atkinson Hyperlegible"]]} />
        </section>

        <section className="panel prefs-group" aria-labelledby="colors">
          <h2 id="colors">Colors</h2>
          <Choice legend="Theme" name="theme" value={theme} onChange={chooseTheme}
                  options={[["system", "Match this device"], ["light", "Light"], ["dark", "Dark"]]} />
          <Check label="High contrast" checked={prefs.contrast === "high"} onChange={(v) => update({ contrast: v ? "high" : "normal" })} />
          <ColorChoice id="accent" legend="Accent color" value={prefs.accent} presets={ACCENTS} saved={prefs.savedAccents} fallback="#1e6b43"
                        disabled={prefs.contrast === "high"} onChange={(accent) => update({ accent })} onSaved={(savedAccents) => update({ savedAccents })} />
          <ColorChoice id="tint" legend="Background tint" value={prefs.tint} presets={TINTS} saved={prefs.savedTints} fallback="#ffffff" none
                        disabled={prefs.contrast === "high"} onChange={(tint) => update({ tint })} onSaved={(savedTints) => update({ savedTints })} />
          <Choice legend="Right and wrong answers" name="markers" value={prefs.markers} onChange={(v) => update({ markers: v })}
                  options={[["standard", "Green and red"], ["colorblind", "Blue and orange, with ✓ and ✗"]]} />
        </section>

        <section className="panel prefs-group" aria-labelledby="motion">
          <h2 id="motion">Motion and focus</h2>
          <Choice legend="Animation" name="motion" value={prefs.motion} onChange={(v) => update({ motion: v })}
                  options={[["system", "Match this device"], ["reduce", "Reduce motion"]]} />
          <Check label="Stronger focus outline" checked={prefs.focus === "strong"} onChange={(v) => update({ focus: v ? "strong" : "standard" })} />
        </section>

        <section className="panel prefs-group" aria-labelledby="tests">
          <h2 id="tests">Timed sections</h2>
          <Choice legend="Time allowed" name="extra-time" value={prefs.extraTime} onChange={(v) => update({ extraTime: v })}
                  options={[[1, "Standard (35 minutes)"], [1.5, "Time and a half (52\u00bd minutes)"], [2, "Double time (70 minutes)"]]} />
          <Check label="Hide the timer until 5 minutes are left" checked={prefs.hideTimer} onChange={(v) => update({ hideTimer: v })} />
          <Choice legend="Passage and questions" name="layout" value={prefs.layout} onChange={(v) => update({ layout: v })}
                  options={[["side", "Side by side"], ["stacked", "Passage above the questions"]]} />
        </section>

        <div className="actions spread">
          <p role="status" className="muted" style={{ margin: 0 }}>{status}</p>
          <button type="button" className="btn" onClick={() => {
            if (!confirm("Put every display setting back to how it started?")) return;
            // back to the defaults, keeping the colors saved for picking again
            update({ ...DEFAULT_PREFS, savedAccents: prefs.savedAccents, savedTints: prefs.savedTints });
            chooseTheme("system");
          }}>Reset everything</button>
        </div>
      </div>

      {/* a picture of the settings at work: inert, so its button can't be focused or pressed */}
      <aside className="preview stack" aria-label="Preview" inert>
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
          <div className="actions"><button type="button" className="btn primary">Next question</button></div>
        </div>
      </aside>
    </div>
  );
}
