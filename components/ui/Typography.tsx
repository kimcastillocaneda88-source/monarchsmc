import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

/** Small gold label that opens a section. Paired with a rule for editorial rhythm. */
export function Eyebrow({
  children,
  className,
  index,
}: {
  children: ReactNode;
  className?: string;
  /** Optional section number, e.g. 01 — rendered before the label. */
  index?: string;
}) {
  return (
    <p className={cn("u-eyebrow flex items-center gap-3", className)}>
      {index ? <span className="text-gold/50">{index}</span> : null}
      <span className="h-px w-8 bg-gold/50" aria-hidden="true" />
      <span>{children}</span>
    </p>
  );
}

export function SectionHeading({
  children,
  className,
  as: Tag = "h2",
}: {
  children: ReactNode;
  className?: string;
  as?: "h1" | "h2" | "h3";
}) {
  return (
    <Tag
      className={cn(
        "u-display-tight mt-6 text-[clamp(2rem,6vw,3.75rem)] uppercase text-bone",
        className,
      )}
    >
      {children}
    </Tag>
  );
}

export function DisplayHeading({
  children,
  className,
  as: Tag = "h1",
}: {
  children: ReactNode;
  className?: string;
  as?: "h1" | "h2";
}) {
  return (
    <Tag
      className={cn(
        "u-display-tight text-[clamp(2.75rem,11vw,7.5rem)] uppercase text-bone",
        className,
      )}
    >
      {children}
    </Tag>
  );
}

export function Lede({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p className={cn("max-w-2xl text-base leading-relaxed text-mist sm:text-lg", className)}>
      {children}
    </p>
  );
}

export function Meta({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p
      className={cn(
        "font-display text-[0.6875rem] uppercase tracking-[0.22em] text-smoke",
        className,
      )}
    >
      {children}
    </p>
  );
}

export function Rule({ className }: { className?: string }) {
  return <hr className={cn("u-hairline my-0", className)} />;
}
