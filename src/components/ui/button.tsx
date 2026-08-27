import Link from "next/link";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost";
type Size = "sm" | "md" | "lg";

const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-accent text-accent-fg hover:bg-accent-hover shadow-[var(--shadow-1)]",
  secondary:
    "border border-border-strong bg-surface text-text hover:bg-surface-2",
  ghost: "text-text-muted hover:text-text hover:bg-surface-2",
};

const SIZES: Record<Size, string> = {
  sm: "h-9 px-3.5 text-sm gap-1.5",
  md: "h-11 px-5 text-sm gap-2",
  lg: "h-13 px-7 text-base gap-2",
};

const BASE = cn(
  "inline-flex items-center justify-center rounded-lg font-medium whitespace-nowrap",
  "transition-[background-color,border-color,color,transform] duration-[--duration-fast] ease-[--ease-out]",
  // Compresses on press. A 2% scale is small enough to feel physical rather
  // than gimmicky, and uses transform so it never triggers layout.
  "active:scale-[0.98]",
  "disabled:pointer-events-none disabled:opacity-50",
);

interface CommonProps {
  variant?: Variant;
  size?: Size;
  className?: string;
  children: React.ReactNode;
}

type ButtonProps = CommonProps &
  Omit<React.ComponentPropsWithoutRef<"button">, "className" | "children">;

type LinkButtonProps = CommonProps &
  Omit<React.ComponentPropsWithoutRef<typeof Link>, "className" | "children">;

export function Button({
  variant = "primary",
  size = "md",
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(BASE, VARIANTS[variant], SIZES[size], className)}
      {...props}
    >
      {children}
    </button>
  );
}

/**
 * Same visual treatment, rendered as a link.
 *
 * A separate component rather than an `asChild` prop: navigation and actions
 * are genuinely different elements, and keeping them distinct means the
 * correct one — anchor or button — always reaches the accessibility tree.
 */
export function ButtonLink({
  variant = "primary",
  size = "md",
  className,
  children,
  ...props
}: LinkButtonProps) {
  return (
    <Link
      className={cn(BASE, VARIANTS[variant], SIZES[size], className)}
      {...props}
    >
      {children}
    </Link>
  );
}
