// Home and About as static HTML, so crawlers that don't run JS see them (vite.config.ts's prerender step runs this
// after the build). The browser then renders the app over #root with createRoot, as on any other page.
import { renderToStaticMarkup } from "react-dom/server";
import { StaticRouter } from "react-router";
import * as about from "@/app/(site)/about/page";
import SiteLayout from "@/app/(site)/layout";
import * as home from "@/app/(site)/page";
import { TopNav } from "@/components/Nav";
import { pageTitle, SITE_URL } from "@/lib/site";

const PAGES = { "/": home, "/about": about };

const attr = (s: string) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");

/** The built index.html (`shell`) with one page's title, description, canonical address and content filled in. */
export function render(path: keyof typeof PAGES, shell: string) {
  const { default: Page, metadata } = PAGES[path];
  const title = attr(pageTitle("title" in metadata ? metadata.title : undefined));
  const description = attr(metadata.description);
  const url = SITE_URL + path;
  // Root's skip link and top bar (signed-in state unknown, so no account buttons), then the page in its layout.
  // Start's session check suspends, so its sign-up fallback is what's written.
  const body = renderToStaticMarkup(
    <StaticRouter location={path}>
      <a className="skip-link" href="#main">Skip to content</a>
      <TopNav />
      <SiteLayout><Page /></SiteLayout>
    </StaticRouter>,
  );
  const head = [
    `<title>${title}</title>`,
    `<meta name="description" content="${description}" />`,
    `<link rel="canonical" href="${url}" />`,
    `<meta property="og:url" content="${url}" />`,
    `<meta property="og:title" content="${title}" />`,
    `<meta property="og:description" content="${description}" />`,
  ].join("\n    ");
  // dist/index.html is also the SPA fallback for every other address: empty #root there before it paints.
  const clear = path === "/" ? `<script>if(location.pathname!=="/")document.getElementById("root").replaceChildren()</script>` : "";
  return shell
    .replace(/<title>[^<]*<\/title>/, () => head)
    .replace('<div id="root"></div>', () => `<div id="root">${body}</div>${clear}`);
}
