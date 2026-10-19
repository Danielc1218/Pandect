"use client";

import { useEffect, useRef } from "react";

/** "?" opens a list of the page's keyboard shortcuts. `keys` pairs what to press with what it does. */
export function ShortcutsHelp({ keys }: { keys: [string, string][] }) {
  const help = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "?" || (e.target as HTMLElement).closest("input, select, textarea") || document.querySelector("dialog[open]")) return;
      e.preventDefault();
      help.current?.showModal();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  return (
    <dialog ref={help} className="modal" aria-labelledby="shortcuts-title">
      <h2 id="shortcuts-title">Keyboard shortcuts</h2>
      <table className="plain">
        <tbody>
          {keys.map(([press, does]) => <tr key={press}><td><kbd>{press}</kbd></td><td>{does}</td></tr>)}
          <tr><td><kbd>?</kbd></td><td>This list</td></tr>
        </tbody>
      </table>
      <form method="dialog" className="actions"><button className="btn">Close</button></form>
    </dialog>
  );
}
