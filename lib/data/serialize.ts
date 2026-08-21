import { Timestamp } from "firebase-admin/firestore";
import type { Millis } from "@/types";

/** Firestore Timestamp -> epoch millis, so documents can cross the RSC boundary. */
export function toMillis(value: unknown): Millis | null {
  if (value instanceof Timestamp) return value.toMillis();
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (value instanceof Date) return value.getTime();
  if (
    typeof value === "object" &&
    value !== null &&
    "_seconds" in value &&
    typeof (value as { _seconds: unknown })._seconds === "number"
  ) {
    return (value as { _seconds: number })._seconds * 1000;
  }
  return null;
}

export function requireMillis(value: unknown, fallback = 0): Millis {
  return toMillis(value) ?? fallback;
}

export function str(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

export function nullableStr(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

export function num(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function bool(value: unknown, fallback = false): boolean {
  return typeof value === "boolean" ? value : fallback;
}

export function oneOf<T extends string>(
  value: unknown,
  allowed: readonly T[],
  fallback: T,
): T {
  return typeof value === "string" && (allowed as readonly string[]).includes(value)
    ? (value as T)
    : fallback;
}
