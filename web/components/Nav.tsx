"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense, useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";

type Item = { href: string; label: string; match?: string[] };

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

type NavProps = { items: Item[]; className: string; underline?: boolean; label: string };

/**
 * A list of links with one highlight that slides to the current link.
 * `underline` draws it as a bar under the link (top bar); otherwise as a block behind it (rail).
 * On routes with params (/results/[id]) the path is unknown while the static shell is prerendered, so the
 * links render plain until it is known and the highlight then appears.
 */
export function SlidingNav(props: NavProps) {
  const plain = (
    <nav className={props.className} aria-label={props.label}>
      {props.items.map((item) => <Link key={item.href} href={item.href}>{item.label}</Link>)}
    </nav>
  );
  return <Suspense fallback={plain}><ActiveNav {...props} /></Suspense>;
}

function ActiveNav({ items, className, underline = false, label }: NavProps) {
  const path = usePathname();
  const { ref, style } = useSlide<HTMLElement>(path, underline);
  const isActive = (item: Item) => [item.href, ...(item.match ?? [])].some((p) => (p === "/" ? path === "/" : path === p || path.startsWith(p + "/")));
  return (
    <nav ref={ref} className={`${className}${style ? " has-ind" : ""}`} aria-label={label}>
      {style && <span className="nav-ind" style={style} />}
      {items.map((item) => (
        <Link key={item.href} href={item.href} className={isActive(item) ? "active" : undefined} aria-current={isActive(item) ? "page" : undefined}>
          {item.label}
        </Link>
      ))}
    </nav>
  );
}

const SITE: Item[] = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About" },
  { href: "/learn", label: "Learning", match: ["/types", "/drill", "/practice", "/results", "/progress", "/settings"] },
];

/** `signedIn` undefined means the session is still loading: the buttons are left out until it is known. */
export function TopNav({ signedIn }: { signedIn?: boolean }) {
  return (
    <header className="top-nav">
      <Link className="brand" href="/">LSAT Prep</Link>
      <SlidingNav items={SITE} className="links" underline label="Site" />
      <span className="spacer" />
      {signedIn === undefined ? null : signedIn ? (
        <>
          <Link className="btn" href="/progress">Review mistakes</Link>
          <Link className="btn primary" href="/practice">Start a section</Link>
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
  { href: "/learn", label: "Dashboard" },
  { href: "/types", label: "Question types", match: ["/drill"] },
  { href: "/practice", label: "Practice tests", match: ["/results"] },
  { href: "/progress", label: "Progress" },
  { href: "/settings", label: "Settings" },
];

export function Rail() {
  return <SlidingNav items={APP} className="rail" label="Learning" />;
}
