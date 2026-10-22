"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense, useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { updatePreferences } from "./Prefs";

/** `icon` is the path data of a 24×24 outline icon drawn before the label. */
type Item = { href: string; label: string; match?: string[]; icon?: string };

const Icon = ({ d }: { d?: string }) =>
  d ? <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d} /></svg> : null;

/** Measures the `.active` child of a container so one highlight can slide to it. Re-measures when `dep` changes. */
export function useSlide<T extends HTMLElement>(dep: unknown, underline = false) {
  const ref = useRef<T>(null);
  const [style, setStyle] = useState<CSSProperties | null>(null);
  const measure = () => {
    const el = ref.current?.querySelector<HTMLElement>(".active");
    if (!el) return setStyle(null);
    setStyle(
      underline
        ? { transform: `translateX(${el.offsetLeft}px)`, width: el.offsetWidth }
        : { transform: `translate(${el.offsetLeft}px, ${el.offsetTop}px)`, width: el.offsetWidth, height: el.offsetHeight },
    );
  };
  useLayoutEffect(measure, [dep]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    document.fonts?.ready.then(measure);
    addEventListener("resize", measure);
    return () => removeEventListener("resize", measure);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return { ref, style };
}

type NavProps = { items: Item[]; className: string; underline?: boolean; label: string; children?: ReactNode };

/**
 * A list of links with one highlight that slides to the current link.
 * `underline` draws it as a bar under the link (top bar); otherwise as a block behind it (rail).
 * On routes with params (/results/[id]) the path is unknown while the static shell is prerendered, so the
 * links render plain until it is known and the highlight then appears.
 */
export function SlidingNav(props: NavProps) {
  const plain = (
    <nav className={props.className} aria-label={props.label}>
      {props.items.map((item) => <Link key={item.href} href={item.href}><Icon d={item.icon} />{item.label}</Link>)}
      {props.children}
    </nav>
  );
  return <Suspense fallback={plain}><ActiveNav {...props} /></Suspense>;
}

function ActiveNav({ items, className, underline = false, label, children }: NavProps) {
  const path = usePathname();
  const { ref, style } = useSlide<HTMLElement>(path, underline);
  // On a phone the rail is one sideways-scrolling row: keep the current link in view (no page scroll).
  useEffect(() => {
    const nav = ref.current, el = nav?.querySelector<HTMLElement>(".active");
    if (nav && el && nav.scrollWidth > nav.clientWidth) nav.scrollLeft = el.offsetLeft - (nav.clientWidth - el.offsetWidth) / 2;
  }, [path, ref]);
  const isActive = (item: Item) => [item.href, ...(item.match ?? [])].some((p) => (p === "/" ? path === "/" : path === p || path.startsWith(p + "/")));
  return (
    <nav ref={ref} className={`${className}${style ? " has-ind" : ""}`} aria-label={label}>
      {style && <span className="nav-ind" style={style} />}
      {items.map((item) => (
        <Link key={item.href} href={item.href} className={isActive(item) ? "active" : undefined} aria-current={isActive(item) ? "page" : undefined}>
          <Icon d={item.icon} />{item.label}
        </Link>
      ))}
      {children}
    </nav>
  );
}

const SITE: Item[] = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About" },
  { href: "/learn", label: "Learning", match: ["/types", "/drill", "/practice", "/results", "/progress", "/settings", "/profile"] },
];

/**
 * The light/dark switch saves the same profile preference as the settings page.
 */
export function ThemeToggle({ signedIn }: { signedIn?: boolean }) {
  const flip = () => {
    const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    void updatePreferences({ theme: next }, signedIn === true);
  };
  return (
    <button type="button" className="theme-toggle" onClick={flip} aria-label="Switch between dark and light mode" title="Dark or light mode">
      <svg className="moon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" /></svg>
      <svg className="sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
        <circle cx="12" cy="12" r="4" fill="currentColor" />
        <path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
      </svg>
    </button>
  );
}

/** `signedIn` undefined means the session is still loading: the buttons are left out until it is known. */
export function TopNav({ signedIn }: { signedIn?: boolean }) {
  return (
    <header className="top-nav">
      <Link className="brand" href="/">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="brand-mark mascot-brand" src="/mascot/brand/peek.webp" alt="" width={40} height={40} />
        LSAT Prep
      </Link>
      <SlidingNav items={SITE} className="links" underline label="Site" />
      <span className="spacer" />
      <ThemeToggle signedIn={signedIn} />
      {signedIn === undefined ? null : signedIn ? (
        <>
          <Link className="icon-btn" href="/settings" aria-label="Settings" title="Settings">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </Link>
          <Link className="icon-btn" href="/profile" aria-label="Profile" title="Profile">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="7" r="4" /><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            </svg>
          </Link>
        </>
      ) : (
        <>
          <Link className="btn" href="/login">Log in</Link>
          <Link className="btn primary" href="/signup">Start free</Link>
        </>
      )}
    </header>
  );
}

const APP: Item[] = [
  { href: "/learn", label: "Dashboard", icon: "M3 3h7v9H3zM14 3h7v5h-7zM14 12h7v9h-7zM3 16h7v5H3z" },
  { href: "/types", label: "Question types", match: ["/drill"], icon: "M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" },
  { href: "/practice", label: "Practice tests", match: ["/results"], icon: "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 6v6l4 2" },
  { href: "/progress", label: "Progress", icon: "M3 3v18h18M7 15l4-4 3 3 5-6" },
];

export function Rail() {
  return (
    <SlidingNav items={APP} className="rail" label="Learning">
      <Link className="btn primary" href="/practice">Start a section</Link>
      <Link className="btn" href="/progress#by-type">Review mistakes</Link>
    </SlidingNav>
  );
}
