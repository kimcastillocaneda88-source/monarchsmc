import Image from "next/image";
import { cn } from "@/lib/utils";
import { ASPECT_RATIOS, BLUR_DATA_URL, IMAGE_SIZES, isRenderableImageUrl } from "@/lib/images";
import type { AspectRatio, ImageSizeKey } from "@/lib/images";

/**
 * The single image primitive used across the site.
 *
 * When no image has been uploaded yet — the normal state for a brand-new
 * install — it renders a deliberate hatched plate with the club monogram
 * instead of a broken image, so every layout holds its shape from day one.
 */
export function SmartImage({
  src,
  alt,
  ratio = "editorial",
  sizes = "half",
  priority = false,
  className,
  imageClassName,
  label,
  showLabel = false,
  overlay = "none",
}: {
  src: string | null | undefined;
  alt: string;
  ratio?: AspectRatio;
  sizes?: ImageSizeKey;
  priority?: boolean;
  className?: string;
  imageClassName?: string;
  /** Describes what belongs here. Rendered only when `showLabel` is set. */
  label?: string;
  /** Admin surfaces set this so editors can see which slot is empty. The
   *  public site keeps placeholders silent — a hatched plate, nothing more. */
  showLabel?: boolean;
  overlay?: "none" | "scrim" | "soft";
}) {
  const usable = isRenderableImageUrl(src);

  return (
    <div className={cn("relative overflow-hidden bg-graphite", ASPECT_RATIOS[ratio], className)}>
      {usable ? (
        <Image
          src={src}
          alt={alt}
          fill
          sizes={IMAGE_SIZES[sizes]}
          priority={priority}
          loading={priority ? undefined : "lazy"}
          placeholder="blur"
          blurDataURL={BLUR_DATA_URL}
          className={cn("object-cover", imageClassName)}
        />
      ) : (
        <ImagePlaceholder label={showLabel ? label : undefined} />
      )}
      {overlay !== "none" ? (
        <div
          aria-hidden="true"
          className={cn("absolute inset-0", overlay === "scrim" ? "u-scrim" : "u-scrim-soft")}
        />
      ) : null}
    </div>
  );
}

export function ImagePlaceholder({ label }: { label?: string }) {
  return (
    <div className="u-hatch absolute inset-0 flex flex-col items-center justify-center gap-3 text-center">
      <Monogram className="h-10 w-10 text-gold/25" />
      {label ? (
        <p className="max-w-[80%] font-display text-[0.625rem] uppercase tracking-[0.24em] text-smoke">
          {label}
        </p>
      ) : null}
    </div>
  );
}

/**
 * The club monogram: an "M" formed from two upstrokes under a crown bar.
 * Drawn rather than photographed so it stays crisp at any size and needs no
 * asset upload.
 */
export function Monogram({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" aria-hidden="true" className={className}>
      <path d="M8 40V14l8 12 8-16 8 16 8-12v26" stroke="currentColor" strokeWidth="2.5" />
      <path d="M6 8h36" stroke="currentColor" strokeWidth="2.5" />
      <path d="M24 3.5 27 8h-6l3-4.5Z" fill="currentColor" />
    </svg>
  );
}
