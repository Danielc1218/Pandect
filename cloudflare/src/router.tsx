// The site's routes, each one a page file from web/app inside its layout, as Next would nest them.
import { Component, startTransition, Suspense, use, useEffect, useState, type ComponentType, type ReactNode } from "react";
import { createBrowserRouter, Navigate, Outlet, useLocation, useParams } from "react-router";
import AppLayout from "@/app/(app)/layout";
import LearningError from "@/app/(app)/error";
import TypesLoading from "@/app/(app)/types/loading";
import SiteLayout from "@/app/(site)/layout";
import LogInLoading from "@/app/(site)/login/loading";
import SignUpLoading from "@/app/(site)/signup/loading";
import NotFoundPage, { metadata as notFoundMeta } from "@/app/not-found";
import Root from "./Root";
import { requireUser, supabase } from "./lib/supabase";
import { notFound, NotFound, onRefresh, Redirect } from "./shims/navigation";

type Props = { params: Promise<Record<string, string>>; searchParams: Promise<Record<string, string>> };
type Title = { title?: string };
type PageModule = {
  default: (p: Props) => ReactNode | Promise<ReactNode>;
  metadata?: Title;
  generateMetadata?: (p: Props) => Promise<Title>;
};

const setTitle = (title?: string) => { document.title = title ? `${title} · LSAT Prep` : "LSAT Prep"; };

/** Shows `fallback(error)` in place of its children when they throw; clears when `resetKey` changes. */
class Catch extends Component<{ resetKey: string; fallback: (error: unknown) => ReactNode; children: ReactNode }, { error: unknown; key: string }> {
  state = { error: null as unknown, key: this.props.resetKey };
  static getDerivedStateFromError(error: unknown) { return { error }; }
  static getDerivedStateFromProps(props: { resetKey: string }, state: { key: string }) {
    return props.resetKey === state.key ? null : { error: null, key: props.resetKey };
  }
  render() { return this.state.error === null ? this.props.children : this.props.fallback(this.state.error); }
}

function Missing() {
  useEffect(() => setTitle(notFoundMeta.title), []);
  return <NotFoundPage />;
}

/** Above the layouts, like Next's root not-found boundary: a page's notFound() replaces its layout too. */
function NotFoundBoundary() {
  const { key } = useLocation();
  const fallback = (error: unknown) => {
    if (error instanceof NotFound) return <Missing />;
    throw error;
  };
  return <Catch resetKey={key} fallback={fallback}><Outlet /></Catch>;
}

type Run = Promise<{ node: ReactNode; title?: string }>;

/**
 * Page runs by visit: each navigation, Back and Forward included, gets a new location object, so a page is never
 * shown from an earlier visit; within one visit, the run for each refresh count. Re-renders of the same visit
 * (StrictMode's, or an urgent one while a refresh is pending) find their run here instead of starting another.
 * Signing in or out drops them all.
 */
let runs = new WeakMap<object, Map<number, Run>>();
supabase().then((db) => db.auth.onAuthStateChange((event) => {
  if (event === "SIGNED_IN" || event === "SIGNED_OUT") runs = new WeakMap();
}));

/**
 * A server-component page run in the browser: called once per visit (and again on router.refresh() or "Try
 * again"), its promise read with use() under the route's loading.tsx. A thrown redirect() navigates, notFound()
 * goes up to NotFoundBoundary, and anything else shows (app)/error.tsx.
 */
export function page(mod: () => Promise<PageModule>, Loading: ComponentType = () => null) {
  function Run({ count }: { count: number }) {
    const location = useLocation();
    const params = useParams() as Record<string, string>;
    let visit = runs.get(location);
    if (!visit) runs.set(location, (visit = new Map()));
    let result = visit.get(count);
    if (!result) {
      const search = Object.fromEntries(new URLSearchParams(location.search));
      visit.set(count, (result = (async () => {
        const m = await mod();
        const props = { params: Promise.resolve(params), searchParams: Promise.resolve(search) };
        const [node, meta] = await Promise.all([m.default(props), m.generateMetadata?.(props) ?? m.metadata]);
        return { node, title: meta?.title };
      })()));
    }
    const { node, title } = use(result);
    useEffect(() => setTitle(title), [title]);
    return node;
  }

  function Page() {
    const { key } = useLocation();
    const [count, setCount] = useState(0);
    useEffect(() => onRefresh(() => startTransition(() => setCount((n) => n + 1))), []);
    const retry = () => setCount((n) => n + 1);
    const fallback = (error: unknown) => {
      if (error instanceof Redirect) return <Navigate to={error.href} replace />;
      if (error instanceof NotFound) throw error;
      return <LearningError error={error as Error} retry={retry} />;
    };
    return (
      <Catch resetKey={`${key}:${count}`} fallback={fallback}>
        <Suspense fallback={<Loading />}><Run count={count} /></Suspense>
      </Catch>
    );
  }

  return <Page />;
}

export const router = createBrowserRouter([
  {
    element: <Root />,
    children: [
      {
        element: <NotFoundBoundary />,
        children: [
          {
            element: <SiteLayout><Outlet /></SiteLayout>,
            children: [
              { path: "login", element: page(() => import("@/app/(site)/login/page"), LogInLoading) },
              { path: "signup", element: page(() => import("@/app/(site)/signup/page"), SignUpLoading) },
            ],
          },
          {
            element: <AppLayout><Outlet /></AppLayout>,
            children: [
              { path: "types", element: page(() => import("@/app/(app)/types/page"), TypesLoading) },
            ],
          },
          // Any other address: signed-out visitors log in first (web/proxy.ts), everyone else gets not-found.
          { path: "*", element: page(async () => ({ default: async () => { await requireUser(); notFound(); } })) },
        ],
      },
    ],
  },
]);
