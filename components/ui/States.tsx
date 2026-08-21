import { cn } from "@/lib/utils";
import type { ReactNode } from "react";
import { Monogram } from "./SmartImage";

/** Empty state — used wherever a collection has no documents yet. */
export function EmptyState({
  title,
  description,
  action,
  className,
  compact = false,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "border border-dashed border-ash bg-charcoal/40 text-center",
        compact ? "px-6 py-10" : "px-6 py-16 sm:py-20",
        className,
      )}
    >
      <Monogram className="mx-auto h-8 w-8 text-gold/30" />
      <h3 className="mt-5 font-display text-lg uppercase tracking-[0.14em] text-bone">{title}</h3>
      {description ? (
        <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-smoke">{description}</p>
      ) : null}
      {action ? <div className="mt-7 flex justify-center">{action}</div> : null}
    </div>
  );
}

/** Error state — never renders a raw provider error message. */
export function ErrorState({
  title = "Something went wrong",
  description = "We could not load this right now. Please try again in a moment.",
  action,
  className,
}: {
  title?: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      role="alert"
      className={cn("border border-danger/40 bg-danger/5 px-6 py-10 text-center", className)}
    >
      <h3 className="font-display text-lg uppercase tracking-[0.14em] text-danger">{title}</h3>
      <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-mist">{description}</p>
      {action ? <div className="mt-6 flex justify-center">{action}</div> : null}
    </div>
  );
}

/** Skeleton block used by Suspense boundaries. */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn("animate-pulse bg-linear-to-r from-graphite via-steel to-graphite", className)}
    />
  );
}

export function LoadingState({ label = "Loading", className }: { label?: string; className?: string }) {
  return (
    <div className={cn("flex items-center justify-center gap-3 px-6 py-14", className)} role="status">
      <Spinner />
      <span className="font-display text-[0.6875rem] uppercase tracking-[0.24em] text-smoke">
        {label}
      </span>
    </div>
  );
}

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-block h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-gold/25 border-t-gold",
        className,
      )}
    />
  );
}

/** Card skeleton matching the editorial card footprint. */
export function CardSkeletonGrid({ count = 3 }: { count?: number }) {
  return (
    <div className="grid gap-px bg-ash sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-ink p-1">
          <Skeleton className="aspect-4/3 w-full" />
          <div className="space-y-3 p-5">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-3 w-full" />
          </div>
        </div>
      ))}
    </div>
  );
}
