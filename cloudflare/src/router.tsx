// The site's routes, each one a page file from web/app inside its layout, as Next would nest them.
import { Component, createContext, startTransition, Suspense, use, useContext, useEffect, useLayoutEffect, useState, type ComponentType, type ReactNode } from "react";
import { createBrowserRouter, Navigate, Outlet, UNSAFE_DataRouterStateContext, useLocation, useParams } from "react-router";
import AppLayout from "@/app/(app)/layout";
import DrillLoading from "@/app/(app)/drill/loading";
import LearningError from "@/app/(app)/error";
import LearnLoading from "@/app/(app)/learn/loading";
import TestLoading from "@/app/(app)/practice/[test]/loading";
import PracticeLoading from "@/app/(app)/practice/loading";
import ProfileLoading from "@/app/(app)/profile/loading";
import ProgressLoading from "@/app/(app)/progress/loading";
import ResultsLoading from "@/app/(app)/results/[id]/loading";
import SettingsLoading from "@/app/(app)/settings/loading";
import TypesLoading from "@/app/(app)/types/loading";
import SiteLayout from "@/app/(site)/layout";
import SiteLoading from "@/app/(site)/loading";
import LogInLoading from "@/app/(site)/login/loading";
import SignUpLoading from "@/app/(site)/signup/loading";
import SectionError from "@/app/(test)/section/[id]/error";
import SectionLoading from "@/app/(test)/section/[id]/loading";
import NotFoundPage, { metadata as notFoundMeta } from "@/app/not-found";
import { pageTitle, SITE_URL } from "@/lib/site";
import Root from "./Root";
import { onUser, requireUser } from "./lib/supabase";
import { notFound, NotFound, onRefresh, Redirect } from "./shims/navigation";

type Props = { params: Promise<Record<string, string>>; searchParams: Promise<Record<string, string>> };
type Title = { title?: string; description?: string };
type ErrorView = ComponentType<{ error: Error; retry: () => void }>;
type PageModule = {
  default: (p: Props) => ReactNode | Promise<ReactNode>;
  metadata?: Title;
  generateMetadata?: (p: Props) => Promise<Title>;
};

const setTitle = (title?: string) => { document.title = pageTitle(title); };

/** Only Home and About are for search engines (public/robots.txt): every other page says noindex once it shows. */
function setIndexing(path: string) {
  document.querySelector('link[rel="canonical"]')?.setAttribute("href", SITE_URL + path);
  document.querySelector('meta[name="robots"]')?.remove();
  if (path !== "/" && path !== "/about") document.head.append(Object.assign(document.createElement("meta"), { name: "robots", content: "noindex" }));
}

// Home or About as prerendered (scripts/prerender.tsx), still in #root while this module runs: on the first load it
// stands in for the skeleton while the page's code loads, so the page doesn't blink.
const main = document.querySelector("#root main");
let prerendered = main ? { path: location.pathname, html: main.innerHTML } : undefined;

function SiteLoadingOrPrerendered() {
  const { pathname } = useLocation();
  return prerendered?.path === pathname ? <div style={{ display: "contents" }} dangerouslySetInnerHTML={{ __html: prerendered.html }} /> : <SiteLoading />;
}

/** Shows `fallback(error)` in place of its children when they throw; clears when `resetKey` changes. */
class Catch extends Component<{ resetKey: string; fallback: (error: unknown) => ReactNode; children: ReactNode }, { error: unknown; key: string }> {
  state = { error: null as unknown, key: this.props.resetKey };
  static getDerivedStateFromError(error: unknown) { return { error }; }
  static getDerivedStateFromProps(props: { resetKey: string }, state: { key: string }) {
    return props.resetKey === state.key ? null : { error: null, key: props.resetKey };
  }
  render() { return this.state.error === null ? this.props.children : this.props.fallback(this.state.error); }
}

// web/proxy.ts's open pages; every other page needs a session.
const OPEN = ["/", "/about", "/login", "/signup"];

type Run = Promise<{ node: ReactNode; title?: string }>;

/**
 * Page runs by visit: each navigation, Back and Forward included, gets a new location object in the router's state,
 * so a page is never shown from an earlier visit. (Not useLocation()'s copy: that is rebuilt on every render of a
 * navigation still suspended, so a same-route navigation, such as the next drill question, would start a new run on
 * each retry, forever.) Within one visit, the run for each refresh count. Re-renders of the same visit (StrictMode's,
 * or an urgent one while a refresh is pending) find their run here instead of starting another.
 * A change of user (signing in, out, or as someone else) drops them all; the same user again (lib/supabase.ts tells
 * of every check) must not refetch a running section.
 */
let runs = new WeakMap<object, Map<number, Run>>();
let user: string | null | undefined; // undefined until the first auth event says who is signed in
onUser((signedIn) => {
  const id = signedIn?.id ?? null;
  if (user !== undefined && id !== user) runs = new WeakMap();
  user = id;
});

/** The page run (one per visit and refresh) an async component inside the page belongs to. */
const PageRun = createContext<object>({});

/**
 * An async server component used inside a page, as one the browser can render (vite.config.ts rebinds each to
 * this): called once per page run and set of props, its promise read with use() under the nearest Suspense.
 * A page refresh calls it again, as Next re-renders it.
 */
