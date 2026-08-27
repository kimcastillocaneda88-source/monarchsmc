/**
 * Storage layout.
 *
 * Deliberately split so Security Rules can express different access for each
 * area rather than one blanket rule.
 *
 *   gallery/    — public images shown on the public site
 *   news/       — public article cover images
 *   rides/      — public ride cover images
 *   events/     — public event cover images
 *   members/    — member photographs, private
 *   documents/  — club documents, private, never client-readable
 *   media/      — the member media library, private; every object is served
 *                 through /api/media/file/[id], which checks who is asking
 */
export const STORAGE_PREFIXES = {
  gallery: "gallery",
  news: "news",
  rides: "rides",
  events: "events",
  members: "members",
  documents: "documents",
  media: "media",
} as const;

export type StorageArea = keyof typeof STORAGE_PREFIXES;

/** Areas whose objects are deliberately world-readable. */
export const PUBLIC_AREAS: StorageArea[] = ["gallery", "news", "rides", "events"];

export function isPublicArea(area: StorageArea): boolean {
  return PUBLIC_AREAS.includes(area);
}

export function buildStoragePath(area: StorageArea, objectName: string, scope?: string): string {
  const prefix = STORAGE_PREFIXES[area];
  return scope ? `${prefix}/${scope}/${objectName}` : `${prefix}/${objectName}`;
}

/** Stable public URL for an object that has been made public. */
export function publicUrlFor(bucket: string, path: string): string {
  return `https://storage.googleapis.com/${bucket}/${path
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/")}`;
}
