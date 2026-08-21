import "server-only";

import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { RateLimitError } from "@/lib/auth/errors";

/**
 * Fixed-window rate limiter backed by Firestore.
 *
 * Serverless functions have no shared memory, so the counter lives in a
 * document that only trusted server code can touch (Security Rules deny all
 * client access to rateLimits). The transaction makes concurrent requests in
 * the same window count correctly.
 */
export interface RateLimitRule {
  /** Logical bucket, e.g. "contact" or "join". */
  key: string;
  /** Caller identity: hashed IP, uid, or similar. */
  subject: string;
  limit: number;
  windowMs: number;
}

function docId(rule: RateLimitRule): string {
  // Firestore ids may not contain "/".
  return `${rule.key}__${rule.subject}`.replace(/[/#?[\]*]/g, "_").slice(0, 400);
}

export async function consumeRateLimit(rule: RateLimitRule): Promise<void> {
  const ref = adminDb().collection("rateLimits").doc(docId(rule));
  const now = Date.now();

  const allowed = await adminDb().runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const data = snap.data();
    const windowStart =
      data?.windowStart instanceof Timestamp ? data.windowStart.toMillis() : 0;
    const count = typeof data?.count === "number" ? data.count : 0;

    if (!snap.exists || now - windowStart >= rule.windowMs) {
      tx.set(ref, {
        key: rule.key,
        count: 1,
        windowStart: Timestamp.fromMillis(now),
        expiresAt: Timestamp.fromMillis(now + rule.windowMs * 4),
        updatedAt: FieldValue.serverTimestamp(),
      });
      return true;
    }

    if (count >= rule.limit) return false;

    tx.update(ref, { count: count + 1, updatedAt: FieldValue.serverTimestamp() });
    return true;
  });

  if (!allowed) throw new RateLimitError();
}

/**
 * Derives a stable, non-identifying subject from request headers.
 * We hash so raw IP addresses are never persisted.
 */
export async function subjectFromRequest(headers: Headers, salt = "monarchs"): Promise<string> {
  const forwarded = headers.get("x-forwarded-for") ?? "";
  const ip = forwarded.split(",")[0]?.trim() || headers.get("x-real-ip") || "unknown";
  const data = new TextEncoder().encode(`${salt}:${ip}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .slice(0, 12)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