export function clientAsync<P extends object>(component: (props: P) => Promise<ReactNode>) {
  const calls = new WeakMap<object, Map<string, Promise<ReactNode>>>();
  return function ClientAsync(props: P) {
    const run = useContext(PageRun);
    let mine = calls.get(run);
    if (!mine) calls.set(run, (mine = new Map()));
    // Props keyed by JSON; today's async components take none. Key on identity if one takes elements.
    const key = JSON.stringify(props);
    let call = mine.get(key);
    if (!call) mine.set(key, (call = component(props)));
    return use(call);
  };
}

/**
 * A server-component page run in the browser: called once per visit (and again on router.refresh() or "Try
 * again"), its promise read with use() under the route's loading.tsx. A thrown redirect() navigates, notFound()
 * shows not-found.tsx, and anything else shows the route's error.tsx ((app)/error.tsx unless given).
 */
export function page(mod: () => Promise<PageModule>, Loading: ComponentType = () => null, ErrorPage: ErrorView = LearningError) {
  function Run({ count }: { count: number }) {
    const location = useLocation();
    const visitKey = useContext(UNSAFE_DataRouterStateContext)!.location;
    const params = useParams() as Record<string, string>;
    let visit = runs.get(visitKey);
    if (!visit) runs.set(visitKey, (visit = new Map()));
    let result = visit.get(count);
    if (!result) {
      const search = Object.fromEntries(new URLSearchParams(location.search));
      visit.set(count, (result = (async () => {
        // web/proxy.ts: signed-out visitors only ever see log-in and sign-up; the rest send them there first.
        const [m] = await Promise.all([mod(), OPEN.includes(location.pathname) || requireUser()]);
        const props = { params: Promise.resolve(params), searchParams: Promise.resolve(search) };
        const meta = Promise.resolve(m.generateMetadata?.(props) ?? m.metadata);
        meta.catch(() => {}); // left unread when the page redirects or fails
        try {
          const node = await m.default(props);
          return { node, title: (await meta)?.title };
        } catch (error) {
          // notFound(): Next shows not-found.tsx inside the page's layouts, under the page's own title if it has one.
          if (!(error instanceof NotFound)) throw error;
          return { node: <NotFoundPage />, title: (await meta.catch(() => undefined))?.title ?? notFoundMeta.title };
        }
      })()));
    }
    const { node, title } = use(result);
    useEffect(() => setTitle(title), [title]);
    useEffect(() => setIndexing(location.pathname), [location.pathname]);
    // The page replacing its prerendered copy skips skeleton.css's ease-in: it is already showing.
    useLayoutEffect(() => {
      const same = prerendered?.path === location.pathname;
      prerendered = undefined;
      if (same) for (const a of document.getAnimations()) if (a instanceof CSSAnimation && a.animationName === "page-in") a.finish();
    }, [location.pathname]);
    return <PageRun value={result}>{node}</PageRun>;
  }

  function Page() {
    const { key } = useLocation();
    const [count, setCount] = useState(0);
    useEffect(() => onRefresh(() => startTransition(() => setCount((n) => n + 1))), []);
    const retry = () => setCount((n) => n + 1);
    const fallback = (error: unknown) => {
      if (error instanceof Redirect) return <Navigate to={error.href} replace />;
      if (error instanceof NotFound) return <NotFoundPage />; // from an async component inside the page
      return <ErrorPage error={error as Error} retry={retry} />;
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
        element: <SiteLayout><Outlet /></SiteLayout>,
        children: [
          { index: true, element: page(() => import("@/app/(site)/page"), SiteLoadingOrPrerendered) },
          { path: "about", element: page(() => import("@/app/(site)/about/page"), SiteLoadingOrPrerendered) },
          { path: "login", element: page(() => import("@/app/(site)/login/page"), LogInLoading) },
          { path: "signup", element: page(() => import("@/app/(site)/signup/page"), SignUpLoading) },
        ],
      },
      {
        element: <AppLayout><Outlet /></AppLayout>,
        children: [
          { path: "learn", element: page(() => import("@/app/(app)/learn/page"), LearnLoading) },
          { path: "types", element: page(() => import("@/app/(app)/types/page"), TypesLoading) },
          { path: "drill", element: page(() => import("@/app/(app)/drill/page"), DrillLoading) },
          { path: "practice", element: page(() => import("@/app/(app)/practice/page"), PracticeLoading) },
          { path: "practice/:test", element: page(() => import("@/app/(app)/practice/[test]/page"), TestLoading) },
          { path: "progress", element: page(() => import("@/app/(app)/progress/page"), ProgressLoading) },
          { path: "results/:id", element: page(() => import("@/app/(app)/results/[id]/page"), ResultsLoading) },
          { path: "settings", element: page(() => import("@/app/(app)/settings/page"), SettingsLoading) },
          { path: "profile", element: page(() => import("@/app/(app)/profile/page"), ProfileLoading) },
        ],
      },
      // (test) has no layout of its own: a timed section fills the window, and has its own error page.
      { path: "section/:id", element: page(() => import("@/app/(test)/section/[id]/page"), SectionLoading, SectionError) },
      // Any other address: not-found (after the sign-in check every page gets).
      { path: "*", element: page(async () => ({ default: () => notFound() })) },
    ],
  },
]);
