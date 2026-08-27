"use server";

import { revalidatePath } from "next/cache";
import { FieldValue } from "firebase-admin/firestore";
import { db } from "@/lib/data/client";
import { adminAuth } from "@/lib/firebase/admin";
import { requireClubManager, requireSuperadmin } from "@/lib/auth/guards";
import { canAssignRole, type Principal } from "@/lib/auth/roles";
import { syncCustomClaims } from "@/lib/auth/session";
import { toUserMessage } from "@/lib/auth/errors";
import { recordAudit } from "@/lib/data/audit";
import {
  applicationStatusSchema,
  fieldErrorsOf,
  memberAdminUpdateSchema,
  roleChangeSchema,
} from "@/lib/validation/schemas";
import { APPLICATIONS } from "@/lib/data/applications";
import { MEMBERS, MEMBER_ADMIN, MEMBER_CONTACT, USERS } from "@/lib/data/members";
import { ensureUsername } from "@/lib/data/usernames";
import type { MembershipStatus } from "@/types";
import type { FormState } from "../form-state";

const ok = (message: string): FormState => ({ status: "success", message, fieldErrors: {} });
const err = (message: string, fieldErrors: Record<string, string> = {}): FormState => ({
  status: "error",
  message,
  fieldErrors,
});

const STATUS_AUDIT = {
  active: "member.approve",
  suspended: "member.suspend",
  inactive: "member.deactivate",
  pending: "member.update",
} as const;

/* ------------------------------------------------------ membership status */

/**
 * Changes a member's membership status.
 *
 * The status is written to users/{uid} (authoritative), mirrored onto
 * members/{uid} so directory queries can filter on it, and pushed into the
 * account's custom claims so Security Rules see the change immediately.
 */
