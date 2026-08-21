import "server-only";

import type { QueryDocumentSnapshot } from "firebase-admin/firestore";
import { clampLimit, withDb } from "./client";
import { bool, nullableStr, num, oneOf, requireMillis, str, toMillis } from "./serialize";
import {
  MEMBERSHIP_STATUSES,
  OFFICER_POSITIONS,
  ROLES,
  type DirectoryEntry,
  type MemberAdminRecord,
  type MemberContact,
  type MemberProfile,
  type MembershipStatus,
  type OfficerPosition,
  type Role,
  type UserRecord,
} from "@/types";

export const USERS = "users";
export const MEMBERS = "members";
export const MEMBER_CONTACT = "memberContact";
export const MEMBER_ADMIN = "memberAdmin";

export function mapUser(doc: QueryDocumentSnapshot): UserRecord {
  const d = doc.data();
  return {
    uid: doc.id,
    email: str(d.email),
    role: oneOf<Role>(d.role, ROLES, "member"),
    membershipStatus: oneOf<MembershipStatus>(d.membershipStatus, MEMBERSHIP_STATUSES, "pending"),
    createdAt: requireMillis(d.createdAt),
    updatedAt: requireMillis(d.updatedAt),
    lastLoginAt: toMillis(d.lastLoginAt),
    approvedBy: nullableStr(d.approvedBy),
    approvedAt: toMillis(d.approvedAt),
    applicationId: nullableStr(d.applicationId),
  };
}

export function mapMember(doc: QueryDocumentSnapshot): MemberProfile {
  const d = doc.data();
  const privacy = (d.privacy ?? {}) as Record<string, unknown>;
  return {
    uid: doc.id,
    displayName: str(d.displayName, "Member"),
    nickname: nullableStr(d.nickname),
    photoPath: nullableStr(d.photoPath),
    photoUrl: nullableStr(d.photoUrl),
    motorcycle: nullableStr(d.motorcycle),
    bio: nullableStr(d.bio),
    chapter: nullableStr(d.chapter),
    ridingSince: num(d.ridingSince),
    position: (typeof d.position === "string" && (OFFICER_POSITIONS as readonly string[]).includes(d.position)
      ? d.position
      : null) as OfficerPosition | null,
    publicOfficer: bool(d.publicOfficer),
    officerOrder: num(d.officerOrder),
    privacy: {
      showInDirectory: bool(privacy.showInDirectory, true),
      showEmail: bool(privacy.showEmail, false),
      showPhone: bool(privacy.showPhone, false),
    },
    membershipStatus: oneOf<MembershipStatus>(d.membershipStatus, MEMBERSHIP_STATUSES, "pending"),
    role: oneOf<Role>(d.role, ROLES, "member"),
    joinedAt: toMillis(d.joinedAt),
    createdAt: requireMillis(d.createdAt),
    updatedAt: requireMillis(d.updatedAt),
  };
}

export function mapContact(doc: QueryDocumentSnapshot): MemberContact {
  const d = doc.data();
  return {
    uid: doc.id,
    email: str(d.email),
    phone: nullableStr(d.phone),
    location: nullableStr(d.location),
    emergencyContactName: nullableStr(d.emergencyContactName),
    emergencyContactPhone: nullableStr(d.emergencyContactPhone),
    updatedAt: requireMillis(d.updatedAt),
  };
}

export async function getUserRecord(uid: string): Promise<UserRecord | null> {
  return withDb<UserRecord | null>(null, async (database) => {
    const doc = await database.collection(USERS).doc(uid).get();
    return doc.exists ? mapUser(doc as QueryDocumentSnapshot) : null;
  });
}

export async function getMemberProfile(uid: string): Promise<MemberProfile | null> {
  return withDb<MemberProfile | null>(null, async (database) => {
    const doc = await database.collection(MEMBERS).doc(uid).get();
    return doc.exists ? mapMember(doc as QueryDocumentSnapshot) : null;
  });
}

export async function getMemberContact(uid: string): Promise<MemberContact | null> {
  return withDb<MemberContact | null>(null, async (database) => {
    const doc = await database.collection(MEMBER_CONTACT).doc(uid).get();
    return doc.exists ? mapContact(doc as QueryDocumentSnapshot) : null;
  });
}

export async function getMemberAdminRecord(uid: string): Promise<MemberAdminRecord | null> {
  return withDb<MemberAdminRecord | null>(null, async (database) => {
    const doc = await database.collection(MEMBER_ADMIN).doc(uid).get();
    if (!doc.exists) return null;
    const d = doc.data() ?? {};
    const history = Array.isArray(d.statusHistory) ? d.statusHistory : [];
    return {
      uid: doc.id,
      notes: nullableStr(d.notes),
      statusHistory: history.map((entry: Record<string, unknown>) => ({
        status: oneOf<MembershipStatus>(entry?.status, MEMBERSHIP_STATUSES, "pending"),
        at: requireMillis(entry?.at),
        by: str(entry?.by),
        note: nullableStr(entry?.note) ?? undefined,
      })),
      updatedAt: requireMillis(d.updatedAt),
    };
  });
}

