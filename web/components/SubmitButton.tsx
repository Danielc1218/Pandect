"use client";

import { useFormStatus } from "react-dom";
import type { ReactNode } from "react";

/** A form's submit button that can't be pressed twice: while the form is sending it is disabled and shows `busy`. */
export function SubmitButton({ className, children, busy = children }: { className: string; children: ReactNode; busy?: ReactNode }) {
  const { pending } = useFormStatus();
  return <button className={className} disabled={pending} aria-busy={pending}>{pending ? busy : children}</button>;
}
