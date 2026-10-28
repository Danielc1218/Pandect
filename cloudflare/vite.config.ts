import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { createServer, defineConfig, type Plugin } from "vite";
import { applyPrefs } from "../web/lib/prefs";

const here = (path: string) => fileURLToPath(new URL(path, import.meta.url));
const web = here("../web/");

// next/* modules the shared files import, and the server-only web/lib modules, swapped for browser versions.
const SHIMS: Record<string, string> = {
  "next/link": here("src/shims/link.tsx"),
  "next/navigation": here("src/shims/navigation.ts"),
  "next/cache": here("src/shims/cache.ts"),
};
const SWAPS = new Map(["supabase", "bank", "auth", "actions", "answerKey", "run"].map((name) => [`${web}lib/${name}.ts`, here(`src/lib/${name}.ts`)]));
const EMPTY = "\0empty";
const NO_ROUTER = "\0no-router";
const ROUTER = here("src/router.tsx");

// web/app/layout.tsx's pre-paint scripts: the theme, then this device's display preferences.
const THEME_SCRIPT = `try{var t=localStorage.getItem("theme")}catch(e){}document.documentElement.dataset.theme=t||(matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light")`;
const PREFS_SCRIPT = `try{(${applyPrefs.toString()})(JSON.parse(localStorage.getItem("prefs")||"{}"))}catch(e){}`;

function nextShims(): Plugin {
  return {
    name: "next-shims",
    enforce: "pre",
    async resolveId(source, importer, options) {
      if (source in SHIMS) return SHIMS[source];
      // Anything else from Next would be bundled as-is and break at run time, so the build stops here instead.
      if (source.startsWith("next/")) this.error(`${source} (imported by ${importer}) has no browser shim: add one to SHIMS in vite.config.ts`);
      if (source === "server-only") return EMPTY;
      // Prerendering (prerender() below) never navigates, and the browser router can't be made without a window.
      if (options?.ssr && source === "../router" && importer?.startsWith(here("src/lib/"))) return NO_ROUTER;
      // Only web's files get the swaps; src/lib may build on the web module it replaces.
      if (!importer?.startsWith(web)) return null;
      const resolved = await this.resolve(source, importer, { ...options, skipSelf: true });
      return resolved && SWAPS.has(resolved.id) ? SWAPS.get(resolved.id) : resolved;
    },
    load: (id) => (id === EMPTY ? "export {}" : id === NO_ROUTER ? "export const router = undefined;" : null),
    // An async server component used inside a page (components/StartButton.tsx's StartButton, practice's
    // RandomSections) can't render in the browser: rebind each one to clientAsync's wrapper (src/router.tsx).
    // Callers read the binding at render time, after the module has run.
    // When prerendering (prerender() below) each one suspends instead, so its Suspense fallback is what's written.
    transform(code, id, options) {
      if (!id.startsWith(web) || !id.endsWith(".tsx")) return null;
      const names = [...code.matchAll(/^async function ([A-Z]\w*)\s*[(<]/gm)].map((m) => m[1]);
      if (!names.length) return null;
      if (options?.ssr) return `${code}\n${names.map((n) => `${n} = () => { throw new Promise(() => {}); };`).join("\n")}\n`;
      return `${code}\nimport { clientAsync as __clientAsync } from ${JSON.stringify(ROUTER)};\n${names.map((n) => `${n} = __clientAsync(${n});`).join("\n")}\n`;
    },
    transformIndexHtml: () => [THEME_SCRIPT, PREFS_SCRIPT].map((children) => ({ tag: "script", children, injectTo: "head-prepend" as const })),
  };
}

// After the build, Home and About as static HTML in dist/index.html and dist/about.html (scripts/prerender.tsx).
function prerender(): Plugin {
  return {
    name: "prerender",
    apply: "build",
    async closeBundle() {
      const server = await createServer({ configFile: here("vite.config.ts"), server: { middlewareMode: true, hmr: false }, appType: "custom", logLevel: "error",
        // next/* must go through the shims rather than load from web/node_modules as-is.
        ssr: { noExternal: ["next"] } });
      try {
        const { render } = await server.ssrLoadModule(here("scripts/prerender.tsx"));
        const shell = await readFile(here("dist/index.html"), "utf8");
        // about.html, not about/index.html: Pages serves that at /about, where about/index.html would redirect to /about/.
        await writeFile(here("dist/about.html"), render("/about", shell));
        await writeFile(here("dist/index.html"), render("/", shell));
      } finally {
        await server.close();
      }
    },
  };
}

// The browser needs no Supabase settings: it only calls this site's /api (functions/), which holds them.
export default defineConfig({
  root: here("."),
  publicDir: "public",
  plugins: [nextShims(), react(), prerender()],
  // web's files resolve react from web/node_modules; one copy for the whole app.
  resolve: { alias: { "@": here("../web") }, dedupe: ["react", "react-dom", "react-router"] },
  server: { fs: { allow: [here("..")] } },
});
