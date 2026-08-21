import "server-only";

import type { QueryDocumentSnapshot } from "firebase-admin/firestore";
import { clampLimit, withDb } from "./client";
import { bool, oneOf, requireMillis, str } from "./serialize";
import { ANNOUNCEMENT_PRIORITIES, type Announcement, type AnnouncementPriority } from "@/types";

export const ANNOUNCEMENTS = "announcements";

export function mapAnnouncement(doc: QueryDocumentSnapshot): Announcement {
  const d = doc.data();
  return {
    id: doc.id,
    title: str(d.title, "Announcement"),
    body: str(d.body),
    priority: oneOf<AnnouncementPriority>(d.priority, ANNOUNCEMENT_PRIORITIES, "normal"),
    published: bool(d.published),
    authorId: str(d.authorId),
    authorName: str(d.authorName, "MONARCHS MC"),
    createdAt: requireMillis(d.createdAt),
    updatedAt: requireMillis(d.updatedAt),
  };
}

/** Member-only. Callers must have already established an active membership. */
export async function listPublishedAnnouncements(limit = 20): Promise<Announcement[]> {
  return withDb<Announcement[]>([], async (database) => {
    const snap = await database
      .collection(ANNOUNCEMENTS)
      .where("published", "==", true)
      .orderBy("createdAt", "desc")
      .limit(clampLimit(limit, 20))
      .get();
    return snap.docs.map(mapAnnouncement);
  });
}

export async function listAllAnnouncements(limit = 40): Promise<Announcement[]> {
  return withDb<Announcement[]>([], async (database) => {
    const snap = await database
      .collection(ANNOUNCEMENTS)
      .orderBy("createdAt", "desc")
      .limit(clampLimit(limit, 40))
      .get();
    return snap.docs.map(mapAnnouncement);
  });
}

export async function getAnnouncement(id: string): Promise<Announcement | null> {
  return withDb<Announcement | null>(null, async (database) => {
    const doc = await database.collection(ANNOUNCEMENTS).doc(id).get();
    return doc.exists ? mapAnnouncement(doc as QueryDocumentSnapshot) : null;
  });
}
