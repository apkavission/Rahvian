"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Toasts.
 *
 * One component for every "that worked" and "that did not" in the whole
 * application — the public forms now, the admin panel and the client portal
 * when they exist. Feedback written per screen is how a design system drifts,
 * and the admin is where it drifts first.
 *
 * Three decisions it is built around:
 *
 *   **Themed, never coloured by hand.** Every value comes from the tokens in
 *   `globals.css`, so a toast is correct in light and dark from one
 *   definition. There is no hex anywhere in this file.
 *
 *   **Top, not bottom.** A toast fires just after a form is submitted, which
 *   on a phone is exactly when the keyboard is open — and a bottom toast is
 *   then behind it, announced to nobody who can see. The top of the viewport
 *   is visible in both cases, so both use it: full width under the header on a
 *   phone, a fixed column at the top right from `sm` up.
 *
 *   **Everything clears itself.** Success and info after four seconds, errors
 *   and warnings after six — long enough to read twice, short enough not to
 *   sit there. Hovering or focusing a toast pauses its timer, so a long
 *   message is never pulled away mid-sentence, and the dismiss button is
 *   always there for anyone who wants it gone sooner.
 *
 * Motion comes from the shared `toast-in` keyframe, so the global
 * reduced-motion rule in `globals.css` already neutralises it.
 */

export type ToastVariant = "success" | "error" | "warning" | "info";

export interface ToastOptions {
  variant?: ToastVariant;
  /** One line. The outcome, not a sentence about the outcome. */
  title: string;
  /** Optional second line: what to do about it, or the detail behind it. */
  description?: string;
  /** Milliseconds on screen. Defaults by variant; 0 keeps it until dismissed. */
  duration?: number;
}

interface ToastRecord extends ToastOptions {
  id: string;
  variant: ToastVariant;
  duration: number;
}

