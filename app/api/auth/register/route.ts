import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminAuth, adminDb, isAdminConfigured } from "@/lib/firebase/admin";
import { consumeRateLimit, subjectFromRequest } from "@/lib/data/rate-limit";
import { MEMBERS, USERS } from "@/lib/data/members";
import { releaseUsername, reserveUsername, UsernameTakenError } from "@/lib/data/usernames";
import { accessRequestSchema, fieldErrorsOf } from "@/lib/validation/schemas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function json(status: number, body: Record<string, unknown>) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

/**
 * Requests access to the club site.
 *
 * The applicant chooses a username and password here; an administrator then
 * approves or refuses the account on /admin/access. Nothing in this route
 * grants anything:
 *
 *   membershipStatus: "pending"  — sign-in works, but every member page
 *                                  redirects to /member/pending until an
 *                                  officer activates the account
 *   role:             "member"   — the lowest role there is
 *   uploadAccess:     false      — uploading is a separate grant, made
 *                                  deliberately and revocable on its own
 *
 * The password is passed straight to Firebase Authentication and never stored,
 * logged or read back by this application.
 */
export async function POST(request: Request) {
  if (!isAdminConfigured()) {
    return json(503, { message: "Account requests are not available on this deployment." });
  }

  // Account creation is expensive and abusable, so the per-address ceiling is
  // much tighter than the one on sign-in.
  try {
    await consumeRateLimit({
      key: "register",
      subject: await subjectFromRequest(request.headers),
      limit: 5,
      windowMs: 60 * 60 * 1000,
    });
  } catch {
    return json(429, { message: "Too many requests from this connection. Please try again later." });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json(400, { message: "That request could not be read." });
  }

  const parsed = accessRequestSchema.safeParse(body);
  if (!parsed.success) {
    return json(422, {
      message: "Please correct the highlighted fields.",
      fieldErrors: fieldErrorsOf(parsed.error),
    });
  }

  const { username, displayName, email, password } = parsed.data;

  // Claim the username before anything else. The reservation document's id is
  // the username, so this either wins the race outright or fails.
  try {
    await reserveUsername(username, { uid: "pending", email });
  } catch (error) {
    if (error instanceof UsernameTakenError) {
      return json(409, {
        message: "That username is already taken.",
        fieldErrors: { username: "That username is already taken." },
      });
    }
    return json(503, { message: "We could not process that request. Please try again." });
  }

  let uid: string;
  try {
    const created = await adminAuth().createUser({
      email,
      password,
      displayName,
      emailVerified: false,
      disabled: false,
    });
    uid = created.uid;
  } catch (error) {
    // Nothing was created, so the username must not stay claimed.
    await releaseUsername(username).catch(() => {});
    const code = String((error as { code?: unknown })?.code ?? "");
    if (code === "auth/email-already-exists") {
      return json(409, {
        message: "An account already exists for that email address.",
        fieldErrors: { email: "An account already exists for that email address." },
      });
    }
    if (code === "auth/invalid-password") {
      return json(422, {
        message: "Choose a longer password.",
        fieldErrors: { password: "Choose a password of at least 12 characters." },
      });
    }
    return json(503, { message: "We could not create that account. Please try again." });
  }

  try {
    const db = adminDb();
    const batch = db.batch();

    batch.set(db.collection(USERS).doc(uid), {
      email,
      username,
      displayName,
      role: "member",
      membershipStatus: "pending",
      uploadAccess: false,
      uploadAccessGrantedBy: null,
      uploadAccessGrantedAt: null,
      approvedBy: null,
      approvedAt: null,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    batch.set(
      db.collection(MEMBERS).doc(uid),
      {
        displayName,
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

    // Point the reservation at the account that now holds it.
    batch.set(db.collection("usernames").doc(username), { uid, email }, { merge: true });

    await batch.commit();

    // Security Rules read custom claims, so they must agree with the record
    // from the moment the account exists.
    await adminAuth().setCustomUserClaims(uid, {
      role: "member",
      membershipStatus: "pending",
      uploadAccess: false,
    });
  } catch {
    /**
     * The auth account exists but its records do not, which would leave an
     * account that can sign in with no membership row behind it. Undo both so
     * the applicant can simply try again.
     */
    await adminAuth().deleteUser(uid).catch(() => {});
    await releaseUsername(username).catch(() => {});
    return json(503, { message: "We could not create that account. Please try again." });
  }

  return json(201, {
    ok: true,
    message:
      "Your request has been sent. An officer will review it — you can sign in once your access is approved.",
  });
}
