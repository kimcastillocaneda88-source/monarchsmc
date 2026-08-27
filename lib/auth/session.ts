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

  let decoded: Awaited<ReturnType<ReturnType<typeof adminAuth>["verifySessionCookie"]>>;
  try {
    // checkRevoked: a suspension or role change revokes refresh tokens, and
    // that must end existing sessions immediately rather than at expiry.
    decoded = await adminAuth().verifySessionCookie(cookie, true);
  } catch (error) {
    /**
     * Only a genuine verification failure means "signed out".
     *
     * Treating every error that way — including a transient failure reaching
     * the auth service — silently logs a member out mid-action, which looks
     * to them like the site lost their session for no reason. Anything that
     * is not a recognised auth failure is rethrown so it surfaces as an error
     * the operator can see, instead of a mysterious redirect to sign-in.
     */
    const code =
      typeof error === "object" && error !== null && "code" in error
        ? String((error as { code: unknown }).code)
        : "";
    if (code.startsWith("auth/")) return null;
    throw error;
  }

  try {
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
      username: typeof data.username === "string" ? data.username : "",
      role,
      membershipStatus,
      // Read from the record, never from the cookie, so a revoked grant takes
      // effect on the very next request.
      uploadAccess: data.uploadAccess === true,
      displayName: typeof data.displayName === "string" ? data.displayName : (decoded.name ?? null),
    };
  } catch {
    // The cookie verified but the account record could not be read. Treat the
    // request as unauthenticated rather than guessing at privileges.
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
  uploadAccess: boolean,
): Promise<boolean> {
  const user = await adminAuth().getUser(uid);
  const current = user.customClaims ?? {};
  if (
    current.role === role &&
    current.membershipStatus === membershipStatus &&
    current.uploadAccess === uploadAccess
  ) {
    return false;
  }
  await adminAuth().setCustomUserClaims(uid, { role, membershipStatus, uploadAccess });
  return true;
}
