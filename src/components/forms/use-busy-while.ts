"use client";

import { useEffect } from "react";
import { useBusy } from "@/components/brand/busy-overlay";

/**
 * Holds the busy overlay open for as long as a flag is true.
 *
 * `useActionState` already reports whether the action is running, so a form
 * has the flag and only needs to connect it. Written as a hook rather than
 * called inline because the release has to happen on unmount too — a person
 * who navigates away mid-submit must not leave the overlay up over the next
 * page.
 */
export function useBusyWhile(active: boolean, label?: string) {
  const { start } = useBusy();

  useEffect(() => {
    if (!active) return;
    return start(label);
  }, [active, label, start]);
}
