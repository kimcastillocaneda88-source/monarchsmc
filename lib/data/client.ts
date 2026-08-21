import "server-only";

import { adminDb, isAdminConfigured } from "@/lib/firebase/admin";
import type { Firestore } from "firebase-admin/firestore";

/**
 * Data-layer entry point.
 *
 * A freshly cloned project — or a Vercel build before environment variables
 * are set — has no Firebase credentials. Public pages must still render, with
 * empty states, rather than crashing the build. `withDb` centralises that.
 */
export async function withDb<T>(fallback: T, fn: (db: Firestore) => Promise<T>): Promise<T> {
  if (!isAdminConfigured()) return fallback;
  try {
    return await fn(adminDb());
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.error("[data] query failed", error);
    }
    return fallback;
  }
}

/** Same as withDb but rethrows — for mutations, where silent failure is wrong. */
export function db(): Firestore {
  return adminDb();
}

export { isAdminConfigured };

/** Hard ceiling applied to every list query so a large collection cannot be pulled at once. */
export const MAX_PAGE_SIZE = 48;

export function clampLimit(requested: number | undefined, fallback: number): number {
  if (!requested || !Number.isFinite(requested) || requested <= 0) return fallback;
  return Math.min(Math.floor(requested), MAX_PAGE_SIZE);
}
