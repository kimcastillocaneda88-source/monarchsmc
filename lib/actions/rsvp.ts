"use server";

import { revalidatePath } from "next/cache";
import { FieldValue } from "firebase-admin/firestore";
import { db } from "@/lib/data/client";
import { requireActiveMember } from "@/lib/auth/guards";
import { toUserMessage } from "@/lib/auth/errors";
import { rsvpSchema } from "@/lib/validation/schemas";
import { getMemberProfile } from "@/lib/data/members";
import { getRideById } from "@/lib/data/rides";
import { RIDES } from "@/lib/data/rides";
import type { RsvpResponse } from "@/types";
import type { ActionResult } from "./form-state";

/**
 * Records a member's RSVP for a ride.
 *
 * Idempotent: the document id is the member's uid, so repeated submissions
 * update the same record instead of creating duplicates. Authorization is
 * checked here because the Admin SDK bypasses Security Rules.
 */
export async function submitRsvp(
  rideId: string,
  response: RsvpResponse,
  note?: string,
): Promise<ActionResult> {
  try {
    const user = await requireActiveMember();

    const parsed = rsvpSchema.safeParse({ rideId, response, note: note ?? "" });
    if (!parsed.success) {
      return { ok: false, message: "That response was not recognised." };
    }

    const ride = await getRideById(parsed.data.rideId);
    if (!ride || !ride.published) {
      return { ok: false, message: "That ride is no longer available." };
    }
    if (ride.status === "cancelled") {
      return { ok: false, message: "This ride has been cancelled." };
    }
    if (ride.status === "completed") {
      return { ok: false, message: "This ride has already taken place." };
    }

    const profile = await getMemberProfile(user.uid);

    await db()
      .collection(RIDES)
      .doc(parsed.data.rideId)
      .collection("rsvps")
      .doc(user.uid)
      .set(
        {
          response: parsed.data.response,
          displayName: profile?.displayName ?? user.displayName ?? "Member",
          note: parsed.data.note,
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );

    revalidatePath(`/rides/${ride.slug}`);
    revalidatePath("/member/rides");
    revalidatePath("/member/dashboard");

    return { ok: true, message: "Your response has been recorded." };
  } catch (error) {
    return { ok: false, message: toUserMessage(error, "We could not record your response.") };
  }
}
