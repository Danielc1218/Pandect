"use client";

import { useState } from "react";

/** Opens or closes every review row in the same section, for reading a whole section's questions in turn. */
export function ExpandAll() {
  const [open, setOpen] = useState(false);
  return (
    <button type="button" className="btn" onClick={(e) => {
      e.currentTarget.closest("section")?.querySelectorAll<HTMLDetailsElement>("details.review").forEach((d) => { d.open = !open; });
      setOpen(!open);
    }}>
      {open ? "Close all" : "Open all"}
    </button>
  );
}
