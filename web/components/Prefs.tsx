"use client";

import { useEffect, useMemo, useSyncExternalStore } from "react";
import { applyPrefs, DEFAULT_PREFS, loadPrefs, sanitize, storePrefs, type Prefs } from "@/lib/prefs";

const subscribe = (onChange: () => void) => {
  window.addEventListener("prefs", onChange);
  window.addEventListener("storage", onChange); // another tab changed them
  return () => { window.removeEventListener("prefs", onChange); window.removeEventListener("storage", onChange); };
};
const snapshot = () => { try { return localStorage.getItem("prefs") ?? ""; } catch { return ""; } };

/** This device's preferences; the defaults during server rendering and hydration. */
export function usePrefs(): Prefs {
  const raw = useSyncExternalStore(subscribe, snapshot, () => null);
  return useMemo(() => (raw === null ? DEFAULT_PREFS : loadPrefs()), [raw]);
}

// Set once the settings page changes anything, so an account copy that arrives later (read before the change)
// can't undo it.
let edited = false;
export const markEdited = () => { edited = true; };

/**
 * The account's preferences win over this device's copy: on a new device, or after a change made elsewhere,
 * they are applied and stored here. Rendered in the top bar once the session is known.
 */
export function PrefsSync({ account }: { account: unknown }) {
  useEffect(() => {
    if (edited) return;
    const prefs = sanitize(account);
    if (JSON.stringify(prefs) !== JSON.stringify(loadPrefs())) {
      applyPrefs(prefs);
      storePrefs(prefs);
    }
  }, [account]);
  return null;
}
