/**
 * Image system helpers.
 *
 * The design must hold up before the club has uploaded any photography, so
 * every image slot degrades to a deliberate, branded placeholder rather than a
 * broken image.
 */

export const ASPECT_RATIOS = {
  hero: "aspect-[4/5] sm:aspect-[16/10] lg:aspect-[21/9]",
  wide: "aspect-[16/9]",
  editorial: "aspect-[4/3]",
  portrait: "aspect-[3/4]",
  square: "aspect-square",
} as const;

export type AspectRatio = keyof typeof ASPECT_RATIOS;

/** Responsive `sizes` presets so next/image never over-fetches on mobile. */
export const IMAGE_SIZES = {
  hero: "100vw",
  full: "100vw",
  half: "(max-width: 768px) 100vw, 50vw",
  third: "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw",
  quarter: "(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw",
  thumb: "(max-width: 640px) 33vw, 160px",
} as const;

export type ImageSizeKey = keyof typeof IMAGE_SIZES;

/** A tiny neutral blur placeholder; avoids a flash of empty space on slow links. */
export const BLUR_DATA_URL =
  "data:image/svg+xml;base64," +
  Buffer.from(
    '<svg xmlns="http://www.w3.org/2000/svg" width="8" height="8"><rect width="8" height="8" fill="#141418"/></svg>',
  ).toString("base64");

const ALLOWED_IMAGE_HOSTS = [
  "firebasestorage.googleapis.com",
  "storage.googleapis.com",
];

/**
 * Only render remote images from hosts configured in next.config.ts.
 * A stored URL that points elsewhere is treated as missing rather than
 * proxied, so a compromised document cannot make the site load third-party
 * resources.
 */
export function isRenderableImageUrl(url: string | null | undefined): url is string {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:") return false;
    return (
      ALLOWED_IMAGE_HOSTS.includes(parsed.hostname) || parsed.hostname.endsWith(".firebasestorage.app")
    );
  } catch {
    return false;
  }
}