/**
 * Public leadership grid.
 *
 * Only officers an admin has explicitly marked `publicOfficer` are returned,
 * and only the fields that belong on a public page — never contact details.
 */
export async function listPublicOfficers(): Promise<
  Array<Pick<MemberProfile, "uid" | "displayName" | "nickname" | "photoUrl" | "position" | "bio" | "motorcycle">>
> {
  return withDb<
    Array<Pick<MemberProfile, "uid" | "displayName" | "nickname" | "photoUrl" | "position" | "bio" | "motorcycle">>
  >([], async (database) => {
    const snap = await database
      .collection(MEMBERS)
      .where("publicOfficer", "==", true)
      .where("membershipStatus", "==", "active")
      .orderBy("officerOrder", "asc")
      .limit(12)
      .get();
    return snap.docs
      .map(mapMember)
      .filter((m) => m.position !== null)
      .map((m) => ({
        uid: m.uid,
        displayName: m.displayName,
        nickname: m.nickname,
        photoUrl: m.photoUrl,
        position: m.position,
        bio: m.bio,
        motorcycle: m.motorcycle,
      }));
  });
}

/**
 * Member-only directory.
 *
 * Built from a projection rather than the raw documents: email and phone are
 * included only where the member has opted in, and administrative fields never
 * leave the server.
 */
export async function listDirectory(limit = 48): Promise<DirectoryEntry[]> {
  return withDb<DirectoryEntry[]>([], async (database) => {
    const snap = await database
      .collection(MEMBERS)
      .where("membershipStatus", "==", "active")
      .where("privacy.showInDirectory", "==", true)
      .orderBy("displayName", "asc")
      .limit(clampLimit(limit, 48))
      .get();

    const profiles = snap.docs.map(mapMember);
    const needContact = profiles.filter((p) => p.privacy.showEmail || p.privacy.showPhone);

    const contacts = new Map<string, MemberContact>();
    // Batched lookups, 10 at a time — Firestore's documented `in` limit is 30,
    // but small batches keep the read count predictable.
    for (let i = 0; i < needContact.length; i += 10) {
      const batch = needContact.slice(i, i + 10);
      const docs = await database.getAll(
        ...batch.map((p) => database.collection(MEMBER_CONTACT).doc(p.uid)),
      );
      for (const doc of docs) {
        if (doc.exists) contacts.set(doc.id, mapContact(doc as QueryDocumentSnapshot));
      }
    }

    return profiles.map((p) => {
      const contact = contacts.get(p.uid);
      return {
        uid: p.uid,
        displayName: p.displayName,
        nickname: p.nickname,
        photoUrl: p.photoUrl,
        motorcycle: p.motorcycle,
        bio: p.bio,
        chapter: p.chapter,
        ridingSince: p.ridingSince,
        position: p.position,
        email: p.privacy.showEmail ? (contact?.email ?? null) : null,
        phone: p.privacy.showPhone ? (contact?.phone ?? null) : null,
      };
    });
  });
}

export interface MemberAdminRow {
  user: UserRecord;
  profile: MemberProfile | null;
}

/** Admin member list with optional status/role filters and a name prefix search. */
export async function listMembersForAdmin(options?: {
  status?: MembershipStatus;
  role?: Role;
  limit?: number;
}): Promise<MemberAdminRow[]> {
  const take = clampLimit(options?.limit, 40);
  return withDb<MemberAdminRow[]>([], async (database) => {
    let q = database.collection(USERS) as FirebaseFirestore.Query;
    if (options?.status) q = q.where("membershipStatus", "==", options.status);
    if (options?.role) q = q.where("role", "==", options.role);
    q = q.orderBy("createdAt", "desc").limit(take);

    const snap = await q.get();
    const users = snap.docs.map((d) => mapUser(d as QueryDocumentSnapshot));
    if (users.length === 0) return [];

    const profileDocs = await database.getAll(
      ...users.map((u) => database.collection(MEMBERS).doc(u.uid)),
    );
    const profiles = new Map<string, MemberProfile>();
    for (const doc of profileDocs) {
      if (doc.exists) profiles.set(doc.id, mapMember(doc as QueryDocumentSnapshot));
    }
    return users.map((user) => ({ user, profile: profiles.get(user.uid) ?? null }));
  });
}

export async function countMembersByStatus(status: MembershipStatus): Promise<number> {
  return withDb<number>(0, async (database) => {
    const snap = await database
      .collection(USERS)
      .where("membershipStatus", "==", status)
      .count()
      .get();
    return snap.data().count;
  });
}

export async function findUserByEmail(email: string): Promise<UserRecord | null> {
  return withDb<UserRecord | null>(null, async (database) => {
    const snap = await database
      .collection(USERS)
      .where("email", "==", email.toLowerCase())
      .limit(1)
      .get();
    const doc = snap.docs[0];
    return doc ? mapUser(doc) : null;
  });
}
