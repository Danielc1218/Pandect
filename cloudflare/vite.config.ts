import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv, type Plugin } from "vite";
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
      // Only web's files get the swaps; src/lib may build on the web module it replaces.
      if (!importer?.startsWith(web)) return null;
      const resolved = await this.resolve(source, importer, { ...options, skipSelf: true });
      return resolved && SWAPS.has(resolved.id) ? SWAPS.get(resolved.id) : resolved;
    },
    load: (id) => (id === EMPTY ? "export {}" : null),
    // An async server component used inside a page (components/StartButton.tsx's StartButton, practice's
    // RandomSections) can't render in the browser: rebind each one to clientAsync's wrapper (src/router.tsx).
    // Callers read the binding at render time, after the module has run.
    transform(code, id) {
      if (!id.startsWith(web) || !id.endsWith(".tsx")) return null;
      const names = [...code.matchAll(/^async function ([A-Z]\w*)\s*[(<]/gm)].map((m) => m[1]);
      if (!names.length) return null;
      return `${code}\nimport { clientAsync as __clientAsync } from ${JSON.stringify(ROUTER)};\n${names.map((n) => `${n} = __clientAsync(${n});`).join("\n")}\n`;
    },
    transformIndexHtml: () => [THEME_SCRIPT, PREFS_SCRIPT].map((children) => ({ tag: "script", children, injectTo: "head-prepend" as const })),
  };
}

// The browser's Supabase settings. A build without them still succeeds but every page fails, so stop it here.
const REQUIRED_ENV = ["VITE_SUPABASE_URL", "VITE_SUPABASE_PUBLISHABLE_KEY"];

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, here("."), "VITE_");
  const missing = REQUIRED_ENV.filter((name) => !env[name]);
  if (missing.length) throw new Error(`${missing.join(" and ")} missing: set them in cloudflare/.env or the environment`);
  return {
    root: here("."),
    publicDir: "public",
    plugins: [nextShims(), react()],
    // web's files resolve react from web/node_modules; one copy for the whole app.
    resolve: { alias: { "@": here("../web") }, dedupe: ["react", "react-dom", "react-router", "@supabase/supabase-js"] },
    server: { fs: { allow: [here("..")] } },
  };
});