interface ToastContextValue {
  toast: (options: ToastOptions) => string;
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

/** At most three on screen. Beyond that they stop being readable. */
const MAX_VISIBLE = 3;

/** An error carries more to read than a receipt does, so it gets longer. */
const DURATION: Record<ToastVariant, number> = {
  success: 4000,
  info: 4000,
  warning: 6000,
  error: 6000,
};

const VARIANT: Record<
  ToastVariant,
  { icon: typeof CheckCircle2; accent: string; surface: string; assertive: boolean }
> = {
  success: {
    icon: CheckCircle2,
    accent: "text-success",
    surface: "border-success/35 bg-success-soft",
    assertive: false,
  },
  error: {
    icon: XCircle,
    accent: "text-danger",
    surface: "border-danger/35 bg-danger-soft",
    assertive: true,
  },
  warning: {
    icon: AlertTriangle,
    accent: "text-warning",
    surface: "border-warning/35 bg-warning-soft",
    assertive: true,
  },
  info: {
    icon: Info,
    accent: "text-info",
    surface: "border-info/35 bg-info-soft",
    assertive: false,
  },
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastRecord[]>([]);
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const counter = useRef(0);

  const clearTimer = useCallback((id: string) => {
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const dismiss = useCallback(
    (id: string) => {
      clearTimer(id);
      setToasts((current) => current.filter((item) => item.id !== id));
    },
    [clearTimer],
  );

  const schedule = useCallback(
    (id: string, duration: number) => {
      if (duration <= 0) return;
      clearTimer(id);
      timers.current.set(
        id,
        setTimeout(() => dismiss(id), duration),
      );
    },
    [clearTimer, dismiss],
  );

  const toast = useCallback(
    (options: ToastOptions) => {
      const variant = options.variant ?? "info";
      // A counter, not a random id: this runs on both sides of hydration and a
      // random value would differ between them.
      counter.current += 1;
      const id = `toast-${counter.current}`;
      const duration = options.duration ?? DURATION[variant];

      setToasts((current) =>
        [...current, { ...options, variant, duration, id }].slice(-MAX_VISIBLE),
      );
      schedule(id, duration);

      return id;
    },
    [schedule],
  );

  // Timers outlive the component if the page navigates while one is pending.
  useEffect(() => {
    const pending = timers.current;
    return () => {
      for (const timer of pending.values()) clearTimeout(timer);
      pending.clear();
    };
  }, []);

  const value = useMemo(() => ({ toast, dismiss }), [toast, dismiss]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastViewport
        toasts={toasts}
        onDismiss={dismiss}
        onPause={clearTimer}
        onResume={schedule}
      />
    </ToastContext.Provider>
  );
}

/**
 * Access to the toast queue.
 *
 * Throws outside the provider rather than returning a no-op: feedback that
 * silently fails to appear is worse than a component that refuses to render,
 * because nobody finds out until a customer does.
 */
export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast() must be used inside <ToastProvider>.");
  }
  return context;
}

// ---------------------------------------------------------------------------

function ToastViewport({
  toasts,
  onDismiss,
  onPause,
  onResume,
}: {
  toasts: ToastRecord[];
  onDismiss: (id: string) => void;
  onPause: (id: string) => void;
  onResume: (id: string, duration: number) => void;
}) {
  return (
    <div
      role="region"
      aria-label="Notifications"
      className={cn(
        // Above the sticky header, which is `z-50`.
        "pointer-events-none fixed z-[60] flex flex-col gap-2",
        // Phone: full width, clear of the 4rem header and any notch.
        "inset-x-3 top-[calc(4.5rem+env(safe-area-inset-top))]",
        // sm and up: a column at the top right, clear of the taller header.
        "sm:inset-x-auto sm:right-6 sm:top-[5.5rem] sm:w-[22rem]",
      )}
    >
      {/* Newest first: it is the one the reader is waiting for, and at the top
          of the screen the first row is where the eye lands. */}
      {[...toasts].reverse().map((item) => (
        <ToastItem
          key={item.id}
          toast={item}
          onDismiss={onDismiss}
          onPause={onPause}
          onResume={onResume}
        />
      ))}
    </div>
  );
}

function ToastItem({
  toast,
  onDismiss,
  onPause,
  onResume,
}: {
  toast: ToastRecord;
  onDismiss: (id: string) => void;
  onPause: (id: string) => void;
  onResume: (id: string, duration: number) => void;
}) {
  const { icon: Icon, accent, surface, assertive } = VARIANT[toast.variant];

  // Reading takes as long as it takes. Pausing restarts the full duration
  // afterwards rather than resuming the remainder, so a toast is never pulled
  // away a moment after the pointer leaves it.
  const pause = () => onPause(toast.id);
  const resume = () => onResume(toast.id, toast.duration);

  return (
    <div
      role={assertive ? "alert" : "status"}
      aria-live={assertive ? "assertive" : "polite"}
      onMouseEnter={pause}
      onMouseLeave={resume}
      onFocusCapture={pause}
      onBlurCapture={resume}
      className={cn(
        "pointer-events-auto flex items-start gap-3 rounded-xl border p-4",
        "shadow-[var(--shadow-2)] backdrop-blur-sm",
        "[animation:toast-in_var(--duration-base)_var(--ease-out)_both]",
        surface,
      )}
    >
      <Icon className={cn("mt-0.5 size-5 shrink-0", accent)} aria-hidden />

      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-text">{toast.title}</p>
        {toast.description && (
          <p className="mt-1 text-sm leading-relaxed text-text-muted">
            {toast.description}
          </p>
        )}
      </div>

      <button
        type="button"
        onClick={() => onDismiss(toast.id)}
        aria-label="Dismiss notification"
        className={cn(
          "-m-1 shrink-0 rounded-md p-1 text-text-subtle",
          "transition-colors duration-[--duration-fast] hover:text-text",
          "focus:outline-none focus:ring-2 focus:ring-ring",
        )}
      >
        <X className="size-4" aria-hidden />
      </button>
    </div>
  );
}
