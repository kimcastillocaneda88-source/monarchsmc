import Link from "next/link";
import { cn } from "@/lib/utils";
import type { ComponentPropsWithRef, ComponentPropsWithoutRef, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "link";
type Size = "sm" | "md" | "lg";

const BASE =
  "inline-flex items-center justify-center gap-2.5 font-display uppercase tracking-[0.18em] " +
  "transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] " +
  "disabled:pointer-events-none disabled:opacity-45 " +
  "focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-gold";

const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-gold text-ink border border-gold hover:bg-goldbright hover:border-goldbright active:translate-y-px",
  secondary:
    "border border-iron bg-transparent text-bone hover:border-gold hover:text-gold active:translate-y-px",
  ghost: "border border-transparent bg-transparent text-mist hover:text-bone",
  danger:
    "border border-danger/60 bg-danger/10 text-danger hover:bg-danger hover:text-ink hover:border-danger",
  link: "p-0 border-0 text-gold hover:text-goldbright underline-offset-4 hover:underline",
};

const SIZES: Record<Size, string> = {
  sm: "min-h-9 px-4 text-[0.6875rem]",
  md: "min-h-11 px-6 text-xs",
  lg: "min-h-13 px-8 text-[0.8125rem]",
};

export interface ButtonBaseProps {
  variant?: Variant;
  size?: Size;
  className?: string;
  children: ReactNode;
  /** Renders a trailing arrow that slides on hover. */
  withArrow?: boolean;
  fullWidth?: boolean;
}

function classesFor({ variant = "primary", size = "md", fullWidth, className }: ButtonBaseProps) {
  return cn(
    BASE,
    VARIANTS[variant],
    variant === "link" ? "" : SIZES[size],
    fullWidth && "w-full",
    "group",
    className,
  );
}

function Arrow() {
  return (
    <span
      aria-hidden="true"
      className="inline-block transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:translate-x-1"
    >
      →
    </span>
  );
}

// React 19 passes `ref` as an ordinary prop, so no forwardRef wrapper is needed.
export type ButtonProps = ButtonBaseProps &
  Omit<ComponentPropsWithRef<"button">, "className" | "children">;

export function Button({ variant, size, className, children, withArrow, fullWidth, ...rest }: ButtonProps) {
  return (
    <button
      {...rest}
      className={classesFor({ variant, size, fullWidth, className, children })}
    >
      {children}
      {withArrow ? <Arrow /> : null}
    </button>
  );
}

export type ButtonLinkProps = ButtonBaseProps &
  Omit<ComponentPropsWithoutRef<typeof Link>, "className" | "children">;

export function ButtonLink({
  variant,
  size,
  className,
  children,
  withArrow,
  fullWidth,
  ...rest
}: ButtonLinkProps) {
  return (
    <Link {...rest} className={classesFor({ variant, size, fullWidth, className, children })}>
      {children}
      {withArrow ? <Arrow /> : null}
    </Link>
  );
}
