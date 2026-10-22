"use client";

import { useEffect, useMemo, useSyncExternalStore } from "react";
import { applyPrefs, DEFAULT_PREFS, loadPrefs, sanitize, storePrefs, type Prefs } from "@/lib/prefs";
import { savePreferences } from "@/lib/actions";
import { createSaveQueue } from "@/lib/saveQueue";

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

// Ignore an account read started before the latest edit. Scope this to the current account.
let edited = false;
let activeAccount: string | null | undefined;
let revision = 0;
let pending = 0;
let saveStatus = "";
const queueSave = createSaveQueue(({ prefs, accountId }: { prefs: Prefs; accountId: string | undefined }) => savePreferences(prefs, accountId));
const setSaveStatus = (status: string) => { saveStatus = status; window.dispatchEvent(new Event("prefs-save")); };
const subscribeSave = (onChange: () => void) => {
  window.addEventListener("prefs-save", onChange);
  return () => window.removeEventListener("prefs-save", onChange);
};

export const usePreferenceSaveStatus = () => useSyncExternalStore(subscribeSave, () => saveStatus, () => "");

/** Apply at once, then persist to the signed-in profile. This queue survives page navigation. */
export function updatePreferences(patch: Partial<Prefs>, persist = true) {
  const prefs = sanitize({ ...loadPrefs(), ...patch });
  applyPrefs(prefs);
  storePrefs(prefs);
  if (!persist) return Promise.resolve();
  const current = ++revision;
  edited = true;
  setSaveStatus("Saving…");
  pending++;
  return queueSave({ prefs, accountId: activeAccount ?? undefined }).then(
    () => { if (current === revision) setSaveStatus("Saved to your account."); },
    () => { if (current === revision) setSaveStatus("Couldn't save to your account. Please try changing the setting again."); },
  ).finally(() => { pending--; });
}

/**
 * The account's preferences win over this device's copy: on a new device, or after a change made elsewhere,
 * they are applied and stored here. Rendered in the top bar once the session is known.
 */
export function PrefsSync({ account, accountId }: { account: unknown; accountId: string | null | undefined }) {
  useEffect(() => {
    if (accountId === undefined) return;
    if (activeAccount !== undefined && activeAccount !== accountId) {
      edited = false;
      setSaveStatus("");
    }
    activeAccount = accountId;
    if (!accountId || account === undefined || edited) return;
    const prefs = sanitize(account);
    applyPrefs(prefs);
    if (JSON.stringify(prefs) !== JSON.stringify(loadPrefs())) {
      storePrefs(prefs);
    }
  }, [account, accountId]);
  useEffect(() => {
    const media = matchMedia("(prefers-color-scheme: dark)");
    const systemTheme = () => { const prefs = loadPrefs(); if (prefs.theme === "system") applyPrefs(prefs); };
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (!pending) return;
      event.preventDefault();
      event.returnValue = "";
    };
    media.addEventListener("change", systemTheme);
    window.addEventListener("beforeunload", beforeUnload);
    return () => {
      media.removeEventListener("change", systemTheme);
      window.removeEventListener("beforeunload", beforeUnload);
    };
  }, []);
  return null;
}
