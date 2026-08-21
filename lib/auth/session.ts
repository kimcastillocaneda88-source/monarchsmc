import "server-only";

import { cache } from "react";
import { cookies } from "next/headers";
import { adminAuth, adminDb, isAdminConfigured } from "@/lib/firebase/admin";
import type { MembershipStatus, Role, SessionUser } from "@/types";
import { ROLES, MEMBERSHIP_STATUSES } from "@/types";

export const SESSION_COOKIE = "monarchs_session";
/** 5 days, matching the maximum practical Firebase session cookie lifetime we want. */
export const SESSION_MAX_AGE_MS = 5 * 24 * 60 * 60 * 1000;

function isRole(value: unknown): value is Role {
  return typeof value === "string" && (ROLES as readonly string[]).includes(value);
}

function isMembershipStatus(value: unknown): value is MembershipStatus {
  return typeof value === "string" && (MEMBERSHIP_STATUSES as readonly string[]).includes(value);
}

/**
 * Resolves the current request's principal.
 *
 * Authorization state (role, membership status) is always read from
 * users/{uid} rather than from the cookie's claims, so a suspension or role
 * change takes effect on the very next request instead of when the token
 * happens to refresh.
 */
async function loadSession(): Promise<SessionUser | null> {
  if (!isAdminConfigured()) return null;

  const store = await cookies();
  const cookie = store.get(SESSION_COOKIE)?.value;
  if (!cookie) return null;

  try {
    const decoded = await adminAuth().verifySessionCookie(cookie, true);
    const snap = await adminDb().collection("users").doc(decoded.uid).get();
    if (!snap.exists) return null;
    const data = snap.data() ?? {};

    const role = isRole(data.role) ? data.role : "member";
    const membershipStatus = isMembershipStatus(data.membershipStatus)
      ? data.membershipStatus
      : "pending";

    return {
      uid: decoded.uid,
      email: typeof data.email === "string" ? data.email : (decoded.email ?? ""),
      role,
      membershipStatus,
      displayName: typeof data.displayName === "string" ? data.displayName : (decoded.name ?? null),
    };
  } catch {
    // Expired, revoked or tampered cookie — treated as signed out.
    return null;
  }
}

/** Per-request memoised session lookup. */
export const getSessionUser = cache(loadSession);

/**
 * Keeps Firebase custom claims in sync with users/{uid}.
 * Claims are what Firestore and Storage Security Rules read, so they must
 * reflect the authoritative record. Returns true when claims were rewritten.
 */
export async function syncCustomClaims(
  uid: string,
  role: Role,
  membershipStatus: MembershipStatus,
): Promise<boolean> {
  const user = await adminAuth().getUser(uid);
  const current = user.customClaims ?? {};
  if (current.role === role && current.membershipStatus === membershipStatus) return false;
  await adminAuth().setCustomUserClaims(uid, { role, membershipStatus });
  return true;
}
