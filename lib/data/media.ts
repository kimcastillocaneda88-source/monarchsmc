import "server-only";

import type { QueryDocumentSnapshot } from "firebase-admin/firestore";
import { clampLimit, withDb } from "./client";
import { bool, nullableStr, num, oneOf, requireMillis, str } from "./serialize";
import {
  FACE_BLUR_STATUSES,
  MEDIA_KINDS,
  type FaceBlurStatus,
  type MediaItem,
  type MediaKind,
} from "@/types";

/** Finished items in the media library. */
export const MEDIA = "media";

/**
 * Reservations for uploads that are in flight.
 *
 * The bytes go straight from the browser to Cloud Storage with a signed URL, so
 * the server never sees them in transit. This collection is what lets it still
 * be in charge: a ticket records what was authorised — which account, which
 * path, which type, what size ceiling — and the completion step refuses
 * anything that does not match the ticket it claims.
 */
export const MEDIA_UPLOADS = "mediaUploads";

export function mapMediaItem(doc: QueryDocumentSnapshot): MediaItem {
  const d = doc.data();
  return {
    id: doc.id,
    title: str(d.title, "Untitled"),
    caption: nullableStr(d.caption),
    kind: oneOf<MediaKind>(d.kind, MEDIA_KINDS, "file"),
    storagePath: str(d.storagePath),
    contentType: str(d.contentType, "application/octet-stream"),
    sizeBytes: num(d.sizeBytes) ?? 0,
    fileName: str(d.fileName, "file"),
    faceBlur: oneOf<FaceBlurStatus>(d.faceBlur, FACE_BLUR_STATUSES, "unavailable"),
    facesBlurred: num(d.facesBlurred),
    uploadedBy: str(d.uploadedBy),
    uploaderName: str(d.uploaderName, "Member"),
    approved: bool(d.approved),
    createdAt: requireMillis(d.createdAt),
    updatedAt: requireMillis(d.updatedAt),
  };
}

export async function getMediaItem(id: string): Promise<MediaItem | null> {
  return withDb<MediaItem | null>(null, async (database) => {
    const doc = await database.collection(MEDIA).doc(id).get();
    return doc.exists ? mapMediaItem(doc as QueryDocumentSnapshot) : null;
  });
}

/** Everything an administrator needs to moderate, newest first. */
export async function listMediaForAdmin(options?: {
  approved?: boolean;
  kind?: MediaKind;
  limit?: number;
}): Promise<MediaItem[]> {
  const take = clampLimit(options?.limit, 40);
  return withDb<MediaItem[]>([], async (database) => {
    let q = database.collection(MEDIA) as FirebaseFirestore.Query;
    if (options?.approved !== undefined) q = q.where("approved", "==", options.approved);
    if (options?.kind) q = q.where("kind", "==", options.kind);
    const snap = await q.orderBy("createdAt", "desc").limit(take).get();
    return snap.docs.map((d) => mapMediaItem(d as QueryDocumentSnapshot));
  });
}

/** The library as an active member sees it: approved items only. */
export async function listApprovedMedia(limit = 40): Promise<MediaItem[]> {
  const take = clampLimit(limit, 40);
  return withDb<MediaItem[]>([], async (database) => {
    const snap = await database
      .collection(MEDIA)
      .where("approved", "==", true)
      .orderBy("createdAt", "desc")
      .limit(take)
      .get();
    return snap.docs.map((d) => mapMediaItem(d as QueryDocumentSnapshot));
  });
}

/** One member's own contributions, approved or not. */
export async function listMediaByUploader(uid: string, limit = 40): Promise<MediaItem[]> {
  const take = clampLimit(limit, 40);
  return withDb<MediaItem[]>([], async (database) => {
    const snap = await database
      .collection(MEDIA)
      .where("uploadedBy", "==", uid)
      .orderBy("createdAt", "desc")
      .limit(take)
      .get();
    return snap.docs.map((d) => mapMediaItem(d as QueryDocumentSnapshot));
  });
}

export async function countMediaAwaitingReview(): Promise<number> {
  return withDb<number>(0, async (database) => {
    const snap = await database.collection(MEDIA).where("approved", "==", false).count().get();
    return snap.data().count;
  });
}
