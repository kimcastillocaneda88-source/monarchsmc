import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export function slugify(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/** Renders a YYYY-MM-DD string without letting the viewer's timezone shift the day. */
export function formatIsoDate(
  iso: string,
  options: Intl.DateTimeFormatOptions = { day: "numeric", month: "long", year: "numeric" },
): string {
  const parsed = Date.parse(`${iso}T12:00:00Z`);
  if (Number.isNaN(parsed)) return iso;
  return new Intl.DateTimeFormat("en-GB", { ...options, timeZone: "UTC" }).format(new Date(parsed));
}

export function formatIsoDateShort(iso: string): string {
  return formatIsoDate(iso, { day: "2-digit", month: "short", year: "numeric" });
}

export function formatMillis(
  millis: number | null | undefined,
  options: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" },
): string {
  if (!millis) return "—";
  return new Intl.DateTimeFormat("en-GB", options).format(new Date(millis));
}

export function formatDateTime(millis: number | null | undefined): string {
  if (!millis) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(millis));
}

/** 24h "18:30" -> "18:30" (kept explicit so the club's format is consistent). */
export function formatTime(time: string): string {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(time) ? time : "—";
}

export function formatDistance(km: number | null): string | null {
  if (km === null || !Number.isFinite(km) || km <= 0) return null;
  return `${Math.round(km)} km`;
}

/** True when a YYYY-MM-DD date is today or later, evaluated in UTC. */
export function isUpcoming(iso: string, now = new Date()): boolean {
  const target = Date.parse(`${iso}T23:59:59Z`);
  return !Number.isNaN(target) && target >= now.getTime();
}

export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "M";
  if (parts.length === 1) return (parts[0] ?? "M").slice(0, 2).toUpperCase();
  return `${(parts[0] ?? "").charAt(0)}${(parts[parts.length - 1] ?? "").charAt(0)}`.toUpperCase();
}

export function truncate(input: string, max: number): string {
  if (input.length <= max) return input;
  return `${input.slice(0, Math.max(0, max - 1)).trimEnd()}…`;
}

export function readingTimeMinutes(body: string): number {
  const words = body.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 220));
}

/** Absolute site URL, used for canonical links, OG tags and the sitemap. */
export function siteUrl(path = "/"): string {
  const base =
    process.env.NEXT_PUBLIC_SITE_URL ??
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : "http://localhost:3000");
  const normalized = base.replace(/\/$/, "");
  return path.startsWith("/") ? `${normalized}${path}` : `${normalized}/${path}`;
}

/** Only allows same-origin relative paths as post-login redirect targets. */
export function safeNextPath(value: string | null | undefined, fallback = "/member/dashboard"): string {
  if (!value) return fallback;
  if (!value.startsWith("/") || value.startsWith("//")) return fallback;
  if (value.includes("\\")) return fallback;
  return value;
}
