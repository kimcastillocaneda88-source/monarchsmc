import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminAuth, adminDb, isAdminConfigured } from "@/lib/firebase/admin";
import { SESSION_COOKIE, SESSION_MAX_AGE_MS, syncCustomClaims } from "@/lib/auth/session";
import { consumeRateLimit, subjectFromRequest } from "@/lib/data/rate-limit";
import { MEMBERS, USERS } from "@/lib/data/members";
import type { MembershipStatus, Role } from "@/types";
import { MEMBERSHIP_STATUSES, ROLES } from "@/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function json(status: number, body: Record<string, unknown>) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

/**
 * Exchanges a freshly minted Firebase ID token for an httpOnly session cookie.
 *
 * This is the only place a browser identity becomes a server identity. The ID
 * token is verified with revocation checking; the cookie that comes back is
 * httpOnly + secure + sameSite=lax so it cannot be read by scripts and is not
 * sent on cross-site POSTs.
 */
export async function POST(request: Request) {
  if (!isAdminConfigured()) {
    return json(503, { message: "Authentication is not configured on this deployment." });
  }

  try {
    await consumeRateLimit({
      key: "session",
      subject: await subjectFromRequest(request.headers),
      limit: 20,
      windowMs: 10 * 60 * 1000,
    });
  } catch {
    return json(429, { message: "Too many sign-in attempts. Please wait and try again." });
  }

  let idToken: string;
  try {
    const body = (await request.json()) as { idToken?: unknown };
    if (typeof body.idToken !== "string" || body.idToken.length < 20 || body.idToken.length > 8000) {
      return json(400, { message: "Invalid sign-in request." });
    }
    idToken = body.idToken;
  } catch {
    return json(400, { message: "Invalid sign-in request." });
  }

  try {
    const decoded = await adminAuth().verifyIdToken(idToken, true);

    // Firebase requires the ID token to be recent to mint a session cookie.
    const authTimeMs = decoded.auth_time * 1000;
    if (Date.now() - authTimeMs > 5 * 60 * 1000) {
      return json(401, { message: "Your sign-in expired. Please sign in again." });
    }

    const email = (decoded.email ?? "").toLowerCase();
    if (!email) return json(400, { message: "This account has no email address." });

    const db = adminDb();
    const userRef = db.collection(USERS).doc(decoded.uid);
    const snap = await userRef.get();

    let role: Role = "member";
    let membershipStatus: MembershipStatus = "pending";

    if (snap.exists) {
      const data = snap.data() ?? {};
      role = (ROLES as readonly string[]).includes(String(data.role)) ? (data.role as Role) : "member";
      membershipStatus = (MEMBERSHIP_STATUSES as readonly string[]).includes(String(data.membershipStatus))
        ? (data.membershipStatus as MembershipStatus)
        : "pending";
      await userRef.update({ lastLoginAt: FieldValue.serverTimestamp(), email });
    } else {
      // First sign-in for an account created by an administrator. The record is
      // created as a pending member with no privileges — creating an auth user
      // never grants club membership.
      await userRef.set({
        email,
        role: "member",
        membershipStatus: "pending",
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        lastLoginAt: FieldValue.serverTimestamp(),
      });
      await db
        .collection(MEMBERS)
        .doc(decoded.uid)
        .set(
          {
            displayName: decoded.name ?? email.split("@")[0] ?? "Member",
            nickname: null,
            photoPath: null,
            photoUrl: null,
            motorcycle: null,
            bio: null,
            chapter: null,
            ridingSince: null,
            position: null,
            publicOfficer: false,
            officerOrder: 99,
            privacy: { showInDirectory: true, showEmail: false, showPhone: false },
            membershipStatus: "pending",
            role: "member",
            joinedAt: null,
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
          },
          { merge: true },
        );
    }

    // Security Rules read custom claims, so they must match the authoritative
    // users/{uid} record before the session becomes usable.
    await syncCustomClaims(decoded.uid, role, membershipStatus);

    const sessionCookie = await adminAuth().createSessionCookie(idToken, {
      expiresIn: SESSION_MAX_AGE_MS,
    });

    const response = json(200, { ok: true, membershipStatus, role });
    response.cookies.set({
      name: SESSION_COOKIE,
      value: sessionCookie,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: Math.floor(SESSION_MAX_AGE_MS / 1000),
    });
    return response;
  } catch {
    return json(401, { message: "We could not verify your sign-in. Please try again." });
  }
}

/** Clears the session cookie. */
export async function DELETE() {
  const response = json(200, { ok: true });
  response.cookies.set({
    name: SESSION_COOKIE,
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return response;
}
