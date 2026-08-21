import "server-only";

import { withDb } from "./client";
import { nullableStr, oneOf, requireMillis, str } from "./serialize";
import { RSVP_RESPONSES, type Rsvp, type RsvpResponse, type RsvpTally } from "@/types";
import { RIDES } from "./rides";

/**
 * RSVPs live at rides/{rideId}/rsvps/{uid}.
 *
 * Keying the document by uid makes the operation idempotent by construction:
 * a member changing their mind overwrites one document, and there is no way to
 * accumulate duplicate responses for the same person.
 */
export function rsvpPath(rideId: string, uid: string): string {
  return `${RIDES}/${rideId}/rsvps/${uid}`;
}

export async function getRsvp(rideId: string, uid: string): Promise<Rsvp | null> {
  return withDb<Rsvp | null>(null, async (database) => {
    const doc = await database.collection(RIDES).doc(rideId).collection("rsvps").doc(uid).get();
    if (!doc.exists) return null;
    const d = doc.data() ?? {};
    return {
      uid: doc.id,
      rideId,
      response: oneOf<RsvpResponse>(d.response, RSVP_RESPONSES, "maybe"),
      displayName: str(d.displayName, "Member"),
      note: nullableStr(d.note),
      createdAt: requireMillis(d.createdAt),
      updatedAt: requireMillis(d.updatedAt),
    };
  });
}

export async function listRsvps(rideId: string, limit = 100): Promise<Rsvp[]> {
  return withDb<Rsvp[]>([], async (database) => {
    const snap = await database
      .collection(RIDES)
      .doc(rideId)
      .collection("rsvps")
      .orderBy("updatedAt", "desc")
      .limit(Math.min(limit, 200))
      .get();
    return snap.docs.map((doc) => {
      const d = doc.data();
      return {
        uid: doc.id,
        rideId,
        response: oneOf<RsvpResponse>(d.response, RSVP_RESPONSES, "maybe"),
        displayName: str(d.displayName, "Member"),
        note: nullableStr(d.note),
        createdAt: requireMillis(d.createdAt),
        updatedAt: requireMillis(d.updatedAt),
      };
    });
  });
}

export async function getRsvpTally(rideId: string): Promise<RsvpTally> {
  const empty: RsvpTally = { going: 0, maybe: 0, not_going: 0 };
  return withDb<RsvpTally>(empty, async (database) => {
    const base = database.collection(RIDES).doc(rideId).collection("rsvps");
    const [going, maybe, notGoing] = await Promise.all([
      base.where("response", "==", "going").count().get(),
      base.where("response", "==", "maybe").count().get(),
      base.where("response", "==", "not_going").count().get(),
    ]);
    return {
      going: going.data().count,
      maybe: maybe.data().count,
      not_going: notGoing.data().count,
    };
  });
}
