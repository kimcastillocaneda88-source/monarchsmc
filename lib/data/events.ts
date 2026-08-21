import "server-only";

import type { QueryDocumentSnapshot } from "firebase-admin/firestore";
import { clampLimit, withDb } from "./client";
import { nullableStr, oneOf, requireMillis, str, toMillis } from "./serialize";
import { EVENT_STATUSES, VISIBILITIES, type ClubEvent, type EventStatus, type Page } from "@/types";

export const EVENTS = "events";

export function mapEvent(doc: QueryDocumentSnapshot): ClubEvent {
  const d = doc.data();
  return {
    id: doc.id,
    title: str(d.title, "Untitled event"),
    slug: str(d.slug, doc.id),
    description: str(d.description),
    coverImagePath: nullableStr(d.coverImagePath),
    coverImageUrl: nullableStr(d.coverImageUrl),
    coverImageAlt: nullableStr(d.coverImageAlt),
    date: str(d.date),
    startTime: str(d.startTime),
    endTime: nullableStr(d.endTime),
    location: str(d.location),
    organizer: nullableStr(d.organizer),
    status: oneOf<EventStatus>(d.status, EVENT_STATUSES, "draft"),
    visibility: oneOf(d.visibility, VISIBILITIES, "members"),
    publishedAt: toMillis(d.publishedAt),
    createdAt: requireMillis(d.createdAt),
    updatedAt: requireMillis(d.updatedAt),
  };
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function listPublicEvents(options?: {
  limit?: number;
  cursor?: string | null;
  upcomingOnly?: boolean;
}): Promise<Page<ClubEvent>> {
  const take = clampLimit(options?.limit, 12);
  return withDb<Page<ClubEvent>>({ items: [], nextCursor: null }, async (database) => {
    let q = database
      .collection(EVENTS)
      .where("status", "==", "published")
      .where("visibility", "==", "public");

    if (options?.upcomingOnly) {
      q = q.where("date", ">=", todayIso()).orderBy("date", "asc");
    } else {
      q = q.orderBy("date", "desc");
    }
    if (options?.cursor) q = q.startAfter(options.cursor);

    const snap = await q.limit(take + 1).get();
    const docs = snap.docs.slice(0, take);
    const lastDoc = docs[docs.length - 1];
    return {
      items: docs.map(mapEvent),
      nextCursor: snap.docs.length > take && lastDoc ? str(lastDoc.data().date) : null,
    };
  });
}

export async function getPublicEventBySlug(slug: string): Promise<ClubEvent | null> {
  return withDb<ClubEvent | null>(null, async (database) => {
    const snap = await database
      .collection(EVENTS)
      .where("slug", "==", slug)
      .where("status", "==", "published")
      .where("visibility", "==", "public")
      .limit(1)
      .get();
    const doc = snap.docs[0];
    return doc ? mapEvent(doc) : null;
  });
}

export async function listPublicEventSlugs(max = 200): Promise<Array<{ slug: string; updatedAt: number }>> {
  return withDb<Array<{ slug: string; updatedAt: number }>>([], async (database) => {
    const snap = await database
      .collection(EVENTS)
      .where("status", "==", "published")
      .where("visibility", "==", "public")
      .orderBy("date", "desc")
      .limit(max)
      .get();
    return snap.docs.map((doc) => ({
      slug: str(doc.data().slug, doc.id),
      updatedAt: requireMillis(doc.data().updatedAt, Date.now()),
    }));
  });
}

export async function listMemberEvents(options?: { limit?: number; upcomingOnly?: boolean }): Promise<ClubEvent[]> {
  const take = clampLimit(options?.limit, 20);
  return withDb<ClubEvent[]>([], async (database) => {
    let q = database.collection(EVENTS).where("status", "==", "published");
    if (options?.upcomingOnly) {
      q = q.where("date", ">=", todayIso()).orderBy("date", "asc");
    } else {
      q = q.orderBy("date", "desc");
    }
    const snap = await q.limit(take).get();
    return snap.docs.map(mapEvent);
  });
}

export async function getEventById(id: string): Promise<ClubEvent | null> {
  return withDb<ClubEvent | null>(null, async (database) => {
    const doc = await database.collection(EVENTS).doc(id).get();
    return doc.exists ? mapEvent(doc as QueryDocumentSnapshot) : null;
  });
}

export async function listAllEvents(limit = 40): Promise<ClubEvent[]> {
  return withDb<ClubEvent[]>([], async (database) => {
    const snap = await database
      .collection(EVENTS)
      .orderBy("date", "desc")
      .limit(clampLimit(limit, 40))
      .get();
    return snap.docs.map(mapEvent);
  });
}

export async function countUpcomingEvents(): Promise<number> {
  return withDb<number>(0, async (database) => {
    const snap = await database
      .collection(EVENTS)
      .where("status", "==", "published")
      .where("date", ">=", todayIso())
      .count()
      .get();
    return snap.data().count;
  });
}
