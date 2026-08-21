import "server-only";

import type { QueryDocumentSnapshot } from "firebase-admin/firestore";
import { clampLimit, withDb } from "./client";
import { bool, num, nullableStr, oneOf, requireMillis, str } from "./serialize";
import { RIDE_STATUSES, VISIBILITIES, type Page, type Ride, type RideStatus } from "@/types";

export const RIDES = "rides";

export function mapRide(doc: QueryDocumentSnapshot): Ride {
  const d = doc.data();
  return {
    id: doc.id,
    title: str(d.title, "Untitled ride"),
    slug: str(d.slug, doc.id),
    description: str(d.description),
    requirements: nullableStr(d.requirements),
    routeInfo: nullableStr(d.routeInfo),
    coverImagePath: nullableStr(d.coverImagePath),
    coverImageUrl: nullableStr(d.coverImageUrl),
    coverImageAlt: nullableStr(d.coverImageAlt),
    date: str(d.date),
    startTime: str(d.startTime),
    meetingPoint: str(d.meetingPoint),
    destination: str(d.destination),
    distanceKm: num(d.distanceKm),
    roadCaptainId: nullableStr(d.roadCaptainId),
    roadCaptainName: nullableStr(d.roadCaptainName),
    status: oneOf<RideStatus>(d.status, RIDE_STATUSES, "draft"),
    visibility: oneOf(d.visibility, VISIBILITIES, "members"),
    published: bool(d.published),
    createdAt: requireMillis(d.createdAt),
    updatedAt: requireMillis(d.updatedAt),
  };
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Public rides listing.
 *
 * The query itself constrains published + public visibility, so the result set
 * is one that the Security Rules permit — rules are not filters, and a broad
 * query would simply be denied for an unauthenticated client.
 */
export async function listPublicRides(options?: {
  limit?: number;
  cursor?: string | null;
  upcomingOnly?: boolean;
}): Promise<Page<Ride>> {
  const take = clampLimit(options?.limit, 12);
  return withDb<Page<Ride>>({ items: [], nextCursor: null }, async (database) => {
    let q = database
      .collection(RIDES)
      .where("published", "==", true)
      .where("visibility", "==", "public");

    if (options?.upcomingOnly) {
      q = q.where("date", ">=", todayIso()).orderBy("date", "asc");
    } else {
      q = q.orderBy("date", "desc");
    }

    if (options?.cursor) q = q.startAfter(options.cursor);

    const snap = await q.limit(take + 1).get();
    const docs = snap.docs.slice(0, take);
    const hasMore = snap.docs.length > take;
    const lastDoc = docs[docs.length - 1];
    return {
      items: docs.map(mapRide),
      nextCursor: hasMore && lastDoc ? str(lastDoc.data().date) : null,
    };
  });
}

/** The next public ride, used by the homepage featured slot. */
export async function getFeaturedRide(): Promise<Ride | null> {
  return withDb<Ride | null>(null, async (database) => {
    const snap = await database
      .collection(RIDES)
      .where("published", "==", true)
      .where("visibility", "==", "public")
      .where("date", ">=", todayIso())
      .orderBy("date", "asc")
      .limit(1)
      .get();
    const doc = snap.docs[0];
    return doc ? mapRide(doc) : null;
  });
}

export async function getPublicRideBySlug(slug: string): Promise<Ride | null> {
  return withDb<Ride | null>(null, async (database) => {
    const snap = await database
      .collection(RIDES)
      .where("slug", "==", slug)
      .where("published", "==", true)
      .where("visibility", "==", "public")
      .limit(1)
      .get();
    const doc = snap.docs[0];
    return doc ? mapRide(doc) : null;
  });
}

/** Slugs for static generation and the sitemap. Bounded deliberately. */
export async function listPublicRideSlugs(max = 200): Promise<Array<{ slug: string; updatedAt: number }>> {
  return withDb<Array<{ slug: string; updatedAt: number }>>([], async (database) => {
    const snap = await database
      .collection(RIDES)
      .where("published", "==", true)
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

/* ------------------------------------------------- member + admin reads */

/** Rides an active member may see: everything published, both visibilities. */
export async function listMemberRides(options?: {
  limit?: number;
  upcomingOnly?: boolean;
}): Promise<Ride[]> {
  const take = clampLimit(options?.limit, 20);
  return withDb<Ride[]>([], async (database) => {
    let q = database.collection(RIDES).where("published", "==", true);
    if (options?.upcomingOnly) {
      q = q.where("date", ">=", todayIso()).orderBy("date", "asc");
    } else {
      q = q.orderBy("date", "desc");
    }
    const snap = await q.limit(take).get();
    return snap.docs.map(mapRide);
  });
}

export async function getRideById(id: string): Promise<Ride | null> {
  return withDb<Ride | null>(null, async (database) => {
    const doc = await database.collection(RIDES).doc(id).get();
    return doc.exists ? mapRide(doc as QueryDocumentSnapshot) : null;
  });
}

export async function getRideBySlugAnyState(slug: string): Promise<Ride | null> {
  return withDb<Ride | null>(null, async (database) => {
    const snap = await database.collection(RIDES).where("slug", "==", slug).limit(1).get();
    const doc = snap.docs[0];
    return doc ? mapRide(doc) : null;
  });
}

/** Admin listing — includes drafts. */
export async function listAllRides(limit = 40): Promise<Ride[]> {
  return withDb<Ride[]>([], async (database) => {
    const snap = await database
      .collection(RIDES)
      .orderBy("date", "desc")
      .limit(clampLimit(limit, 40))
      .get();
    return snap.docs.map(mapRide);
  });
}

export async function countUpcomingRides(): Promise<number> {
  return withDb<number>(0, async (database) => {
    const snap = await database
      .collection(RIDES)
      .where("published", "==", true)
      .where("date", ">=", todayIso())
      .count()
      .get();
    return snap.data().count;
  });
}
