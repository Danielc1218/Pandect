/** Original panda artwork, shared by the public pages and learning dashboard. */
export type MascotAnimation = "type" | "gavel" | "wave" | "thinking" | "head-turn" | "run" | "celebrate" | "coffee" | "sleepy" | "read";

const LAYERS: Record<MascotAnimation, readonly string[]> = {
  type: ["base", "paw", "blink"],
  gavel: ["base", "arm"],
  wave: ["base", "arm", "jacket-cover", "blink"],
  thinking: ["base", "head", "blink", "paw", "question"],
  "head-turn": ["base", "head-0", "head-1", "head-2", "head-3"],
  run: ["base", "pose-1", "pose-2", "pose-3", "pose-4", "pose-5", "pose-6", "pose-7"],
  celebrate: ["base", "left-arm", "right-arm"],
  coffee: ["base", "cup"],
  sleepy: ["base", "head", "yawn"],
  read: ["base", "book-0", "book-1", "book-2", "blink"],
};

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
  return (
    <div className={`mascot-figure mascot-${animation} ${className}`} aria-hidden="true">
      <div className="mascot-sprite-window">
        {LAYERS[animation].map((layer) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={layer} className={`mascot-layer mascot-layer--${layer}`} src={`/mascot/rig/${animation}/${layer}.webp`} alt="" width={320} height={320} loading="lazy" decoding="async" />
        ))}
      </div>
    </div>
  );
}

export function MascotCard({ animation, className = "" }: { animation: MascotAnimation; className?: string }) {
  return <Mascot animation={animation} className={`mascot-card mascot-card--${animation} ${className}`} />;
}
