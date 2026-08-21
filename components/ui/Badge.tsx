import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

type Tone = "neutral" | "gold" | "success" | "warning" | "danger" | "muted";

const TONES: Record<Tone, string> = {
  neutral: "border-iron text-mist",
  gold: "border-gold/60 text-gold",
  success: "border-success/60 text-success",
  warning: "border-warning/60 text-warning",
  danger: "border-danger/60 text-danger",
  muted: "border-ash text-smoke",
};

/**
 * Status pill.
 *
 * Status is always carried by the label text as well as the colour, so it does
 * not rely on colour alone (WCAG 1.4.1).
 */
export function Badge({
  children,
  tone = "neutral",
  className,
}: {
  children: ReactNode;
  tone?: Tone;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 border px-2.5 py-1 font-display text-[0.625rem] uppercase tracking-[0.18em] whitespace-nowrap",
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
