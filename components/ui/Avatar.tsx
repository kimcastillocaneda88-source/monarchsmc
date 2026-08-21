import { cn } from "@/lib/utils";
import { initialsOf } from "@/lib/utils";

/**
 * Member photograph.
 *
 * Member images are private and served through an authorising route, so they
 * bypass next/image optimisation (which fetches server-side without the
 * viewer's cookies). Explicit width/height and lazy loading keep layout stable
 * and the payload small.
 */
export function Avatar({
  uid,
  name,
  hasPhoto,
  size = 96,
  className,
  rounded = false,
}: {
  uid: string;
  name: string;
  hasPhoto: boolean;
  size?: number;
  className?: string;
  rounded?: boolean;
}) {
  const shape = rounded ? "rounded-full" : "";

  if (!hasPhoto) {
    return (
      <div
        aria-hidden="true"
        style={{ width: size, height: size }}
        className={cn(
          "u-hatch flex shrink-0 items-center justify-center border border-ash",
          shape,
          className,
        )}
      >
        <span className="font-display text-lg tracking-[0.1em] text-gold/50">{initialsOf(name)}</span>
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`/api/media/member/${encodeURIComponent(uid)}`}
      alt={`${name}`}
      width={size}
      height={size}
      loading="lazy"
      decoding="async"
      className={cn("shrink-0 border border-ash object-cover", shape, className)}
      style={{ width: size, height: size }}
    />
  );
}

/** Full-bleed variant for directory and officer cards. */
export function AvatarPlate({
  uid,
  name,
  hasPhoto,
  className,
}: {
  uid: string;
  name: string;
  hasPhoto: boolean;
  className?: string;
}) {
  return (
    <div className={cn("relative aspect-3/4 w-full overflow-hidden bg-graphite", className)}>
      {hasPhoto ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`/api/media/member/${encodeURIComponent(uid)}`}
          alt={name}
          loading="lazy"
          decoding="async"
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        <div className="u-hatch absolute inset-0 flex items-center justify-center">
          <span className="font-display text-3xl tracking-[0.14em] text-gold/25">
            {initialsOf(name)}
          </span>
        </div>
      )}
      <div aria-hidden="true" className="u-scrim-soft absolute inset-0" />
    </div>
  );
}
