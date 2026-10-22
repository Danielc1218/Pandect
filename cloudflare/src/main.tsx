import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router/dom";
import { router } from "./router";
import { NotFound, Redirect } from "./shims/navigation";

// Earlier versions kept the Supabase session in localStorage; the session is in httpOnly cookies now, so drop that copy.
try {
  for (const key of Object.keys(localStorage)) if (/^sb-.*-auth-token/.test(key)) localStorage.removeItem(key);
} catch {}

createRoot(document.getElementById("root")!, {
  // redirect() and notFound() are thrown on purpose and caught by src/router.tsx; only report real errors.
  onCaughtError: (error, info) => {
    if (!(error instanceof Redirect || error instanceof NotFound)) console.error(error, info.componentStack);
  },
}).render(<StrictMode><RouterProvider router={router} /></StrictMode>);
