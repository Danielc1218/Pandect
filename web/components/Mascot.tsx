import type { CSSProperties } from "react";

/** Original panda artwork, shared by the public pages and learning dashboard. */
export type MascotAnimation = "type" | "gavel" | "wave" | "thinking" | "head-turn" | "run" | "celebrate" | "coffee" | "sleepy" | "read";

export function MascotPeek() {
  return (
    <div className="mascot-hero" aria-hidden="true">
      <div className="mascot-hero-orbit" />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="mascot-hero-panda" src="/mascot/brand/peek.webp" alt="" width={256} height={256} fetchPriority="high" />
    </div>
  );
}

export function Mascot({ animation, className = "" }: { animation: MascotAnimation; className?: string }) {
  const frames = animation === "head-turn" ? 48 : 32;
  return (
    <div className={`mascot-figure mascot-${animation} ${className}`} style={{ "--mascot-frames": frames } as CSSProperties} aria-hidden="true">
      <div className="mascot-sprite-window">
        {/* CSS only controls playback of the drawn poses. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="mascot-strip" src={`/mascot/animations/v4/${animation}/strip.webp`} alt="" width={frames * 320} height={320} loading="lazy" decoding="async" />
      </div>
    </div>
  );
}

export function MascotCard({ animation, className = "" }: { animation: MascotAnimation; className?: string }) {
  return <Mascot animation={animation} className={`mascot-card mascot-card--${animation} ${className}`} />;
}
