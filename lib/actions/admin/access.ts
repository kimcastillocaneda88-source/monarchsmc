"use server";

import { revalidatePath } from "next/cache";
import { FieldValue } from "firebase-admin/firestore";
import { db } from "@/lib/data/client";
import { adminAuth } from "@/lib/firebase/admin";
import { requireClubManager } from "@/lib/auth/guards";
import { syncCustomClaims } from "@/lib/auth/session";
import { toUserMessage } from "@/lib/auth/errors";
import { recordAudit } from "@/lib/data/audit";
import { MEMBERS, MEMBER_ADMIN, USERS } from "@/lib/data/members";
import type { MembershipStatus, Role } from "@/types";
import type { FormState } from "../form-state";

const ok = (message: string): FormState => ({ status: "success", message, fieldErrors: {} });
const err = (message: string): FormState => ({ status: "error", message, fieldErrors: {} });

/**
 * Access control for member accounts.
 *
 * Two separate decisions live here, and keeping them separate is the point:
 *
 *   membership   — may this person use the member area at all
 *   uploadAccess — may they contribute photographs, video and files
 *
 * An officer can grant somebody entry without letting them upload, or withdraw
 * uploading without ending their membership. Every change is written to
 * users/{uid}, mirrored into custom claims so Security Rules agree immediately,
 * and recorded in the audit log.
 */

interface AccountState {
  role: Role;
  membershipStatus: MembershipStatus;
  uploadAccess: boolean;
  username: string;
  email: string;
}

async function readAccount(uid: string): Promise<AccountState | null> {
  const snap = await db().collection(USERS).doc(uid).get();
  if (!snap.exists) return null;
  const d = snap.data() ?? {};
  return {
    role: (typeof d.role === "string" ? d.role : "member") as Role,
    membershipStatus: (typeof d.membershipStatus === "string"
      ? d.membershipStatus
      : "pending") as MembershipStatus,
    uploadAccess: d.uploadAccess === true,
    username: typeof d.username === "string" ? d.username : "",
    email: typeof d.email === "string" ? d.email : "",
  };
}

function revalidateAccessViews() {
  revalidatePath("/admin/access");
  revalidatePath("/admin/members");
  revalidatePath("/member/directory");
  revalidatePath("/");
}

/**
 * Approves a pending request, turning it into a working account.
 *
 * Approving deliberately does not grant upload access — that is a second,
 * separate decision, so that letting somebody in never silently lets them
 * publish.
 */
export async function approveAccess(uid: string): Promise<FormState> {
  try {
    const actor = await requireClubManager();
    const account = await readAccount(uid);
    if (!account) return err("That account no longer exists.");

    if (account.role === "superadmin" && actor.role !== "superadmin") {
      return err("Only a superadmin can change a superadmin's access.");
    }
    if (account.membershipStatus === "active") return ok("That account already has access.");

    const batch = db().batch();
    batch.update(db().collection(USERS).doc(uid), {
      membershipStatus: "active",
      approvedBy: actor.uid,
      approvedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    batch.set(
      db().collection(MEMBERS).doc(uid),
      {
        membershipStatus: "active",
        joinedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
    batch.set(
      db().collection(MEMBER_ADMIN).doc(uid),
      {
        statusHistory: FieldValue.arrayUnion({
          status: "active",
          at: Date.now(),
          by: actor.uid,
          note: "Access approved",
        }),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
    await batch.commit();

    await syncCustomClaims(uid, account.role, "active", account.uploadAccess);
    await recordAudit(actor, "access.approve", "member", uid, {
      username: account.username,
      email: account.email,
    });

    revalidateAccessViews();
    return ok(`Access approved for ${account.username || account.email}.`);
  } catch (error) {
    return err(toUserMessage(error, "We could not approve that account."));
  }
}

/**
 * Withdraws access.
 *
 * `suspended` is a reversible hold; `inactive` retires the account. Either way
 * the upload grant goes too — an account that cannot sign in has no business
 * keeping a standing permission — and refresh tokens are revoked so any session
 * already open stops working now rather than whenever its token expires.
 */
export async function revokeAccess(
  uid: string,
  status: Extract<MembershipStatus, "suspended" | "inactive"> = "suspended",
): Promise<FormState> {
  try {
    const actor = await requireClubManager();

    // Locking yourself out would leave the club with one fewer officer and no
    // way for that officer to undo it.
    if (uid === actor.uid) return err("You cannot revoke your own access.");

    const account = await readAccount(uid);
    if (!account) return err("That account no longer exists.");

    if (account.role === "superadmin" && actor.role !== "superadmin") {
      return err("Only a superadmin can revoke a superadmin's access.");
    }

    const batch = db().batch();
    batch.update(db().collection(USERS).doc(uid), {
      membershipStatus: status,
      uploadAccess: false,
      uploadAccessGrantedBy: null,
      uploadAccessGrantedAt: null,
      updatedAt: FieldValue.serverTimestamp(),
    });
    batch.set(
      db().collection(MEMBERS).doc(uid),
      { membershipStatus: status, updatedAt: FieldValue.serverTimestamp() },
      { merge: true },
    );
    batch.set(
      db().collection(MEMBER_ADMIN).doc(uid),
      {
        statusHistory: FieldValue.arrayUnion({
          status,
          at: Date.now(),
          by: actor.uid,
          note: "Access revoked",
        }),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
    await batch.commit();

    await syncCustomClaims(uid, account.role, status, false);
    await adminAuth().revokeRefreshTokens(uid);

    await recordAudit(actor, "access.revoke", "member", uid, {
      username: account.username,
      status,
    });

    revalidateAccessViews();
    return ok(`Access revoked for ${account.username || account.email}.`);
  } catch (error) {
    return err(toUserMessage(error, "We could not revoke that account's access."));
  }
}

/**
 * Grants or withdraws permission to upload photographs, video and files.
 *
 * Granting requires an already-active account: an officer cannot pre-authorise
 * somebody who has not been let in yet, which would make the upload grant a
 * back door around approval.
 */
export async function setUploadAccess(uid: string, allowed: boolean): Promise<FormState> {
  try {
    const actor = await requireClubManager();
    const account = await readAccount(uid);
    if (!account) return err("That account no longer exists.");

    if (allowed && account.membershipStatus !== "active") {
      return err("Approve this account's access before granting uploads.");
    }
    if (account.uploadAccess === allowed) {
      return ok(allowed ? "That account can already upload." : "That account cannot upload.");
    }

    await db()
      .collection(USERS)
      .doc(uid)
      .update({
        uploadAccess: allowed,
        uploadAccessGrantedBy: allowed ? actor.uid : null,
        uploadAccessGrantedAt: allowed ? FieldValue.serverTimestamp() : null,
        updatedAt: FieldValue.serverTimestamp(),
      });

    await syncCustomClaims(uid, account.role, account.membershipStatus, allowed);

    await recordAudit(
      actor,
      allowed ? "access.upload_grant" : "access.upload_revoke",
      "member",
      uid,
      { username: account.username },
    );

    revalidateAccessViews();
    return ok(
      allowed
        ? `${account.username || account.email} can now upload.`
        : `Upload access withdrawn from ${account.username || account.email}.`,
    );
  } catch (error) {
    return err(toUserMessage(error, "We could not change that upload permission."));
  }
}