export async function setMembershipStatus(
  uid: string,
  status: MembershipStatus,
  note?: string,
): Promise<FormState> {
  try {
    const actor = await requireClubManager();

    if (uid === actor.uid && status !== "active") {
      return err("You cannot deactivate your own account.");
    }

    const userRef = db().collection(USERS).doc(uid);
    const snap = await userRef.get();
    if (!snap.exists) return err("That member no longer exists.");

    const role = String(snap.data()?.role ?? "member");
    const uploadAccess = snap.data()?.uploadAccess === true;

    // A club manager must not be able to suspend a superadmin.
    if (role === "superadmin" && actor.role !== "superadmin") {
      return err("Only a superadmin can change a superadmin's membership.");
    }

    const batch = db().batch();
    batch.update(userRef, {
      membershipStatus: status,
      updatedAt: FieldValue.serverTimestamp(),
      ...(status === "active"
        ? { approvedBy: actor.uid, approvedAt: FieldValue.serverTimestamp() }
        : {}),
    });
    batch.set(
      db().collection(MEMBERS).doc(uid),
      {
        membershipStatus: status,
        ...(status === "active" ? { joinedAt: snap.data()?.approvedAt ?? FieldValue.serverTimestamp() } : {}),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
    batch.set(
      db().collection(MEMBER_ADMIN).doc(uid),
      {
        statusHistory: FieldValue.arrayUnion({
          status,
          at: Date.now(),
          by: actor.uid,
          ...(note ? { note } : {}),
        }),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
    await batch.commit();

    await syncCustomClaims(uid, role as Principal["role"], status, uploadAccess);

    // Suspension and deactivation must take effect now, not when the token
    // happens to expire, so existing sessions are revoked.
    if (status !== "active") {
      await adminAuth().revokeRefreshTokens(uid);
    }

    await recordAudit(actor, STATUS_AUDIT[status], "member", uid, {
      status,
      note: note ?? null,
    });

    revalidatePath("/admin/members");
    revalidatePath("/member/directory");
    revalidatePath("/about");
    return ok(`Membership set to ${status}.`);
  } catch (error) {
    return err(toUserMessage(error, "We could not update that member."));
  }
}

/** Admin-editable member fields: officer position and internal notes. */
export async function updateMemberAdminFields(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  try {
    const actor = await requireClubManager();

    const parsed = memberAdminUpdateSchema.safeParse({
      uid: formData.get("uid"),
      position: formData.get("position") ?? "",
      publicOfficer: formData.get("publicOfficer") === "on",
      officerOrder: formData.get("officerOrder") ?? 99,
      notes: formData.get("notes") ?? "",
    });

    if (!parsed.success) return err("Please correct the highlighted fields.", fieldErrorsOf(parsed.error));

    const { uid, notes, ...profileFields } = parsed.data;
    const snap = await db().collection(USERS).doc(uid).get();
    if (!snap.exists) return err("That member no longer exists.");

    const batch = db().batch();
    batch.set(
      db().collection(MEMBERS).doc(uid),
      {
        position: profileFields.position ?? null,
        publicOfficer: profileFields.publicOfficer ?? false,
        officerOrder: profileFields.officerOrder ?? 99,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
    batch.set(
      db().collection(MEMBER_ADMIN).doc(uid),
      { notes: notes ?? null, updatedAt: FieldValue.serverTimestamp() },
      { merge: true },
    );
    await batch.commit();

    await recordAudit(actor, "member.update", "member", uid, {
      position: profileFields.position ?? null,
      publicOfficer: profileFields.publicOfficer ?? false,
    });

    revalidatePath("/admin/members");
    revalidatePath("/about");
    return ok("Member updated.");
  } catch (error) {
    return err(toUserMessage(error, "We could not update that member."));
  }
}

/* ------------------------------------------------------------ role changes */

/**
 * Assigns a role. Superadmin only, by design.
 *
 * Two invariants are enforced here and cannot be bypassed from the client,
 * because Security Rules deny every client write to users/{uid}:
 *   - nobody may change their own role (no self-elevation)
 *   - the last remaining superadmin cannot be demoted (no lock-out)
 */
export async function changeRole(_prev: FormState, formData: FormData): Promise<FormState> {
  try {
    const actor = await requireSuperadmin();

    const parsed = roleChangeSchema.safeParse({
      uid: formData.get("uid"),
      role: formData.get("role"),
    });
    if (!parsed.success) return err("That role was not recognised.");

    const { uid, role } = parsed.data;

    if (uid === actor.uid) {
      return err("You cannot change your own role. Ask another superadmin.");
    }
    if (!canAssignRole(actor, role)) {
      return err("You do not have permission to assign that role.");
    }

    const userRef = db().collection(USERS).doc(uid);
    const snap = await userRef.get();
    if (!snap.exists) return err("That member no longer exists.");

    const currentRole = String(snap.data()?.role ?? "member");
    if (currentRole === role) return ok("That member already holds this role.");

    if (currentRole === "superadmin") {
      const remaining = await db()
        .collection(USERS)
        .where("role", "==", "superadmin")
        .count()
        .get();
      if (remaining.data().count <= 1) {
        return err("This is the only superadmin. Promote someone else before changing this account.");
      }
    }

    const membershipStatus = String(snap.data()?.membershipStatus ?? "pending") as MembershipStatus;
    const uploadAccess = snap.data()?.uploadAccess === true;

    const batch = db().batch();
    batch.update(userRef, { role, updatedAt: FieldValue.serverTimestamp() });
    batch.set(
      db().collection(MEMBERS).doc(uid),
      { role, updatedAt: FieldValue.serverTimestamp() },
      { merge: true },
    );
    await batch.commit();

    await syncCustomClaims(uid, role, membershipStatus, uploadAccess);
    // Force a fresh token so the new role is in effect immediately.
    await adminAuth().revokeRefreshTokens(uid);

    await recordAudit(actor, "role.change", "member", uid, { from: currentRole, to: role });

    revalidatePath("/admin/members");
    revalidatePath("/admin/audit-log");
    return ok(`Role changed to ${role}.`);
  } catch (error) {
    return err(toUserMessage(error, "We could not change that role."));
  }
}

/* --------------------------------------------------------- applications */

export async function updateApplicationStatus(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  try {
    const actor = await requireClubManager();

    const parsed = applicationStatusSchema.safeParse({
      applicationId: formData.get("applicationId"),
      status: formData.get("status"),
      internalNotes: formData.get("internalNotes") ?? "",
    });
    if (!parsed.success) return err("Please correct the highlighted fields.", fieldErrorsOf(parsed.error));

    const ref = db().collection(APPLICATIONS).doc(parsed.data.applicationId);
    const snap = await ref.get();
    if (!snap.exists) return err("That application no longer exists.");

    await ref.update({
      status: parsed.data.status,
      internalNotes: parsed.data.internalNotes,
      reviewedBy: actor.uid,
      reviewedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    await recordAudit(actor, "application.status_change", "application", parsed.data.applicationId, {
      status: parsed.data.status,
    });

    revalidatePath("/admin/applications");
    return ok("Application updated.");
  } catch (error) {
    return err(toUserMessage(error, "We could not update that application."));
  }
}

/**
 * Creates a member account from an accepted application.
 *
 * This is the only path from "applied" to "has an account", and it is
 * deliberately manual. The new account starts as a PENDING member with the
 * `member` role — creating the login does not grant membership. An officer
 * activates it separately, which keeps approval a distinct, audited decision.
 *
 * No password is set: the applicant receives a password-reset link and chooses
 * their own, so no credential is ever transmitted by the club.
 */
export async function createAccountFromApplication(applicationId: string): Promise<FormState> {
  try {
    const actor = await requireClubManager();

    const ref = db().collection(APPLICATIONS).doc(applicationId);
    const snap = await ref.get();
    if (!snap.exists) return err("That application no longer exists.");

    const application = snap.data() ?? {};
    if (application.linkedUid) return err("An account has already been created for this application.");

    const email = String(application.email ?? "").toLowerCase();
    if (!email) return err("That application has no email address.");

    const displayName = String(application.preferredName || application.fullName || "Member");

    let uid: string;
    try {
      const existing = await adminAuth().getUserByEmail(email);
      uid = existing.uid;
    } catch {
      const created = await adminAuth().createUser({
        email,
        emailVerified: false,
        displayName,
        disabled: false,
      });
      uid = created.uid;
    }

    // An account reached this way never chose a sign-in name, so mint one now
    // rather than leave the applicant unable to sign in by username.
    const username = await ensureUsername(uid, email, displayName);

    const batch = db().batch();
    batch.set(
      db().collection(USERS).doc(uid),
      {
        email,
        username,
        role: "member",
        membershipStatus: "pending",
        uploadAccess: false,
        applicationId,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
    batch.set(
      db().collection(MEMBERS).doc(uid),
      {
        displayName,
        nickname: application.preferredName ?? null,
        photoPath: null,
        photoUrl: null,
        motorcycle: application.motorcycle ?? null,
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
    batch.set(
      db().collection(MEMBER_CONTACT).doc(uid),
      {
        email,
        phone: application.phone ?? null,
        location: application.location ?? null,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
    batch.update(ref, {
      status: "accepted",
      linkedUid: uid,
      reviewedBy: actor.uid,
      reviewedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    await batch.commit();

    await syncCustomClaims(uid, "member", "pending", false);
    await recordAudit(actor, "application.accept", "application", applicationId, {
      uid,
      email,
      username,
    });

    revalidatePath("/admin/applications");
    revalidatePath("/admin/members");

    return ok(
      `Account created as a pending member with the username "${username}". Send them a password reset link so they can set a password, then approve their access.`,
    );
  } catch (error) {
    return err(toUserMessage(error, "We could not create that account."));
  }
}

/**
 * Generates a password-reset link for a member.
 * Returned to the officer to pass on — the club never sets or sees a password.
 */
export async function generatePasswordResetLink(uid: string): Promise<FormState> {
  try {
    const actor = await requireClubManager();
    const snap = await db().collection(USERS).doc(uid).get();
    if (!snap.exists) return err("That member no longer exists.");

    const email = String(snap.data()?.email ?? "");
    if (!email) return err("That member has no email address.");

    const link = await adminAuth().generatePasswordResetLink(email);
    await recordAudit(actor, "member.update", "member", uid, { action: "password_reset_link" });

    return { status: "success", message: link, fieldErrors: {} };
  } catch (error) {
    return err(toUserMessage(error, "We could not generate a reset link."));
  }
}
