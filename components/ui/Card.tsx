import Link from "next/link";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";
import { SmartImage } from "./SmartImage";
import type { AspectRatio, ImageSizeKey } from "@/lib/images";

/**
 * Editorial card.
 *
 * Square corners, a hairline frame and a slow image scale on hover — closer to
 * a magazine plate than a rounded product card.
 */
export function EditorialCard({
  href,
  imageUrl,
  imageAlt,
  imageLabel,
  eyebrow,
  title,
  meta,
  description,
  footer,
  ratio = "editorial",
  sizes = "third",
  className,
  priority,
}: {
  href: string;
  imageUrl: string | null;
  imageAlt: string;
  imageLabel?: string;
  eyebrow?: ReactNode;
  title: string;
  meta?: ReactNode;
  description?: string | null;
  footer?: ReactNode;
  ratio?: AspectRatio;
  sizes?: ImageSizeKey;
  className?: string;
  priority?: boolean;
}) {
  return (
    <article
      className={cn(
        "group relative flex h-full flex-col border border-ash bg-charcoal/40 transition-colors duration-500 hover:border-gold/45",
        className,
      )}
    >
      <div className="overflow-hidden">
        <SmartImage
          src={imageUrl}
          alt={imageAlt}
          label={imageLabel}
          ratio={ratio}
          sizes={sizes}
          priority={priority}
          overlay="soft"
          imageClassName="transition-transform duration-[1200ms] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-105"
        />
      </div>

      <div className="flex flex-1 flex-col p-5 sm:p-6">
        {eyebrow ? <div className="mb-3">{eyebrow}</div> : null}
        <h3 className="font-display text-xl leading-tight uppercase tracking-[0.02em] text-bone transition-colors duration-300 group-hover:text-gold sm:text-2xl">
          <Link href={href} className="after:absolute after:inset-0 focus:outline-none">
            {title}
          </Link>
        </h3>
        {meta ? <div className="mt-3">{meta}</div> : null}
        {description ? (
          <p className="mt-4 line-clamp-3 text-sm leading-relaxed text-smoke">{description}</p>
        ) : null}
        {footer ? <div className="mt-auto pt-5">{footer}</div> : null}
      </div>
    </article>
  );
}

/** Plain bordered surface used inside the member and admin areas. */
export function Panel({
  children,
  className,
  title,
  action,
}: {
  children: ReactNode;
  className?: string;
  title?: string;
  action?: ReactNode;
}) {
  return (
    <section className={cn("border border-ash bg-charcoal/40", className)}>
      {title ? (
        <header className="flex items-center justify-between gap-4 border-b border-ash px-5 py-4">
          <h2 className="font-display text-sm uppercase tracking-[0.2em] text-bone">{title}</h2>
          {action}
        </header>
      ) : null}
      <div className="p-5">{children}</div>
    </section>
  );
}

/** Compact metric tile for dashboards. */
export function StatTile({
  label,
  value,
  hint,
  href,
  tone = "neutral",
}: {
  label: string;
  value: number | string;
  hint?: string;
  href?: string;
  tone?: "neutral" | "gold" | "warning";
}) {
  const valueClass =
    tone === "gold" ? "text-gold" : tone === "warning" ? "text-warning" : "text-bone";

  const content = (
    <>
      <p className="font-display text-[0.625rem] uppercase tracking-[0.22em] text-smoke">{label}</p>
      <p className={cn("mt-3 font-display text-4xl leading-none", valueClass)}>{value}</p>
      {hint ? <p className="mt-2 text-xs text-smoke">{hint}</p> : null}
    </>
  );

  const base = "block border border-ash bg-charcoal/40 p-5 transition-colors";

  return href ? (
    <Link href={href} className={cn(base, "hover:border-gold/50")}>
      {content}
    </Link>
  ) : (
    <div className={base}>{content}</div>
  );
}
