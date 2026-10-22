// next/navigation on react-router: the hooks the shared components use, and notFound/redirect, which throw
// for the page wrapper in src/router.tsx to catch.
import { useMemo } from "react";
import { useLocation, useNavigate, useSearchParams as useRouterSearchParams } from "react-router";

export class NotFound extends Error {
  constructor() { super("not found"); }
}

export class Redirect extends Error {
  constructor(readonly href: string) { super(`redirect to ${href}`); }
}

export function notFound(): never {
  throw new NotFound();
}

export function redirect(href: string): never {
  throw new Redirect(href);
}

// router.refresh() re-runs the current page and re-reads Root's session data (src/router.tsx and src/Root.tsx listen),
// as Next re-renders the page and the root layout.
const refreshes = new EventTarget();
export const refresh = () => void refreshes.dispatchEvent(new Event("refresh"));
export const onRefresh = (run: () => void) => {
  refreshes.addEventListener("refresh", run);
  return () => refreshes.removeEventListener("refresh", run);
};

export function useRouter() {
  const navigate = useNavigate();
  return useMemo(() => ({
    push: (href: string) => void navigate(href),
    replace: (href: string) => void navigate(href, { replace: true }),
    refresh,
    back: () => void navigate(-1),
  }), [navigate]);
}

export const usePathname = (): string => useLocation().pathname;

export const useSearchParams = (): URLSearchParams => useRouterSearchParams()[0];
