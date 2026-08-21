import { SmartImage } from "@/components/ui/SmartImage";
import { Eyebrow } from "@/components/ui/Typography";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

/**
 * Standard interior page masthead. Editorial rather than decorative: an
 * eyebrow, a large display heading, an optional lede, and an optional plate.
 */
export function PageHero({
  eyebrow,
  title,
  lede,
  imageUrl,
  imageAlt,
  imageLabel,
  children,
  compact = false,
}: {
  eyebrow: string;
  title: string;
  lede?: string;
  imageUrl?: string | null;
  imageAlt?: string | null;
  imageLabel?: string;
  children?: ReactNode;
  compact?: boolean;
}) {
  const hasImage = imageUrl !== undefined;

  return (
    <section
      className={cn(
        "u-grain relative isolate overflow-hidden border-b border-ash bg-ink",
        compact ? "pt-16 pb-14 sm:pt-20 sm:pb-16" : "pt-20 pb-16 sm:pt-28 sm:pb-24",
      )}
    >
      {hasImage ? (
        <div className="absolute inset-0 -z-10">
          <SmartImage
            src={imageUrl ?? null}
            alt={imageAlt ?? ""}
            ratio="hero"
            sizes="hero"
            priority
            label={imageLabel}
            className="h-full w-full [&>*]:h-full"
          />
          <div aria-hidden="true" className="u-scrim absolute inset-0" />
        </div>
      ) : null}

      <div className="mx-auto max-w-[1600px] px-5 sm:px-8 lg:px-12">
        <Eyebrow>{eyebrow}</Eyebrow>
        <h1 className="u-display-tight mt-6 max-w-5xl text-[clamp(2.5rem,9vw,6rem)] text-bone uppercase">
          {title}
        </h1>
        {lede ? <p className="mt-7 max-w-2xl text-base leading-relaxed text-mist sm:text-lg">{lede}</p> : null}
        {children ? <div className="mt-9">{children}</div> : null}
      </div>
    </section>
  );
}

/** Consistent inner container for page bodies. */
export function Container({
  children,
  className,
  size = "wide",
}: {
  children: ReactNode;
  className?: string;
  size?: "wide" | "prose";
}) {
  return (
    <div
      className={cn(
        "mx-auto px-5 sm:px-8 lg:px-12",
        size === "prose" ? "max-w-3xl" : "max-w-[1600px]",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function Section({
  children,
  className,
  tone = "ink",
}: {
  children: ReactNode;
  className?: string;
  tone?: "ink" | "charcoal";
}) {
  return (
    <section
      className={cn(
        "border-b border-ash py-16 sm:py-20 lg:py-28",
        tone === "charcoal" ? "bg-charcoal" : "bg-ink",
        className,
      )}
    >
      {children}
    </section>
  );
}
