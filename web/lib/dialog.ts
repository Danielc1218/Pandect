import type { MouseEvent } from "react";

/**
 * A click on a modal's dimmed backdrop (outside its box) closes it, as Escape does. Only clicks on the dialog itself
 * count: a key pressed on a button inside also fires a click, at (0, 0), which would otherwise look outside.
 */
export function closeOnBackdrop(e: MouseEvent<HTMLDialogElement>) {
  if (e.target !== e.currentTarget) return;
  const box = e.currentTarget.getBoundingClientRect();
  if (e.clientX < box.left || e.clientX > box.right || e.clientY < box.top || e.clientY > box.bottom) e.currentTarget.close();
}
