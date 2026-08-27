"use client";

import { useEffect, useRef } from "react";
import { useToast } from "@/components/ui/toast";

/** The shape both public forms return from their Server Action. */
interface FormState {
  status: "idle" | "success" | "error";
  message: string;
  fieldErrors?: Record<string, string>;
}

/**
 * Announces a Server Action's outcome as a toast.
 *
 * Field errors stay beside their fields, where they can be acted on — a toast
 * listing four invalid inputs is only a worse version of the form. What the
 * toast carries is the outcome: it was received, or something failed that has
 * nothing to do with what was typed and is easy to miss at the bottom of a
 * long form.
 *
 * Shared by both forms so the wording, the variant and the timing are decided
 * once. Errors persist until dismissed, successes clear themselves — that
 * behaviour lives in the toast component, not here.
 *
 * Guarded by a ref: `useActionState` hands back the same state object on
 * unrelated re-renders, and a toast that fires twice reads as two enquiries.
 */
export function useFormToast(
  state: FormState,
  copy: { successTitle: string; errorTitle?: string },
) {
  const { toast } = useToast();
  const announced = useRef<FormState | null>(null);

  useEffect(() => {
    if (state.status === "idle" || announced.current === state) return;
    announced.current = state;

    if (state.status === "success") {
      toast({
        variant: "success",
        title: copy.successTitle,
        description: state.message,
      });
      return;
    }

    toast({
      variant: "error",
      title: state.fieldErrors
        ? "Check the highlighted fields"
        : (copy.errorTitle ?? "That did not send"),
      description: state.message,
    });
  }, [state, toast, copy.successTitle, copy.errorTitle]);
}
