import "server-only";

import type { QueryDocumentSnapshot } from "firebase-admin/firestore";
import { clampLimit, withDb } from "./client";
import { bool, nullableStr, num, oneOf, requireMillis, str } from "./serialize";
import { GALLERY_CATEGORIES, type GalleryCategory, type GalleryItem, type Page } from "@/types";

export const GALLERY = "gallery";

export function mapGalleryItem(doc: QueryDocumentSnapshot): GalleryItem {
  const d = doc.data();
  return {
    id: doc.id,
    title: str(d.title, "Untitled"),
    caption: nullableStr(d.caption),
    altText: str(d.altText, str(d.title, "MONARCHS MC photograph")),
    storagePath: str(d.storagePath),
    imageUrl: str(d.imageUrl),
    width: num(d.width),
    height: num(d.height),
    category: oneOf<GalleryCategory>(d.category, GALLERY_CATEGORIES, "brotherhood"),
    rideId: nullableStr(d.rideId),
    eventId: nullableStr(d.eventId),
    uploadedBy: str(d.uploadedBy),
    approved: bool(d.approved),
    featured: bool(d.featured),
    createdAt: requireMillis(d.createdAt),
    updatedAt: requireMillis(d.updatedAt),
  };
}

/**
 * Approved images only, paginated. The gallery never loads the whole
 * collection — the grid requests one page at a time.
 */
export async function listApprovedGallery(options?: {
  limit?: number;
  cursor?: number | null;
  category?: GalleryCategory;
}): Promise<Page<GalleryItem>> {
  const take = clampLimit(options?.limit, 24);
  return withDb<Page<GalleryItem>>({ items: [], nextCursor: null }, async (database) => {
    let q = database.collection(GALLERY).where("approved", "==", true);
    if (options?.category) q = q.where("category", "==", options.category);
    q = q.orderBy("createdAt", "desc");
    if (options?.cursor) q = q.startAfter(new Date(options.cursor));

    const snap = await q.limit(take + 1).get();
    const docs = snap.docs.slice(0, take);
    const items = docs.map(mapGalleryItem);
    const last = items[items.length - 1];
    return {
      items,
      nextCursor: snap.docs.length > take && last ? String(last.createdAt) : null,
    };
  });
}

export async function listFeaturedGallery(limit = 6): Promise<GalleryItem[]> {
  return withDb<GalleryItem[]>([], async (database) => {
    const snap = await database
      .collection(GALLERY)
      .where("approved", "==", true)
      .where("featured", "==", true)
      .orderBy("createdAt", "desc")
      .limit(clampLimit(limit, 6))
      .get();
    return snap.docs.map(mapGalleryItem);
  });
}

export async function listAllGallery(options?: {
  limit?: number;
  approved?: boolean;
}): Promise<GalleryItem[]> {
  const take = clampLimit(options?.limit, 36);
  return withDb<GalleryItem[]>([], async (database) => {
    let q = database.collection(GALLERY).orderBy("createdAt", "desc");
    if (typeof options?.approved === "boolean") {
      q = database
        .collection(GALLERY)
        .where("approved", "==", options.approved)
        .orderBy("createdAt", "desc");
    }
    const snap = await q.limit(take).get();
    return snap.docs.map(mapGalleryItem);
  });
}

export async function getGalleryItem(id: string): Promise<GalleryItem | null> {
  return withDb<GalleryItem | null>(null, async (database) => {
    const doc = await database.collection(GALLERY).doc(id).get();
    return doc.exists ? mapGalleryItem(doc as QueryDocumentSnapshot) : null;
  });
}

export async function countPendingGallery(): Promise<number> {
  return withDb<number>(0, async (database) => {
    const snap = await database.collection(GALLERY).where("approved", "==", false).count().get();
    return snap.data().count;
  });
}
