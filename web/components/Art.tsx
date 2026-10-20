import type { CSSProperties, ReactNode } from "react";

/**
 * The site's pictures: rounded tiles and rings drawn in shades of the primary color (the --tile-* colors in
 * mock.css), so a chosen accent recolors them, with one piece in the highlight yellow. Each one stands for its
 * page: a chain of reasoning, a clock, rising steps, lines of a passage. mock.css animates them: the hero builds
 * itself, and a card's picture acts itself out under the pointer. Decorative, so hidden from screen readers.
 */
export type ArtKind = "hero" | "logic" | "columns" | "desk" | "reading" | "about";

const BG = "var(--tile-bg)", LIGHT = "var(--tile-light)", MID = "var(--tile-mid)", DARK = "var(--tile-dark)", POP = "var(--color-accent)";
const DOTS = { fill: "none", strokeWidth: 14, strokeLinecap: "round", strokeDasharray: "0 30" } as const;

function Hero() {
  const y = 368, r = 105;
  return (
    <>
      <circle cx="300" cy="200" r="260" fill={MID} opacity="0.25" />
      <g className="arc"><circle cx="1224" cy="864" r="576" fill={MID} /><circle cx="1224" cy="864" r="336" fill={DARK} /></g>
      <circle className="t link" style={{ "--d": "0.1s" } as CSSProperties} cx="250" cy={y} r={r} fill="none" stroke={LIGHT} strokeWidth="30" />
      <circle className="t link" style={{ "--d": "0.25s" } as CSSProperties} cx="400" cy={y} r={r} fill="none" stroke={LIGHT} strokeWidth="30" />
      <circle className="t gap" cx="700" cy={y} r={r} stroke={LIGHT} {...DOTS} />
      <circle className="t end" cx="550" cy={y} r={r} fill="none" stroke={POP} strokeWidth="30" />
      <circle className="t dot" cx="550" cy={y} r="26" fill={POP} />
    </>
  );
}

// Premises linked to a conclusion (yellow); the dotted ring is the unstated assumption, which fills in on hover.
function Logic() {
  const y = 300, r = 112, xs = [345, 513, 681, 849];
  return (
    <>
      {xs.slice(0, 2).map((x) => <circle key={x} cx={x} cy={y} r={r} fill="none" stroke={LIGHT} strokeWidth="30" />)}
      <circle cx={xs[2]} cy={y} r={r} stroke={LIGHT} {...DOTS} />
      <circle className="fillin" pathLength={1} cx={xs[2]} cy={y} r={r} fill="none" stroke={LIGHT} strokeWidth="30" transform={`rotate(-90 ${xs[2]} ${y})`} />
      <g className="t lock"><circle cx={xs[3]} cy={y} r={r} fill="none" stroke={POP} strokeWidth="30" /><circle cx={xs[3]} cy={y} r="30" fill={POP} /></g>
    </>
  );
}

// A clock face with an arc for the time used, which sweeps round on hover.
function Clock() {
  const cx = 600, cy = 300, R = 190;
  return (
    <>
      <circle cx={cx} cy={cy} r={R} fill="none" stroke={LIGHT} strokeWidth="30" opacity="0.35" />
      <circle cx={cx} cy={cy} r={R - 70} fill={MID} />
      <circle cx={cx} cy={cy} r={R - 140} fill={DARK} />
      {Array.from({ length: 12 }, (_, i) => {
        const a = (i / 12) * 2 * Math.PI;
        return <circle key={i} cx={cx + Math.sin(a) * (R + 42)} cy={cy - Math.cos(a) * (R + 42)} r="9" fill={LIGHT} />;
      })}
      <circle className="sweep" pathLength={100} cx={cx} cy={cy} r={R} fill="none" stroke={POP} strokeWidth="30" strokeLinecap="round" strokeDasharray="70 100" transform={`rotate(-90 ${cx} ${cy})`} />
      <circle className="t dot" cx={cx} cy={cy} r="22" fill={POP} />
    </>
  );
}

// Steps rising to the yellow one; they hop up in turn on hover.
function Steps() {
  const pts = Array.from({ length: 6 }, (_, i) => [230 + i * 148, 430 - i * (i + 3) * 7, 26 + i * 9]);
  return (
    <>
      <path d={`M${pts.map(([x, y]) => `${x},${y}`).join(" L")}`} fill="none" stroke={LIGHT} strokeWidth="12" strokeLinejoin="round" opacity="0.5" />
      {pts.map(([x, y, r], i) => <circle key={i} className="t step" style={{ "--i": i } as CSSProperties} cx={x} cy={y} r={r} fill={i === 5 ? POP : [LIGHT, MID][i % 2]} />)}
    </>
  );
}

// Lines of a passage with one phrase highlighted; the highlight sweeps across on hover.
function Passage() {
  // kept within x 200-1000, the part the Learning page's narrow card shows
  const lens = [480, 440, 512, 352, 464, 256], x = 220, h = 30, gap = 22, y0 = (600 - (6 * h + 5 * gap)) / 2, hy = y0 + 2 * (h + gap);
  return (
    <>
      <circle cx="880" cy="300" r="105" fill={DARK} />
      <circle cx="880" cy="300" r="105" stroke={LIGHT} {...DOTS} />
      {lens.map((l, i) => <rect key={i} x={x} y={y0 + i * (h + gap)} width={l} height={h} rx={h / 2} fill={LIGHT} opacity="0.9" />)}
      <rect className="mark" x={x + 140} y={hy - 8} width="270" height={h + 16} rx={(h + 16) / 2} fill={POP} />
    </>
  );
}

// A field of rounded tiles, one picked out in yellow: the question type you are working on.
function Tiles() {
  const s = 150, r = 58, tiles = [];
  for (let j = 0; j < 6; j++) for (let i = 0; i < 8; i++) {
    if ((i + 2 * j) % 4 === 1 && i > 0) continue; // the right half of a pill
    const pill = (i + 2 * j) % 4 === 0 && i < 7, x = 75 + i * s, y = 25 + j * s, picked = i === 4 && j === 3;
    const fill = picked ? POP : [LIGHT, MID, DARK][(i * 2 + j) % 3], style = { "--k": i + j } as CSSProperties;
    tiles.push(pill
      ? <rect key={`${i}-${j}`} className="t tile" style={style} x={x - r} y={y - r} width={s + 2 * r} height={2 * r} rx={r} fill={fill} />
      : <circle key={`${i}-${j}`} className={`t tile${picked ? " dot" : ""}`} style={style} cx={x} cy={y} r={r} fill={fill} />);
  }
  return <>{tiles}</>;
}

const DRAW: Record<ArtKind, [() => ReactNode, number]> = {
  hero: [Hero, 800], about: [Tiles, 800], logic: [Logic, 600], columns: [Clock, 600], desk: [Steps, 600], reading: [Passage, 600],
};

export function Art({ kind, className = "" }: { kind: ArtKind; className?: string }) {
  const [Draw, h] = DRAW[kind];
  return (
    <svg className={`art art-${kind} ${className}`} viewBox={`0 0 1200 ${h}`} preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
      <rect width="1200" height={h} fill={BG} />
      <Draw />
    </svg>
  );
}
