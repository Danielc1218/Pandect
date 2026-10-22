import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router/dom";
import { router } from "./router";
import { NotFound, Redirect } from "./shims/navigation";

createRoot(document.getElementById("root")!, {
  // redirect() and notFound() are thrown on purpose and caught by src/router.tsx; only report real errors.
  onCaughtError: (error, info) => {
    if (!(error instanceof Redirect || error instanceof NotFound)) console.error(error, info.componentStack);
  },
}).render(<StrictMode><RouterProvider router={router} /></StrictMode>);
