import "server-only";

import type { QueryDocumentSnapshot } from "firebase-admin/firestore";
import { clampLimit, withDb } from "./client";
import { nullableStr, oneOf, requireMillis, str } from "./serialize";
import {
  CONTACT_CATEGORIES,
  MESSAGE_STATUSES,
  type ContactCategory,
  type ContactMessage,
  type MessageStatus,
} from "@/types";

export const CONTACT_MESSAGES = "contactMessages";

export function mapMessage(doc: QueryDocumentSnapshot): ContactMessage {
  const d = doc.data();
  return {
    id: doc.id,
    name: str(d.name),
    email: str(d.email),
    subject: str(d.subject),
    category: oneOf<ContactCategory>(d.category, CONTACT_CATEGORIES, "General"),
    message: str(d.message),
    status: oneOf<MessageStatus>(d.status, MESSAGE_STATUSES, "unread"),
    createdAt: requireMillis(d.createdAt),
    updatedAt: requireMillis(d.updatedAt),
    handledBy: nullableStr(d.handledBy),
  };
}

/** Admin-only: contact submissions are never publicly readable. */
export async function listMessages(options?: {
  status?: MessageStatus;
  limit?: number;
}): Promise<ContactMessage[]> {
  const take = clampLimit(options?.limit, 40);
  return withDb<ContactMessage[]>([], async (database) => {
    let q = database.collection(CONTACT_MESSAGES) as FirebaseFirestore.Query;
    if (options?.status) q = q.where("status", "==", options.status);
    q = q.orderBy("createdAt", "desc").limit(take);
    const snap = await q.get();
    return snap.docs.map((d) => mapMessage(d as QueryDocumentSnapshot));
  });
}

export async function countUnreadMessages(): Promise<number> {
  return withDb<number>(0, async (database) => {
    const snap = await database
      .collection(CONTACT_MESSAGES)
      .where("status", "==", "unread")
      .count()
      .get();
    return snap.data().count;
  });
}
