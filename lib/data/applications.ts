import "server-only";

import type { QueryDocumentSnapshot } from "firebase-admin/firestore";
import { clampLimit, withDb } from "./client";
import { nullableStr, num, oneOf, requireMillis, str, toMillis } from "./serialize";
import {
  APPLICATION_STATUSES,
  RIDING_EXPERIENCE,
  type ApplicationStatus,
  type MembershipApplication,
  type RidingExperience,
} from "@/types";

export const APPLICATIONS = "applications";

export function mapApplication(doc: QueryDocumentSnapshot): MembershipApplication {
  const d = doc.data();
  return {
    id: doc.id,
    fullName: str(d.fullName),
    preferredName: nullableStr(d.preferredName),
    email: str(d.email),
    phone: str(d.phone),
    location: str(d.location),
    motorcycle: str(d.motorcycle),
    ridingExperience: oneOf<RidingExperience>(d.ridingExperience, RIDING_EXPERIENCE, "new"),
    yearsRiding: num(d.yearsRiding) ?? 0,
    whyJoin: str(d.whyJoin),
    howHeard: nullableStr(d.howHeard),
    status: oneOf<ApplicationStatus>(d.status, APPLICATION_STATUSES, "new"),
    submittedAt: requireMillis(d.submittedAt),
    updatedAt: requireMillis(d.updatedAt),
    reviewedBy: nullableStr(d.reviewedBy),
    reviewedAt: toMillis(d.reviewedAt),
    internalNotes: nullableStr(d.internalNotes),
    linkedUid: nullableStr(d.linkedUid),
  };
}

/** Admin-only. There is no code path that lists applications for anyone else. */
export async function listApplications(options?: {
  status?: ApplicationStatus;
  limit?: number;
}): Promise<MembershipApplication[]> {
  const take = clampLimit(options?.limit, 40);
  return withDb<MembershipApplication[]>([], async (database) => {
    let q = database.collection(APPLICATIONS) as FirebaseFirestore.Query;
    if (options?.status) q = q.where("status", "==", options.status);
    q = q.orderBy("submittedAt", "desc").limit(take);
    const snap = await q.get();
    return snap.docs.map((d) => mapApplication(d as QueryDocumentSnapshot));
  });
}

export async function getApplication(id: string): Promise<MembershipApplication | null> {
  return withDb<MembershipApplication | null>(null, async (database) => {
    const doc = await database.collection(APPLICATIONS).doc(id).get();
    return doc.exists ? mapApplication(doc as QueryDocumentSnapshot) : null;
  });
}

export async function countApplicationsByStatus(status: ApplicationStatus): Promise<number> {
  return withDb<number>(0, async (database) => {
    const snap = await database.collection(APPLICATIONS).where("status", "==", status).count().get();
    return snap.data().count;
  });
}
