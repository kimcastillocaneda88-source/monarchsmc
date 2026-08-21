"use server";

import { revalidatePath } from "next/cache";
import { FieldValue } from "firebase-admin/firestore";
import { db } from "@/lib/data/client";
import { requireActiveMember } from "@/lib/auth/guards";
import { toUserMessage } from "@/lib/auth/errors";
import { memberProfileSchema, fieldErrorsOf } from "@/lib/validation/schemas";
import { MEMBERS, MEMBER_CONTACT } from "@/lib/data/members";
import type { FormState } from "./form-state";

/**
 * Updates the signed-in member's own profile.
 *
 * Two protections work together:
 *  1. `memberProfileSchema` is `.strict()`, so a request carrying extra keys —
 *     role, membershipStatus, publicOfficer, createdAt — is rejected outright
 *     rather than silently ignored.
 *  2. The write below names every field explicitly. Even if validation were
 *     bypassed, nothing outside this list can reach Firestore.
 *
 * Firestore Security Rules enforce the same restriction independently for any
 * client that writes directly rather than through this action.
 */
export async function updateMemberProfile(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  try {
    const user = await requireActiveMember();

    const parsed = memberProfileSchema.safeParse({
      displayName: formData.get("displayName"),
      nickname: formData.get("nickname"),
      motorcycle: formData.get("motorcycle"),
      bio: formData.get("bio"),
      chapter: formData.get("chapter"),
      ridingSince: formData.get("ridingSince"),
      showInDirectory: formData.get("showInDirectory") === "on",
      showEmail: formData.get("showEmail") === "on",
      showPhone: formData.get("showPhone") === "on",
      phone: formData.get("phone"),
      location: formData.get("location"),
    });

    if (!parsed.success) {
      return {
        status: "error",
        message: "Please correct the highlighted fields.",
        fieldErrors: fieldErrorsOf(parsed.error),
      };
    }

    const input = parsed.data;
    const database = db();
    const batch = database.batch();

    batch.set(
      database.collection(MEMBERS).doc(user.uid),
      {
        displayName: input.displayName,
        nickname: input.nickname,
        motorcycle: input.motorcycle,
        bio: input.bio,
        chapter: input.chapter,
        ridingSince: input.ridingSince,
        privacy: {
          showInDirectory: input.showInDirectory,
          showEmail: input.showEmail,
          showPhone: input.showPhone,
        },
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

    // Contact details live in a separate, more tightly restricted collection.
    batch.set(
      database.collection(MEMBER_CONTACT).doc(user.uid),
      {
        email: user.email,
        phone: input.phone,
        location: input.location,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

    await batch.commit();

    revalidatePath("/member/profile");
    revalidatePath("/member/dashboard");
    revalidatePath("/member/directory");

    return { status: "success", message: "Your profile has been saved.", fieldErrors: {} };
  } catch (error) {
    return {
      status: "error",
      message: toUserMessage(error, "We could not save your profile."),
      fieldErrors: {},
    };
  }
}
