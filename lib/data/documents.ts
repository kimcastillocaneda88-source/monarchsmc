import "server-only";

import type { QueryDocumentSnapshot } from "firebase-admin/firestore";
import { clampLimit, withDb } from "./client";
import { nullableStr, num, oneOf, requireMillis, str } from "./serialize";
import { DOCUMENT_CATEGORIES, ROLES, type ClubDocument, type DocumentCategory, type Role } from "@/types";

export const DOCUMENTS = "documents";

export function mapDocument(doc: QueryDocumentSnapshot): ClubDocument {
  const d = doc.data();
  return {
    id: doc.id,
    title: str(d.title, "Document"),
    description: nullableStr(d.description),
    storagePath: str(d.storagePath),
    fileName: str(d.fileName, "document"),
    contentType: str(d.contentType, "application/octet-stream"),
    sizeBytes: num(d.sizeBytes) ?? 0,
    category: oneOf<DocumentCategory>(d.category, DOCUMENT_CATEGORIES, "Member Resources"),
    requiredRole: oneOf<Role>(d.requiredRole, ROLES, "member"),
    uploadedBy: str(d.uploadedBy),
    createdAt: requireMillis(d.createdAt),
    updatedAt: requireMillis(d.updatedAt),
  };
}

export async function listDocuments(limit = 40): Promise<ClubDocument[]> {
  return withDb<ClubDocument[]>([], async (database) => {
    const snap = await database
      .collection(DOCUMENTS)
      .orderBy("createdAt", "desc")
      .limit(clampLimit(limit, 40))
      .get();
    return snap.docs.map(mapDocument);
  });
}

export async function getDocument(id: string): Promise<ClubDocument | null> {
  return withDb<ClubDocument | null>(null, async (database) => {
    const doc = await database.collection(DOCUMENTS).doc(id).get();
    return doc.exists ? mapDocument(doc as QueryDocumentSnapshot) : null;
  });
}
